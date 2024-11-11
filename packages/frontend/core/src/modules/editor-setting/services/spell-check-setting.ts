import type {
  SpellCheckStateKey,
  SpellCheckStateSchema,
} from '@affine/electron/main/shared-state-schema';
import type { GlobalStateService } from '@toeverything/infra';
import { LiveData, Service } from '@toeverything/infra';

const SPELL_CHECK_SETTING_KEY: SpellCheckStateKey = 'spellCheckState';

export class SpellCheckSettingService extends Service {
  constructor(private readonly globalStateService: GlobalStateService) {
    super();
  }

  enabled$ = LiveData.from(
    this.globalStateService.globalState.watch<
      SpellCheckStateSchema | undefined
    >(SPELL_CHECK_SETTING_KEY),
    { enabled: false }
  );

  setEnabled(enabled: boolean) {
    this.globalStateService.globalState.set(SPELL_CHECK_SETTING_KEY, {
      enabled,
    });
  }
}
