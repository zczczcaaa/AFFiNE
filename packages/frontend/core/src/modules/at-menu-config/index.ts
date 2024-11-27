import {
  type Framework,
  WorkspaceScope,
  WorkspaceService,
} from '@toeverything/infra';

import { WorkspaceDialogService } from '../dialogs';
import { DocDisplayMetaService } from '../doc-display-meta';
import { JournalService } from '../journal';
import { RecentDocsService } from '../quicksearch';
import { AtMenuConfigService } from './services';

export function configAtMenuConfigModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(AtMenuConfigService, [
      WorkspaceService,
      JournalService,
      DocDisplayMetaService,
      WorkspaceDialogService,
      RecentDocsService,
      WorkspaceDialogService,
    ]);
}
