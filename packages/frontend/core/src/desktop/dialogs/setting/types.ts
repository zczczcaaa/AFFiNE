import type { SettingTab } from '@affine/core/modules/dialogs/constant';

export interface SettingState {
  activeTab: SettingTab;
  scrollAnchor?: string;
}
