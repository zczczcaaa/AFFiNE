import {
  SettingHeader,
  SettingWrapper,
} from '@affine/component/setting-components';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import { useService } from '@toeverything/infra';

import { DesktopExportPanel } from './export';
import { WorkspaceQuotaPanel } from './workspace-quota';

export const WorkspaceSettingStorage = () => {
  const t = useI18n();
  const workspace = useService(WorkspaceService).workspace;
  return (
    <>
      <SettingHeader
        title={t['Storage']()}
        subtitle={t['com.affine.settings.workspace.storage.subtitle']()}
      />
      {workspace.flavour !== 'local' && (
        <SettingWrapper>
          <WorkspaceQuotaPanel />
        </SettingWrapper>
      )}
      {BUILD_CONFIG.isElectron && (
        <SettingWrapper>
          <DesktopExportPanel workspace={workspace} />
        </SettingWrapper>
      )}
    </>
  );
};
