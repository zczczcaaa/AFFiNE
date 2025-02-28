export { WorkspaceShareSettingService } from './services/share-setting';

import { type Framework } from '@toeverything/infra';

import { WorkspaceServerService } from '../cloud';
import { WorkspaceScope, WorkspaceService } from '../workspace';
import { WorkspaceShareSetting } from './entities/share-setting';
import { WorkspaceShareSettingService } from './services/share-setting';
import { WorkspaceShareSettingStore } from './stores/share-setting';

export function configureShareSettingModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(WorkspaceShareSettingService)
    .store(WorkspaceShareSettingStore, [WorkspaceServerService])
    .entity(WorkspaceShareSetting, [
      WorkspaceService,
      WorkspaceShareSettingStore,
    ]);
}
