import {
  IconButton,
  Menu,
  MenuItem,
  ScrollableContainer,
} from '@affine/component';
import { Divider } from '@affine/component/ui/divider';
import { useEnableCloud } from '@affine/core/components/hooks/affine/use-enable-cloud';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { useNavigateHelper } from '@affine/core/components/hooks/use-navigate-helper';
import type { Server } from '@affine/core/modules/cloud';
import { AuthService, ServersService } from '@affine/core/modules/cloud';
import { GlobalDialogService } from '@affine/core/modules/dialogs';
import { useI18n } from '@affine/i18n';
import {
  CloudWorkspaceIcon,
  LocalWorkspaceIcon,
  MoreHorizontalIcon,
} from '@blocksuite/icons/rc';
import type { WorkspaceMetadata } from '@toeverything/infra';
import {
  FrameworkScope,
  GlobalContextService,
  useLiveData,
  useService,
  useServiceOptional,
  WorkspaceService,
  WorkspacesService,
} from '@toeverything/infra';
import { useCallback, useMemo } from 'react';

import { WorkspaceCard } from '../../workspace-card';
import * as styles from './index.css';

interface WorkspaceModalProps {
  workspaces: WorkspaceMetadata[];
  onClickWorkspace: (workspaceMetadata: WorkspaceMetadata) => void;
  onClickWorkspaceSetting?: (workspaceMetadata: WorkspaceMetadata) => void;
  onClickEnableCloud?: (meta: WorkspaceMetadata) => void;
  onNewWorkspace: () => void;
  onAddWorkspace: () => void;
}

const CloudWorkSpaceList = ({
  server,
  workspaces,
  onClickWorkspace,
  onClickWorkspaceSetting,
  onClickEnableCloud,
}: {
  server: Server;
  workspaces: WorkspaceMetadata[];
  onClickWorkspace: (workspaceMetadata: WorkspaceMetadata) => void;
  onClickWorkspaceSetting?: (workspaceMetadata: WorkspaceMetadata) => void;
  onClickEnableCloud?: (meta: WorkspaceMetadata) => void;
}) => {
  const globalContextService = useService(GlobalContextService);
  const globalDialogService = useService(GlobalDialogService);
  const serverName = useLiveData(server.config$.selector(c => c.serverName));
  const authService = useService(AuthService);
  const serversService = useService(ServersService);
  const account = useLiveData(authService.session.account$);
  const accountStatus = useLiveData(authService.session.status$);
  const navigateHelper = useNavigateHelper();

  const currentWorkspaceFlavour = useLiveData(
    globalContextService.globalContext.workspaceFlavour.$
  );

  const handleDeleteServer = useCallback(() => {
    serversService.removeServer(server.id);

    if (currentWorkspaceFlavour === server.id) {
      const otherWorkspace = workspaces.find(w => w.flavour !== server.id);
      if (otherWorkspace) {
        navigateHelper.openPage(otherWorkspace.id, 'all');
      }
    }
  }, [
    currentWorkspaceFlavour,
    navigateHelper,
    server.id,
    serversService,
    workspaces,
  ]);

  const handleSignOut = useAsyncCallback(async () => {
    await authService.signOut();
  }, [authService]);

  const handleSignIn = useAsyncCallback(async () => {
    globalDialogService.open('sign-in', {
      server: server.baseUrl,
    });
  }, [globalDialogService, server.baseUrl]);

  return (
    <div className={styles.workspaceListWrapper}>
      <div className={styles.workspaceServer}>
        <div className={styles.workspaceServerName}>
          <CloudWorkspaceIcon
            width={14}
            height={14}
            className={styles.workspaceTypeIcon}
          />
          {serverName}&nbsp;-&nbsp;
          {account ? account.email : 'Not signed in'}
        </div>
        <Menu
          items={[
            server.id !== 'affine-cloud' && (
              <MenuItem key="delete-server" onClick={handleDeleteServer}>
                Delete Server
              </MenuItem>
            ),
            accountStatus === 'authenticated' && (
              <MenuItem key="sign-out" onClick={handleSignOut}>
                Sign Out
              </MenuItem>
            ),
            accountStatus === 'unauthenticated' && (
              <MenuItem key="sign-in" onClick={handleSignIn}>
                Sign In
              </MenuItem>
            ),
          ]}
        >
          <IconButton icon={<MoreHorizontalIcon />} />
        </Menu>
      </div>
      <WorkspaceList
        items={workspaces}
        onClick={onClickWorkspace}
        onSettingClick={onClickWorkspaceSetting}
        onEnableCloudClick={onClickEnableCloud}
      />
    </div>
  );
};

const LocalWorkspaces = ({
  workspaces,
  onClickWorkspace,
  onClickWorkspaceSetting,
  onClickEnableCloud,
}: Omit<WorkspaceModalProps, 'onNewWorkspace' | 'onAddWorkspace'>) => {
  const t = useI18n();
  if (workspaces.length === 0) {
    return null;
  }
  return (
    <div className={styles.workspaceListWrapper}>
      <div className={styles.workspaceServer}>
        <div className={styles.workspaceServerName}>
          <LocalWorkspaceIcon
            width={14}
            height={14}
            className={styles.workspaceTypeIcon}
          />
          {t['com.affine.workspaceList.workspaceListType.local']()}
        </div>
      </div>
      <WorkspaceList
        items={workspaces}
        onClick={onClickWorkspace}
        onSettingClick={onClickWorkspaceSetting}
        onEnableCloudClick={onClickEnableCloud}
      />
    </div>
  );
};

export const AFFiNEWorkspaceList = ({
  onEventEnd,
  onClickWorkspace,
  showEnableCloudButton,
  showSettingsButton,
}: {
  onClickWorkspace?: (workspaceMetadata: WorkspaceMetadata) => void;
  onEventEnd?: () => void;
  showSettingsButton?: boolean;
  showEnableCloudButton?: boolean;
}) => {
  const workspacesService = useService(WorkspacesService);
  const workspaces = useLiveData(workspacesService.list.workspaces$);
  const globalDialogService = useService(GlobalDialogService);

  const confirmEnableCloud = useEnableCloud();

  const serversService = useService(ServersService);
  const servers = useLiveData(serversService.servers$);

  const cloudWorkspaces = useMemo(
    () =>
      workspaces.filter(
        ({ flavour }) => flavour !== 'local'
      ) as WorkspaceMetadata[],
    [workspaces]
  );

  const localWorkspaces = useMemo(
    () =>
      workspaces.filter(
        ({ flavour }) => flavour === 'local'
      ) as WorkspaceMetadata[],
    [workspaces]
  );

  const onClickWorkspaceSetting = useCallback(
    (workspaceMetadata: WorkspaceMetadata) => {
      globalDialogService.open('setting', {
        activeTab: 'workspace:preference',
        workspaceMetadata,
      });
      onEventEnd?.();
    },
    [globalDialogService, onEventEnd]
  );

  const onClickEnableCloud = useCallback(
    (meta: WorkspaceMetadata) => {
      const { workspace, dispose } = workspacesService.open({ metadata: meta });
      confirmEnableCloud(workspace, {
        onFinished: () => {
          dispose();
        },
      });
    },
    [confirmEnableCloud, workspacesService]
  );

  const handleClickWorkspace = useCallback(
    (workspaceMetadata: WorkspaceMetadata) => {
      onClickWorkspace?.(workspaceMetadata);
      onEventEnd?.();
    },
    [onClickWorkspace, onEventEnd]
  );

  return (
    <ScrollableContainer
      className={styles.workspaceListsWrapper}
      scrollBarClassName={styles.scrollbar}
    >
      <div>
        {servers.map(server => (
          <FrameworkScope key={server.id} scope={server.scope}>
            <CloudWorkSpaceList
              server={server}
              workspaces={cloudWorkspaces.filter(
                ({ flavour }) => flavour === server.id
              )}
              onClickWorkspace={handleClickWorkspace}
              onClickWorkspaceSetting={
                showSettingsButton ? onClickWorkspaceSetting : undefined
              }
            />
            <Divider size="thinner" />
          </FrameworkScope>
        ))}
      </div>
      <LocalWorkspaces
        workspaces={localWorkspaces}
        onClickWorkspace={handleClickWorkspace}
        onClickWorkspaceSetting={
          showSettingsButton ? onClickWorkspaceSetting : undefined
        }
        onClickEnableCloud={
          showEnableCloudButton ? onClickEnableCloud : undefined
        }
      />
    </ScrollableContainer>
  );
};

interface WorkspaceListProps {
  items: WorkspaceMetadata[];
  onClick: (workspace: WorkspaceMetadata) => void;
  onSettingClick?: (workspace: WorkspaceMetadata) => void;
  onEnableCloudClick?: (meta: WorkspaceMetadata) => void;
}

interface SortableWorkspaceItemProps extends Omit<WorkspaceListProps, 'items'> {
  workspaceMetadata: WorkspaceMetadata;
}

const SortableWorkspaceItem = ({
  workspaceMetadata,
  onClick,
  onSettingClick,
  onEnableCloudClick,
}: SortableWorkspaceItemProps) => {
  const handleClick = useCallback(() => {
    onClick(workspaceMetadata);
  }, [onClick, workspaceMetadata]);

  const currentWorkspace = useServiceOptional(WorkspaceService)?.workspace;

  return (
    <WorkspaceCard
      className={styles.workspaceCard}
      workspaceMetadata={workspaceMetadata}
      onClick={handleClick}
      avatarSize={28}
      active={currentWorkspace?.id === workspaceMetadata.id}
      onClickOpenSettings={onSettingClick}
      onClickEnableCloud={onEnableCloudClick}
    />
  );
};

export const WorkspaceList = (props: WorkspaceListProps) => {
  const workspaceList = props.items;

  return workspaceList.map(item => (
    <SortableWorkspaceItem key={item.id} {...props} workspaceMetadata={item} />
  ));
};
