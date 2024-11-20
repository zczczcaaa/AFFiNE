import {
  type Framework,
  GlobalState,
  GlobalStateService,
} from '@toeverything/infra';

import { DesktopApiService } from '../desktop-api';
import { I18n } from '../i18n';
import { UserDBService } from '../userspace';
import { EditorSetting } from './entities/editor-setting';
import { CurrentUserDBEditorSettingProvider } from './impls/user-db';
import { EditorSettingProvider } from './provider/editor-setting-provider';
import { EditorSettingService } from './services/editor-setting';
import { SpellCheckSettingService } from './services/spell-check-setting';
export type { FontFamily } from './schema';
export { EditorSettingSchema, fontStyleOptions } from './schema';
export { EditorSettingService } from './services/editor-setting';

export function configureEditorSettingModule(framework: Framework) {
  framework
    .service(EditorSettingService)
    .entity(EditorSetting, [EditorSettingProvider])
    .impl(EditorSettingProvider, CurrentUserDBEditorSettingProvider, [
      UserDBService,
      GlobalState,
    ]);
}

export function configureSpellCheckSettingModule(framework: Framework) {
  framework.service(SpellCheckSettingService, [
    GlobalStateService,
    I18n,
    DesktopApiService,
  ]);
}
