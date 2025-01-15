import type { SettingState } from '../../types';

export interface WorkspaceSettingDetailProps {
  onCloseSetting: () => void;
  onChangeSettingState: (settingState: SettingState) => void;
}
