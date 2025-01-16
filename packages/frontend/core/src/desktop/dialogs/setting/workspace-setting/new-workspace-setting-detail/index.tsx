import {
  SettingHeader,
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';
import { useWorkspaceInfo } from '@affine/core/components/hooks/use-workspace-info';
import { WorkspaceServerService } from '@affine/core/modules/cloud';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { UNTITLED_WORKSPACE_NAME } from '@affine/env/constant';
import { useI18n } from '@affine/i18n';
import { FrameworkScope, useService } from '@toeverything/infra';

import { DeleteLeaveWorkspace } from './delete-leave-workspace';
import { EnableCloudPanel } from './enable-cloud';
import { DesktopExportPanel } from './export';
import { LabelsPanel } from './labels';
import { MembersPanel } from './members';
import { ProfilePanel } from './profile';
import { SharingPanel } from './sharing';
import { TemplateDocSetting } from './template';
import type { WorkspaceSettingDetailProps } from './types';
import { WorkspaceQuotaPanel } from './workspace-quota';

export const WorkspaceSettingDetail = ({
  onCloseSetting,
  onChangeSettingState,
}: WorkspaceSettingDetailProps) => {
  const t = useI18n();

  const workspace = useService(WorkspaceService).workspace;
  const server = workspace?.scope.get(WorkspaceServerService).server;

  const workspaceInfo = useWorkspaceInfo(workspace);

  if (!workspace) {
    return null;
  }

  return (
    <FrameworkScope scope={server?.scope}>
      <FrameworkScope scope={workspace.scope}>
        <SettingHeader
          title={t[`Workspace Settings with name`]({
            name: workspaceInfo?.name ?? UNTITLED_WORKSPACE_NAME,
          })}
          subtitle={t['com.affine.settings.workspace.description']()}
        />
        <SettingWrapper title={t['Info']()}>
          <SettingRow
            name={t['Workspace Profile']()}
            desc={t['com.affine.settings.workspace.not-owner']()}
            spreadCol={false}
          >
            <ProfilePanel />
            <LabelsPanel />
          </SettingRow>
        </SettingWrapper>
        <TemplateDocSetting />
        <SettingWrapper title={t['com.affine.brand.affineCloud']()}>
          <EnableCloudPanel onCloseSetting={onCloseSetting} />
          {workspace.flavour !== 'local' && <WorkspaceQuotaPanel />}
          {workspace.flavour !== 'local' && (
            <MembersPanel onChangeSettingState={onChangeSettingState} />
          )}
        </SettingWrapper>
        <SharingPanel />
        {BUILD_CONFIG.isElectron && (
          <SettingWrapper title={t['Storage and Export']()}>
            <DesktopExportPanel workspace={workspace} />
          </SettingWrapper>
        )}
        <SettingWrapper>
          <DeleteLeaveWorkspace onCloseSetting={onCloseSetting} />
        </SettingWrapper>
      </FrameworkScope>
    </FrameworkScope>
  );
};
