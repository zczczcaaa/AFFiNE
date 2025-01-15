import { CurrentWorkspaceScopeProvider } from '@affine/core/components/providers/current-workspace-scope';
import type { SettingTab } from '@affine/core/modules/dialogs/constant';
import { useMemo } from 'react';

import type { SettingState } from '../types';
import { WorkspaceSettingBilling } from './billing';
import { WorkspaceSettingDetail } from './new-workspace-setting-detail';
import { WorkspaceSettingProperties } from './properties';

export const WorkspaceSetting = ({
  activeTab,
  onCloseSetting,
  onChangeSettingState,
}: {
  activeTab: SettingTab;
  onCloseSetting: () => void;
  onChangeSettingState: (settingState: SettingState) => void;
}) => {
  const element = useMemo(() => {
    switch (activeTab) {
      case 'workspace:preference':
        return (
          <WorkspaceSettingDetail
            onCloseSetting={onCloseSetting}
            onChangeSettingState={onChangeSettingState}
          />
        );
      case 'workspace:properties':
        return <WorkspaceSettingProperties />;
      case 'workspace:billing':
        return <WorkspaceSettingBilling />;
      default:
        return null;
    }
  }, [activeTab, onCloseSetting, onChangeSettingState]);
  return (
    <CurrentWorkspaceScopeProvider>{element}</CurrentWorkspaceScopeProvider>
  );
};
