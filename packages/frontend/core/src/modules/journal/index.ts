import {
  DocScope,
  DocService,
  DocsService,
  type Framework,
  WorkspaceScope,
} from '@toeverything/infra';

import { EditorSettingService } from '../editor-setting';
import { JournalService } from './services/journal';
import { JournalDocService } from './services/journal-doc';
import { JournalStore } from './store/journal';

export {
  JOURNAL_DATE_FORMAT,
  JournalService,
  type MaybeDate,
} from './services/journal';
export { JournalDocService } from './services/journal-doc';

export function configureJournalModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(JournalService, [JournalStore, DocsService, EditorSettingService])
    .store(JournalStore, [DocsService])
    .scope(DocScope)
    .service(JournalDocService, [DocService, JournalService]);
}
