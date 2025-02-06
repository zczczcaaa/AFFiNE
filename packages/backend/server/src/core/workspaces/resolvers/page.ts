import { Logger } from '@nestjs/common';
import {
  Args,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Parent,
  registerEnumType,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import type { WorkspacePage as PrismaWorkspacePage } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

import {
  ExpectToGrantDocUserRoles,
  ExpectToPublishPage,
  ExpectToRevokeDocUserRoles,
  ExpectToRevokePublicPage,
  ExpectToUpdateDocUserRole,
  PageIsNotPublic,
  registerObjectType,
} from '../../../base';
import { CurrentUser } from '../../auth';
import {
  DOC_ACTIONS,
  type DocActionPermissions,
  DocRole,
  fixupDocRole,
  mapDocRoleToPermissions,
  PermissionService,
  PublicPageMode,
  WorkspaceRole,
} from '../../permission';
import { UserType } from '../../user';
import { DocID } from '../../utils/doc';
import { WorkspaceType } from '../types';

registerEnumType(PublicPageMode, {
  name: 'PublicPageMode',
  description: 'The mode which the public page default in',
});

@ObjectType()
class WorkspacePage implements Partial<PrismaWorkspacePage> {
  @Field(() => String, { name: 'id' })
  pageId!: string;

  @Field()
  workspaceId!: string;

  @Field(() => PublicPageMode)
  mode!: PublicPageMode;

  @Field()
  public!: boolean;
}

@InputType()
class GrantDocUserRolesInput {
  @Field(() => String)
  docId!: string;

  @Field(() => String)
  workspaceId!: string;

  @Field(() => DocRole)
  role!: DocRole;

  @Field(() => [String])
  userIds!: string[];
}

@InputType()
class PageGrantedUsersInput {
  @Field(() => Int)
  first!: number;

  @Field(() => Int)
  offset?: number;

  @Field(() => String, { description: 'Cursor', nullable: true })
  after?: string;

  @Field(() => String, { description: 'Cursor', nullable: true })
  before?: string;
}

@ObjectType()
class GrantedDocUserType {
  @Field(() => UserType)
  user!: UserType;

  @Field(() => DocRole)
  role!: DocRole;
}

@ObjectType()
class PageInfo {
  @Field(() => String, { nullable: true })
  startCursor?: string;

  @Field(() => String, { nullable: true })
  endCursor?: string;

  @Field(() => Boolean)
  hasNextPage!: boolean;

  @Field(() => Boolean)
  hasPreviousPage!: boolean;
}

@ObjectType()
class GrantedDocUserEdge {
  @Field(() => GrantedDocUserType)
  user!: GrantedDocUserType;

  @Field(() => String)
  cursor!: string;
}

@ObjectType()
class GrantedDocUsersConnection {
  @Field(() => Int)
  totalCount!: number;

  @Field(() => [GrantedDocUserEdge])
  edges!: GrantedDocUserEdge[];

  @Field(() => PageInfo)
  pageInfo!: PageInfo;
}

const DocPermissions = registerObjectType<DocActionPermissions>(
  Object.fromEntries(
    DOC_ACTIONS.map(action => [action.replaceAll('.', '_'), Boolean])
  ),
  { name: 'DocPermissions' }
);

@ObjectType()
class DocType {
  @Field(() => String)
  id!: string;

  @Field(() => Boolean)
  public!: boolean;

  @Field(() => DocRole)
  role!: DocRole;

  @Field(() => DocPermissions)
  permissions!: DocActionPermissions;
}

@Resolver(() => WorkspaceType)
export class PagePermissionResolver {
  private readonly logger = new Logger(PagePermissionResolver.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly permission: PermissionService
  ) {}

  /**
   * @deprecated
   */
  @ResolveField(() => [String], {
    description: 'Shared pages of workspace',
    complexity: 2,
    deprecationReason: 'use WorkspaceType.publicPages',
  })
  async sharedPages(@Parent() workspace: WorkspaceType) {
    const data = await this.prisma.workspacePage.findMany({
      where: {
        workspaceId: workspace.id,
        public: true,
      },
    });

    return data.map(row => row.pageId);
  }

  @ResolveField(() => [WorkspacePage], {
    description: 'Public pages of a workspace',
    complexity: 2,
  })
  async publicPages(@Parent() workspace: WorkspaceType) {
    return this.prisma.workspacePage.findMany({
      where: {
        workspaceId: workspace.id,
        public: true,
      },
    });
  }

  @ResolveField(() => WorkspacePage, {
    description: 'Get public page of a workspace by page id.',
    complexity: 2,
    nullable: true,
  })
  async publicPage(
    @Parent() workspace: WorkspaceType,
    @Args('pageId') pageId: string
  ) {
    return this.prisma.workspacePage.findFirst({
      where: {
        workspaceId: workspace.id,
        pageId,
        public: true,
      },
    });
  }

  @ResolveField(() => DocType, {
    description: 'Check if current user has permission to access the page',
    complexity: 2,
  })
  async pagePermission(
    @Parent() workspace: WorkspaceType,
    @Args('pageId') pageId: string,
    @CurrentUser() user: CurrentUser
  ): Promise<DocType> {
    const page = await this.prisma.workspacePage.findFirst({
      where: {
        workspaceId: workspace.id,
        pageId,
      },
      select: {
        public: true,
      },
    });

    const [permission, workspacePermission] = await this.prisma.$transaction(
      tx =>
        Promise.all([
          tx.workspacePageUserPermission.findFirst({
            where: {
              workspaceId: workspace.id,
              pageId,
              userId: user.id,
            },
          }),
          tx.workspaceUserPermission.findFirst({
            where: {
              workspaceId: workspace.id,
              userId: user.id,
            },
          }),
        ])
    );
    return {
      id: pageId,
      public: page?.public ?? false,
      role: permission?.type ?? DocRole.External,
      permissions: mapDocRoleToPermissions(
        fixupDocRole(workspacePermission?.type, permission?.type)
      ),
    };
  }

  @ResolveField(() => GrantedDocUsersConnection, {
    description: 'Page granted users list',
    complexity: 4,
  })
  async pageGrantedUsersList(
    @Parent() workspace: WorkspaceType,
    @Args('pageId') pageId: string,
    @Args('pageGrantedUsersInput')
    pageGrantedUsersInput: PageGrantedUsersInput
  ): Promise<GrantedDocUsersConnection> {
    const docId = new DocID(pageId, workspace.id);
    const [permissions, totalCount] = await this.prisma.$transaction(tx => {
      return Promise.all([
        tx.workspacePageUserPermission.findMany({
          where: {
            workspaceId: workspace.id,
            pageId: docId.guid,
          },
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: pageGrantedUsersInput.first,
          skip: pageGrantedUsersInput.offset,
          cursor: pageGrantedUsersInput.after
            ? {
                id: pageGrantedUsersInput.after,
              }
            : undefined,
        }),
        tx.workspacePageUserPermission.count({
          where: {
            workspaceId: workspace.id,
            pageId: docId.guid,
          },
        }),
      ]);
    });

    return {
      totalCount,
      edges: permissions.map(permission => ({
        user: {
          user: {
            id: permission.user.id,
            name: permission.user.name,
            email: permission.user.email,
            avatarUrl: permission.user.avatarUrl,
            emailVerified: permission.user.emailVerifiedAt !== null,
            hasPassword: permission.user.password !== null,
          },
          role: permission.type,
        },
        cursor: permission.id,
      })),
      pageInfo: {
        startCursor: permissions.at(0)?.id,
        endCursor: permissions.at(-1)?.id,
        hasNextPage: totalCount > pageGrantedUsersInput.first,
        hasPreviousPage:
          pageGrantedUsersInput.offset !== undefined &&
          pageGrantedUsersInput.offset > 0,
      },
    };
  }

  /**
   * @deprecated
   */
  @Mutation(() => Boolean, {
    name: 'sharePage',
    deprecationReason: 'renamed to publishPage',
  })
  async deprecatedSharePage(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('pageId') pageId: string
  ) {
    await this.publishPage(user, workspaceId, pageId, PublicPageMode.Page);
    return true;
  }

  @Mutation(() => WorkspacePage)
  async publishPage(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('pageId') pageId: string,
    @Args({
      name: 'mode',
      type: () => PublicPageMode,
      nullable: true,
      defaultValue: PublicPageMode.Page,
    })
    mode: PublicPageMode
  ) {
    const docId = new DocID(pageId, workspaceId);

    if (docId.isWorkspace) {
      this.logger.error('Expect to publish page, but it is a workspace', {
        workspaceId,
        pageId,
      });
      throw new ExpectToPublishPage();
    }

    await this.permission.checkPagePermission(
      docId.workspace,
      docId.guid,
      'Doc.Publish',
      user.id
    );

    this.logger.log('Publish page', {
      workspaceId,
      pageId,
      mode,
    });

    return this.permission.publishPage(docId.workspace, docId.guid, mode);
  }

  /**
   * @deprecated
   */
  @Mutation(() => Boolean, {
    name: 'revokePage',
    deprecationReason: 'use revokePublicPage',
  })
  async deprecatedRevokePage(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('pageId') pageId: string
  ) {
    await this.revokePublicPage(user, workspaceId, pageId);
    return true;
  }

  @Mutation(() => WorkspacePage)
  async revokePublicPage(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('pageId') pageId: string
  ) {
    const docId = new DocID(pageId, workspaceId);

    if (docId.isWorkspace) {
      this.logger.error('Expect to revoke public page, but it is a workspace', {
        workspaceId,
        pageId,
      });
      throw new ExpectToRevokePublicPage('Expect page not to be workspace');
    }

    await this.permission.checkPagePermission(
      docId.workspace,
      docId.guid,
      'Doc.Publish',
      user.id
    );

    const isPublic = await this.permission.isPublicPage(
      docId.workspace,
      docId.guid
    );

    if (!isPublic) {
      this.logger.log('Expect to revoke public page, but it is not public', {
        workspaceId,
        pageId,
      });
      throw new PageIsNotPublic('Page is not public');
    }

    this.logger.log('Revoke public page', {
      workspaceId,
      pageId,
    });

    return this.permission.revokePublicPage(docId.workspace, docId.guid);
  }

  @Mutation(() => Boolean)
  async grantDocUserRoles(
    @CurrentUser() user: CurrentUser,
    @Args('input') input: GrantDocUserRolesInput
  ): Promise<boolean> {
    const doc = new DocID(input.docId, input.workspaceId);
    const pairs = {
      spaceId: input.workspaceId,
      docId: input.docId,
    };
    if (doc.isWorkspace) {
      this.logger.error(
        'Expect to grant doc user roles, but it is a workspace',
        pairs
      );
      throw new ExpectToGrantDocUserRoles(
        pairs,
        'Expect doc not to be workspace'
      );
    }
    await this.permission.checkPagePermission(
      doc.workspace,
      doc.guid,
      'Doc.Users.Manage',
      user.id
    );
    await this.permission.grantPagePermission(
      doc.workspace,
      doc.guid,
      input.userIds,
      input.role
    );
    this.logger.log('Grant doc user roles', {
      ...pairs,
      userIds: input.userIds,
      role: input.role,
    });
    return true;
  }

  @Mutation(() => Boolean)
  async revokeDocUserRoles(
    @CurrentUser() user: CurrentUser,
    @Args('docId') docId: string,
    @Args('userIds', { type: () => [String] }) userIds: string[]
  ): Promise<boolean> {
    const doc = new DocID(docId);
    const pairs = {
      spaceId: doc.workspace,
      docId: doc.guid,
    };
    if (doc.isWorkspace) {
      this.logger.error(
        'Expect to revoke doc user roles, but it is a workspace',
        pairs
      );
      throw new ExpectToRevokeDocUserRoles(
        pairs,
        'Expect doc not to be workspace'
      );
    }
    await this.permission.checkWorkspace(
      doc.workspace,
      user.id,
      WorkspaceRole.Collaborator
    );
    await this.permission.revokePage(doc.workspace, doc.guid, userIds);
    this.logger.log('Revoke doc user roles', {
      ...pairs,
      userIds: userIds,
    });
    return true;
  }

  @Mutation(() => Boolean)
  async updateDocUserRole(
    @CurrentUser() user: CurrentUser,
    @Args('docId') docId: string,
    @Args('userId') userId: string,
    @Args('role', { type: () => DocRole }) role: DocRole
  ): Promise<boolean> {
    const doc = new DocID(docId);
    const pairs = {
      spaceId: doc.workspace,
      docId: doc.guid,
    };
    if (doc.isWorkspace) {
      this.logger.error(
        'Expect to update doc user role, but it is a workspace',
        pairs
      );
      throw new ExpectToUpdateDocUserRole(
        pairs,
        'Expect doc not to be workspace'
      );
    }
    await this.permission.checkWorkspace(
      doc.workspace,
      user.id,
      WorkspaceRole.Collaborator
    );
    if (role === DocRole.Owner) {
      const ret = await this.permission.grantPagePermission(
        doc.workspace,
        doc.guid,
        [userId],
        role
      );
      this.logger.log('Transfer doc owner', {
        ...pairs,
        userId: userId,
        role: role,
      });
      return ret.length > 0;
    } else {
      await this.permission.updatePagePermission(
        doc.workspace,
        doc.guid,
        userId,
        role
      );
      this.logger.log('Update doc user role', {
        ...pairs,
        userId: userId,
        role: role,
      });
      return true;
    }
  }
}
