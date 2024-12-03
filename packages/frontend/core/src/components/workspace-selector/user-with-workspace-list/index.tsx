import { Divider } from '@affine/component/ui/divider';
import { MenuItem } from '@affine/component/ui/menu';
import { AuthService } from '@affine/core/modules/cloud';
import { GlobalDialogService } from '@affine/core/modules/dialogs';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { Logo1Icon } from '@blocksuite/icons/rc';
import {
  FeatureFlagService,
  useLiveData,
  useService,
  type WorkspaceMetadata,
  WorkspacesService,
} from '@toeverything/infra';
import { useCallback } from 'react';

import { useCatchEventCallback } from '../../hooks/use-catch-event-hook';
import { AddWorkspace } from './add-workspace';
import * as styles from './index.css';
import { UserAccountItem } from './user-account';
import { AFFiNEWorkspaceList } from './workspace-list';

export const SignInItem = () => {
  const globalDialogService = useService(GlobalDialogService);

  const t = useI18n();

  const onClickSignIn = useCallback(() => {
    track.$.navigationPanel.workspaceList.requestSignIn();
    globalDialogService.open('sign-in', {});
  }, [globalDialogService]);

  return (
    <MenuItem
      className={styles.menuItem}
      onClick={onClickSignIn}
      data-testid="cloud-signin-button"
    >
      <div className={styles.signInWrapper}>
        <div className={styles.iconContainer}>
          <Logo1Icon />
        </div>

        <div className={styles.signInTextContainer}>
          <div className={styles.signInTextPrimary}>
            {t['com.affine.workspace.cloud.auth']()}
          </div>
          <div className={styles.signInTextSecondary}>
            {t['com.affine.workspace.cloud.description']()}
          </div>
        </div>
      </div>
    </MenuItem>
  );
};

interface UserWithWorkspaceListProps {
  onEventEnd?: () => void;
  onClickWorkspace?: (workspace: WorkspaceMetadata) => void;
  onCreatedWorkspace?: (payload: {
    metadata: WorkspaceMetadata;
    defaultDocId?: string;
  }) => void;
  showSettingsButton?: boolean;
  showEnableCloudButton?: boolean;
}

const UserWithWorkspaceListInner = ({
  onEventEnd,
  onClickWorkspace,
  onCreatedWorkspace,
  showSettingsButton,
  showEnableCloudButton,
}: UserWithWorkspaceListProps) => {
  const globalDialogService = useService(GlobalDialogService);
  const session = useLiveData(useService(AuthService).session.session$);
  const featureFlagService = useService(FeatureFlagService);

  const isAuthenticated = session.status === 'authenticated';

  const openSignInModal = useCallback(() => {
    globalDialogService.open('sign-in', {});
  }, [globalDialogService]);

  const onNewWorkspace = useCallback(() => {
    if (
      !isAuthenticated &&
      !featureFlagService.flags.enable_local_workspace.value
    ) {
      return openSignInModal();
    }
    track.$.navigationPanel.workspaceList.createWorkspace();
    globalDialogService.open('create-workspace', undefined, payload => {
      if (payload) {
        onCreatedWorkspace?.(payload);
      }
    });
    onEventEnd?.();
  }, [
    globalDialogService,
    featureFlagService,
    isAuthenticated,
    onCreatedWorkspace,
    onEventEnd,
    openSignInModal,
  ]);

  const onAddWorkspace = useCallback(() => {
    track.$.navigationPanel.workspaceList.createWorkspace({
      control: 'import',
    });
    globalDialogService.open('import-workspace', undefined, payload => {
      if (payload) {
        onCreatedWorkspace?.({ metadata: payload.workspace });
      }
    });
    onEventEnd?.();
  }, [globalDialogService, onCreatedWorkspace, onEventEnd]);

  const workspaceManager = useService(WorkspacesService);
  const workspaces = useLiveData(workspaceManager.list.workspaces$);

  const onOpenPricingPlan = useCatchEventCallback(() => {
    globalDialogService.open('setting', {
      activeTab: 'plans',
      scrollAnchor: 'cloudPricingPlan',
    });
  }, [globalDialogService]);

  return (
    <div className={styles.workspaceListWrapper}>
      {isAuthenticated ? (
        <UserAccountItem
          email={session.session.account.email ?? 'Unknown User'}
          onEventEnd={onEventEnd}
          onClick={onOpenPricingPlan}
        />
      ) : (
        <SignInItem />
      )}
      <Divider size="thinner" />
      <AFFiNEWorkspaceList
        onEventEnd={onEventEnd}
        onClickWorkspace={onClickWorkspace}
        showEnableCloudButton={showEnableCloudButton}
        showSettingsButton={showSettingsButton}
      />
      {workspaces.length > 0 ? <Divider size="thinner" /> : null}
      <AddWorkspace
        onAddWorkspace={onAddWorkspace}
        onNewWorkspace={onNewWorkspace}
      />
    </div>
  );
};

export const UserWithWorkspaceList = (props: UserWithWorkspaceListProps) => {
  return <UserWithWorkspaceListInner {...props} />;
};
