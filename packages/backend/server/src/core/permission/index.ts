import { Module } from '@nestjs/common';

import { PermissionService } from './service';

@Module({
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}

export { PermissionService } from './service';
export { DocRole, PublicPageMode, WorkspaceRole } from './types';
