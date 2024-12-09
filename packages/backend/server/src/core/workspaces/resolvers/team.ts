import { Logger } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { PrismaClient, WorkspaceMemberStatus } from '@prisma/client';
import { nanoid } from 'nanoid';

import {
  Cache,
  EventEmitter,
  MailService,
  NotInSpace,
  RequestMutex,
  TooManyRequest,
} from '../../../fundamentals';
import { CurrentUser } from '../../auth';
import { Permission, PermissionService } from '../../permission';
import { QuotaManagementService } from '../../quota';
import { UserService } from '../../user';
import {
  InviteResult,
  WorkspaceInviteLinkExpireTime,
  WorkspaceType,
} from '../types';
import { WorkspaceResolver } from './workspace';

/**
 * Workspace team resolver
 * Public apis rate limit: 10 req/m
 * Other rate limit: 120 req/m
 */
@Resolver(() => WorkspaceType)
export class TeamWorkspaceResolver {
  private readonly logger = new Logger(TeamWorkspaceResolver.name);

  constructor(
    private readonly cache: Cache,
    private readonly event: EventEmitter,
    private readonly mailer: MailService,
    private readonly prisma: PrismaClient,
    private readonly permissions: PermissionService,
    private readonly users: UserService,
    private readonly quota: QuotaManagementService,
    private readonly mutex: RequestMutex,
    private readonly workspace: WorkspaceResolver
  ) {}

  @ResolveField(() => Boolean, {
    name: 'team',
    description: 'if workspace is team workspace',
    complexity: 2,
  })
  team(@Parent() workspace: WorkspaceType) {
    return this.quota.isTeamWorkspace(workspace.id);
  }

  @Mutation(() => [InviteResult])
  async inviteBatch(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args({ name: 'emails', type: () => [String] }) emails: string[],
    @Args('sendInviteMail', { nullable: true }) sendInviteMail: boolean
  ) {
    await this.permissions.checkWorkspace(
      workspaceId,
      user.id,
      Permission.Admin
    );

    // lock to prevent concurrent invite
    const lockFlag = `invite:${workspaceId}`;
    await using lock = await this.mutex.lock(lockFlag);
    if (!lock) {
      return new TooManyRequest();
    }

    const quota = await this.quota.getWorkspaceUsage(workspaceId);

    const results = [];
    for (const [idx, email] of emails.entries()) {
      const ret: InviteResult = { email, sentSuccess: false, inviteId: null };
      try {
        let target = await this.users.findUserByEmail(email);
        if (target) {
          const originRecord =
            await this.prisma.workspaceUserPermission.findFirst({
              where: {
                workspaceId,
                userId: target.id,
              },
            });
          // only invite if the user is not already in the workspace
          if (originRecord) continue;
        } else {
          target = await this.users.createUser({
            email,
            registered: false,
          });
        }
        const needMoreSeat = quota.memberCount + idx + 1 > quota.memberLimit;

        ret.inviteId = await this.permissions.grant(
          workspaceId,
          target.id,
          Permission.Write,
          needMoreSeat
            ? WorkspaceMemberStatus.NeedMoreSeat
            : WorkspaceMemberStatus.Pending
        );
        if (!needMoreSeat && sendInviteMail) {
          const inviteInfo = await this.workspace.getInviteInfo(ret.inviteId);

          try {
            await this.mailer.sendInviteEmail(email, ret.inviteId, {
              workspace: {
                id: inviteInfo.workspace.id,
                name: inviteInfo.workspace.name,
                avatar: inviteInfo.workspace.avatar,
              },
              user: {
                avatar: inviteInfo.user?.avatarUrl || '',
                name: inviteInfo.user?.name || '',
              },
            });
            ret.sentSuccess = true;
          } catch (e) {
            this.logger.warn(
              `failed to send ${workspaceId} invite email to ${email}: ${e}`
            );
          }
        }
      } catch (e) {
        this.logger.error('failed to invite user', e);
      }
      results.push(ret);
    }

    const memberCount = quota.memberCount + results.length;
    if (memberCount > quota.memberLimit) {
      this.event.emit('workspace.members.updated', {
        workspaceId,
        count: memberCount,
      });
    }

    return results;
  }

  @Mutation(() => String)
  async inviteLink(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('expireTime', { type: () => WorkspaceInviteLinkExpireTime })
    expireTime: WorkspaceInviteLinkExpireTime
  ) {
    await this.permissions.checkWorkspace(
      workspaceId,
      user.id,
      Permission.Admin
    );
    const cacheWorkspaceId = `workspace:inviteLink:${workspaceId}`;
    const invite = await this.cache.get<{ inviteId: string }>(cacheWorkspaceId);
    if (typeof invite?.inviteId === 'string') {
      return invite.inviteId;
    }

    const inviteId = nanoid();
    const cacheInviteId = `workspace:inviteLinkId:${inviteId}`;
    await this.cache.set(cacheWorkspaceId, { inviteId }, { ttl: expireTime });
    await this.cache.set(cacheInviteId, { workspaceId }, { ttl: expireTime });
    return inviteId;
  }

  @Mutation(() => Boolean)
  async revokeInviteLink(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string
  ) {
    await this.permissions.checkWorkspace(
      workspaceId,
      user.id,
      Permission.Admin
    );
    const cacheId = `workspace:inviteLink:${workspaceId}`;
    return await this.cache.delete(cacheId);
  }

  @Mutation(() => String)
  async approveMember(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('userId') userId: string
  ) {
    await this.permissions.checkWorkspace(
      workspaceId,
      user.id,
      Permission.Admin
    );

    try {
      // lock to prevent concurrent invite and grant
      const lockFlag = `invite:${workspaceId}`;
      await using lock = await this.mutex.lock(lockFlag);
      if (!lock) {
        return new TooManyRequest();
      }

      const isUnderReview =
        (await this.permissions.getWorkspaceMemberStatus(
          workspaceId,
          userId
        )) === WorkspaceMemberStatus.UnderReview;
      if (isUnderReview) {
        const result = await this.permissions.grant(
          workspaceId,
          userId,
          Permission.Write,
          WorkspaceMemberStatus.Accepted
        );

        if (result) {
          // TODO(@darkskygit): send team approve mail
        }

        return result;
      } else {
        return new NotInSpace({ spaceId: workspaceId });
      }
    } catch (e) {
      this.logger.error('failed to invite user', e);
      return new TooManyRequest();
    }
  }

  @Mutation(() => String)
  async grantMember(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('userId') userId: string,
    @Args('permission', { type: () => Permission }) permission: Permission
  ) {
    await this.permissions.checkWorkspace(
      workspaceId,
      user.id,
      Permission.Owner
    );

    try {
      // lock to prevent concurrent invite and grant
      const lockFlag = `invite:${workspaceId}`;
      await using lock = await this.mutex.lock(lockFlag);
      if (!lock) {
        return new TooManyRequest();
      }

      const isMember = await this.permissions.isWorkspaceMember(
        workspaceId,
        userId
      );
      if (isMember) {
        const result = await this.permissions.grant(
          workspaceId,
          userId,
          permission
        );

        if (result) {
          // TODO(@darkskygit): send team role changed mail
        }

        return result;
      } else {
        return new NotInSpace({ spaceId: workspaceId });
      }
    } catch (e) {
      this.logger.error('failed to invite user', e);
      return new TooManyRequest();
    }
  }
}
