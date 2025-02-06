import { Module } from '@nestjs/common';

import { PermissionService } from './service';

@Module({
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}

export { PermissionService } from './service';
export {
  DOC_ACTIONS,
  type DocActionPermissions,
  DocRole,
  fixupDocRole,
  mapDocRoleToPermissions,
  mapWorkspaceRoleToPermissions,
  PublicPageMode,
  WORKSPACE_ACTIONS,
  type WorkspaceActionPermissions,
  WorkspaceRole,
} from './types';
