import type { SettingTab } from '@affine/core/modules/dialogs/constant';
import type { ReactNode } from 'react';

export interface SettingState {
  activeTab: SettingTab;
  scrollAnchor?: string;
}

export interface SettingSidebarItem {
  key: SettingTab;
  title: string;
  icon: ReactNode;
  testId: string;
}
