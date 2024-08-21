import {
  Args,
  Field,
  GraphQLISODateTime,
  Int,
  Mutation,
  ObjectType,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import type { SnapshotHistory } from '@prisma/client';

import { CurrentUser } from '../../auth';
import { PgWorkspaceDocStorageAdapter } from '../../doc';
import { Permission, PermissionService } from '../../permission';
import { DocID } from '../../utils/doc';
import { WorkspaceType } from '../types';

@ObjectType()
class DocHistoryType implements Partial<SnapshotHistory> {
  @Field()
  workspaceId!: string;

  @Field()
  id!: string;

  @Field(() => GraphQLISODateTime)
  timestamp!: Date;
}

@Resolver(() => WorkspaceType)
export class DocHistoryResolver {
  constructor(
    private readonly workspace: PgWorkspaceDocStorageAdapter,
    private readonly permission: PermissionService
  ) {}

  @ResolveField(() => [DocHistoryType])
  async histories(
    @Parent() workspace: WorkspaceType,
    @Args('guid') guid: string,
    @Args({ name: 'before', type: () => GraphQLISODateTime, nullable: true })
    timestamp: Date = new Date(),
    @Args({ name: 'take', type: () => Int, nullable: true })
    take?: number
  ): Promise<DocHistoryType[]> {
    const docId = new DocID(guid, workspace.id);

    const timestamps = await this.workspace.listDocHistories(
      workspace.id,
      docId.guid,
      { before: timestamp.getTime(), limit: take }
    );

    return timestamps.map(timestamp => {
      return {
        workspaceId: workspace.id,
        id: docId.guid,
        timestamp: new Date(timestamp),
      };
    });
  }

  @Mutation(() => Date)
  async recoverDoc(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('guid') guid: string,
    @Args({ name: 'timestamp', type: () => GraphQLISODateTime }) timestamp: Date
  ): Promise<Date> {
    const docId = new DocID(guid, workspaceId);

    await this.permission.checkPagePermission(
      docId.workspace,
      docId.guid,
      user.id,
      Permission.Write
    );

    await this.workspace.rollbackDoc(
      docId.workspace,
      docId.guid,
      timestamp.getTime()
    );

    return timestamp;
  }
}
