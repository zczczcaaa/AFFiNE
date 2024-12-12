/// <reference types="../src/global.d.ts" />

import { INestApplication } from '@nestjs/common';
import { WorkspaceMemberStatus } from '@prisma/client';
import type { TestFn } from 'ava';
import ava from 'ava';

import { AppModule } from '../src/app.module';
import { AuthService } from '../src/core/auth';
import { DocContentService } from '../src/core/doc-renderer';
import { Permission, PermissionService } from '../src/core/permission';
import {
  QuotaManagementService,
  QuotaService,
  QuotaType,
} from '../src/core/quota';
import { WorkspaceType } from '../src/core/workspaces';
import {
  acceptInviteById,
  createInviteLink,
  createTestingApp,
  createWorkspace,
  getInviteInfo,
  grantMember,
  inviteUser,
  inviteUsers,
  leaveWorkspace,
  PermissionEnum,
  signUp,
  sleep,
  UserAuthedType,
} from './utils';

const test = ava as TestFn<{
  app: INestApplication;
  auth: AuthService;
  quota: QuotaService;
  quotaManager: QuotaManagementService;
  permissions: PermissionService;
}>;

test.beforeEach(async t => {
  const { app } = await createTestingApp({
    imports: [AppModule],
    tapModule: module => {
      module.overrideProvider(DocContentService).useValue({
        getWorkspaceContent() {
          return {
            name: 'test',
            avatarKey: null,
          };
        },
      });
    },
  });

  const quota = app.get(QuotaService);
  const quotaManager = app.get(QuotaManagementService);
  const permissions = app.get(PermissionService);
  const auth = app.get(AuthService);

  t.context.app = app;
  t.context.quota = quota;
  t.context.quotaManager = quotaManager;
  t.context.permissions = permissions;
  t.context.auth = auth;
});

test.afterEach.always(async t => {
  await t.context.app.close();
});

const init = async (app: INestApplication, memberLimit = 10) => {
  const owner = await signUp(app, 'test', 'test@affine.pro', '123456');
  const workspace = await createWorkspace(app, owner.token.token);

  const teamWorkspace = await createWorkspace(app, owner.token.token);
  const quota = app.get(QuotaManagementService);
  await quota.addTeamWorkspace(teamWorkspace.id, 'test');
  await quota.updateWorkspaceConfig(teamWorkspace.id, QuotaType.TeamPlanV1, {
    memberLimit,
  });

  const invite = async (
    email: string,
    permission: PermissionEnum = 'Write'
  ) => {
    const member = await signUp(app, email.split('@')[0], email, '123456');
    const inviteId = await inviteUser(
      app,
      owner.token.token,
      teamWorkspace.id,
      member.email,
      permission
    );
    await acceptInviteById(app, teamWorkspace.id, inviteId);
    return member;
  };

  const inviteBatch = async (emails: string[]) => {
    const members = [];
    for (const email of emails) {
      const member = await signUp(app, email.split('@')[0], email, '123456');
      members.push(member);
    }
    const invites = await inviteUsers(
      app,
      owner.token.token,
      teamWorkspace.id,
      emails
    );
    return [members, invites] as const;
  };

  const getCreateInviteLinkFetcher = async (ws: WorkspaceType) => {
    const { link } = await createInviteLink(
      app,
      owner.token.token,
      ws.id,
      'OneDay'
    );
    const inviteId = link.split('/').pop()!;
    return [
      inviteId,
      async (email: string): Promise<UserAuthedType> => {
        const member = await signUp(app, email.split('@')[0], email, '123456');
        await acceptInviteById(app, ws.id, inviteId, false, member.token.token);
        return member;
      },
      async (token: string) => {
        await acceptInviteById(app, ws.id, inviteId, false, token);
      },
    ] as const;
  };

  const admin = await invite('admin@affine.pro', 'Admin');
  const write = await invite('member1@affine.pro');
  const read = await invite('member2@affine.pro', 'Read');

  return {
    invite,
    inviteBatch,
    createInviteLink: getCreateInviteLinkFetcher,
    owner,
    workspace,
    teamWorkspace,
    admin,
    write,
    read,
  };
};

test('should be able to check seat limit', async t => {
  const { app, permissions, quotaManager } = t.context;
  const { invite, inviteBatch, teamWorkspace: ws } = await init(app, 4);

  {
    // invite
    await t.throwsAsync(
      invite('member3@affine.pro', 'Read'),
      { message: 'You have exceeded your workspace member quota.' },
      'should throw error if exceed member limit'
    );
    await quotaManager.updateWorkspaceConfig(ws.id, QuotaType.TeamPlanV1, {
      memberLimit: 5,
    });
    await t.notThrowsAsync(
      invite('member4@affine.pro', 'Read'),
      'should not throw error if not exceed member limit'
    );
  }

  {
    const members1 = inviteBatch(['member5@affine.pro']);
    // invite batch
    await t.notThrowsAsync(
      members1,
      'should not throw error in batch invite event reach limit'
    );

    t.is(
      await permissions.getWorkspaceMemberStatus(
        ws.id,
        (await members1)[0][0].id
      ),
      WorkspaceMemberStatus.NeedMoreSeat,
      'should be able to check member status'
    );

    // refresh seat, fifo
    sleep(1000);
    const [[members2]] = await inviteBatch(['member6@affine.pro']);
    await permissions.refreshSeatStatus(ws.id, 6);

    t.is(
      await permissions.getWorkspaceMemberStatus(
        ws.id,
        (await members1)[0][0].id
      ),
      WorkspaceMemberStatus.Pending,
      'should become accepted after refresh'
    );
    t.is(
      await permissions.getWorkspaceMemberStatus(ws.id, members2.id),
      WorkspaceMemberStatus.NeedMoreSeat,
      'should not change status'
    );
  }
});

test('should be able to grant team member permission', async t => {
  const { app, permissions } = t.context;
  const { owner, teamWorkspace: ws, admin, write, read } = await init(app);

  await t.throwsAsync(
    grantMember(app, read.token.token, ws.id, write.id, 'Write'),
    { instanceOf: Error },
    'should throw error if not owner'
  );
  await t.throwsAsync(
    grantMember(app, write.token.token, ws.id, read.id, 'Write'),
    { instanceOf: Error },
    'should throw error if not owner'
  );
  await t.throwsAsync(
    grantMember(app, admin.token.token, ws.id, read.id, 'Write'),
    { instanceOf: Error },
    'should throw error if not owner'
  );

  {
    // owner should be able to grant permission
    t.true(
      await permissions.tryCheckWorkspaceIs(ws.id, read.id, Permission.Read),
      'should be able to check permission'
    );
    t.truthy(
      await grantMember(app, owner.token.token, ws.id, read.id, 'Admin'),
      'should be able to grant permission'
    );
    t.true(
      await permissions.tryCheckWorkspaceIs(ws.id, read.id, Permission.Admin),
      'should be able to check permission'
    );
  }
});

test('should be able to leave workspace', async t => {
  const { app } = t.context;
  const { owner, teamWorkspace: ws, admin, write, read } = await init(app);

  t.false(
    await leaveWorkspace(app, owner.token.token, ws.id),
    'owner should not be able to leave workspace'
  );
  t.true(
    await leaveWorkspace(app, admin.token.token, ws.id),
    'admin should be able to leave workspace'
  );
  t.true(
    await leaveWorkspace(app, write.token.token, ws.id),
    'write should be able to leave workspace'
  );
  t.true(
    await leaveWorkspace(app, read.token.token, ws.id),
    'read should be able to leave workspace'
  );
});

test('should be able to invite by link', async t => {
  const { app, permissions, quotaManager } = t.context;
  const {
    createInviteLink,
    owner,
    workspace: ws,
    teamWorkspace: tws,
  } = await init(app, 4);
  const [inviteId, invite] = await createInviteLink(ws);
  const [teamInviteId, teamInvite, acceptTeamInvite] =
    await createInviteLink(tws);

  {
    // check invite link
    const info = await getInviteInfo(app, owner.token.token, inviteId);
    t.is(info.workspace.id, ws.id, 'should be able to get invite info');

    // check team invite link
    const teamInfo = await getInviteInfo(app, owner.token.token, teamInviteId);
    t.is(teamInfo.workspace.id, tws.id, 'should be able to get invite info');
  }

  {
    // invite link
    const t1 = await invite('test1@affine.pro');
    const t2 = await invite('test2@affine.pro');

    await t.throwsAsync(
      invite('test3@affine.pro'),
      { message: 'You have exceeded your workspace member quota.' },
      'should throw error if exceed member limit'
    );

    const s1 = await permissions.getWorkspaceMemberStatus(ws.id, t1.id);
    t.is(s1, WorkspaceMemberStatus.Accepted, 'should be able to check status');
    const s2 = await permissions.getWorkspaceMemberStatus(ws.id, t2.id);
    t.is(s2, WorkspaceMemberStatus.Accepted, 'should be able to check status');
  }

  {
    // team invite link
    const members: UserAuthedType[] = [];
    await t.notThrowsAsync(async () => {
      members.push(await teamInvite('member3@affine.pro'));
      members.push(await teamInvite('member4@affine.pro'));
    }, 'should not throw error even exceed member limit');
    const [m3, m4] = members;

    t.is(
      await permissions.getWorkspaceMemberStatus(tws.id, m3.id),
      WorkspaceMemberStatus.NeedMoreSeatAndReview,
      'should not change status'
    );
    t.is(
      await permissions.getWorkspaceMemberStatus(tws.id, m4.id),
      WorkspaceMemberStatus.NeedMoreSeatAndReview,
      'should not change status'
    );

    await quotaManager.updateWorkspaceConfig(tws.id, QuotaType.TeamPlanV1, {
      memberLimit: 5,
    });
    await permissions.refreshSeatStatus(tws.id, 5);
    t.is(
      await permissions.getWorkspaceMemberStatus(tws.id, m3.id),
      WorkspaceMemberStatus.UnderReview,
      'should not change status'
    );
    t.is(
      await permissions.getWorkspaceMemberStatus(tws.id, m4.id),
      WorkspaceMemberStatus.NeedMoreSeatAndReview,
      'should not change status'
    );

    await quotaManager.updateWorkspaceConfig(tws.id, QuotaType.TeamPlanV1, {
      memberLimit: 6,
    });
    await permissions.refreshSeatStatus(tws.id, 6);
    t.is(
      await permissions.getWorkspaceMemberStatus(tws.id, m4.id),
      WorkspaceMemberStatus.UnderReview,
      'should not change status'
    );

    {
      const message = `You have already joined in Space ${tws.id}.`;
      await t.throwsAsync(
        acceptTeamInvite(owner.token.token),
        { message },
        'should throw error if member already in workspace'
      );
    }
  }
});
