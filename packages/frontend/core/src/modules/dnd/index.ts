import {
  DocsService,
  type Framework,
  WorkspaceScope,
  WorkspaceService,
} from '@toeverything/infra';

import { DndService } from './services';

export function configureDndModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(DndService, [DocsService, WorkspaceService]);
}
