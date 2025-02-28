import {
  Field,
  ID,
  InputType,
  ObjectType,
  OmitType,
  PartialType,
  PickType,
  registerEnumType,
} from '@nestjs/graphql';
import { WorkspaceMemberStatus } from '@prisma/client';
import { SafeIntResolver } from 'graphql-scalars';

import { DocRole, WorkspaceRole } from '../permission';
import { UserType } from '../user/types';

registerEnumType(WorkspaceRole, {
  name: 'WorkspaceRole',
  description: 'User role in workspace',
});

// @deprecated
registerEnumType(WorkspaceRole, {
  name: 'Permission',
  description: 'User permission in workspace',
});

registerEnumType(DocRole, {
  name: 'DocRole',
  description: 'User permission in doc',
});

registerEnumType(WorkspaceMemberStatus, {
  name: 'WorkspaceMemberStatus',
  description: 'Member invite status in workspace',
});

@ObjectType()
export class InviteUserType extends OmitType(
  PartialType(UserType),
  ['id'],
  ObjectType
) {
  @Field(() => ID)
  id!: string;

  @Field(() => WorkspaceRole, {
    deprecationReason: 'Use role instead',
    description: 'User permission in workspace',
  })
  permission!: WorkspaceRole;

  @Field(() => WorkspaceRole, { description: 'User role in workspace' })
  role!: WorkspaceRole;

  @Field({ description: 'Invite id' })
  inviteId!: string;

  @Field({
    description: 'User accepted',
    deprecationReason: 'Use `status` instead',
  })
  accepted!: boolean;

  @Field(() => WorkspaceMemberStatus, {
    description: 'Member invite status in workspace',
  })
  status!: WorkspaceMemberStatus;
}

@ObjectType()
export class WorkspaceFeatureType {
  @Field(() => ID)
  id!: string;

  @Field({ description: 'is Public workspace' })
  public!: boolean;

  @Field({ description: 'Workspace created date' })
  createdAt!: Date;
}

@ObjectType()
export class WorkspaceType extends WorkspaceFeatureType {
  @Field({ description: 'Enable AI' })
  enableAi!: boolean;

  @Field({ description: 'Enable url previous when sharing' })
  enableUrlPreview!: boolean;

  @Field(() => [InviteUserType], {
    description: 'Members of workspace',
  })
  members!: InviteUserType[];
}

@ObjectType()
export class InvitationWorkspaceType {
  @Field(() => ID)
  id!: string;

  @Field({ description: 'Workspace name' })
  name!: string;

  @Field(() => String, {
    // nullable: true,
    description: 'Base64 encoded avatar',
  })
  avatar!: string;
}

@ObjectType()
export class WorkspaceBlobSizes {
  @Field(() => SafeIntResolver)
  size!: number;
}

@ObjectType()
export class InvitationType {
  @Field({ description: 'Workspace information' })
  workspace!: InvitationWorkspaceType;
  @Field({ description: 'User information' })
  user!: UserType;
  @Field({ description: 'Invitee information' })
  invitee!: UserType;
}

@InputType()
export class UpdateWorkspaceInput extends PickType(
  PartialType(WorkspaceType),
  ['public', 'enableAi', 'enableUrlPreview'],
  InputType
) {
  @Field(() => ID)
  id!: string;
}

@ObjectType()
export class InviteLink {
  @Field(() => String, { description: 'Invite link' })
  link!: string;

  @Field(() => Date, { description: 'Invite link expire time' })
  expireTime!: Date;
}

@ObjectType()
export class InviteResult {
  @Field(() => String)
  email!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Invite id, null if invite record create failed',
  })
  inviteId!: string | null;

  @Field(() => Boolean, { description: 'Invite email sent success' })
  sentSuccess!: boolean;
}

const Day = 24 * 60 * 60 * 1000;

export enum WorkspaceInviteLinkExpireTime {
  OneDay = Day,
  ThreeDays = 3 * Day,
  OneWeek = 7 * Day,
  OneMonth = 30 * Day,
}

registerEnumType(WorkspaceInviteLinkExpireTime, {
  name: 'WorkspaceInviteLinkExpireTime',
  description: 'Workspace invite link expire time',
});
