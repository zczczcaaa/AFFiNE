import { WorkspaceListSkeleton } from '@affine/component/setting-components';
import { Avatar } from '@affine/component/ui/avatar';
import { UserPlanButton } from '@affine/core/components/affine/auth/user-plan-button';
import { useCatchEventCallback } from '@affine/core/components/hooks/use-catch-event-hook';
import { useWorkspaceInfo } from '@affine/core/components/hooks/use-workspace-info';
import { CurrentWorkspaceScopeProvider } from '@affine/core/components/providers/current-workspace-scope';
import { AuthService } from '@affine/core/modules/cloud';
import { UserFeatureService } from '@affine/core/modules/cloud/services/user-feature';
import { GlobalDialogService } from '@affine/core/modules/dialogs';
import type { SettingTab } from '@affine/core/modules/dialogs/constant';
import {
  type WorkspaceMetadata,
  WorkspaceService,
} from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import {
  Logo1Icon,
  PaymentIcon,
  PropertyIcon,
  SettingsIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useService, useServices } from '@toeverything/infra';
import clsx from 'clsx';
import {
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
} from 'react';

import { useGeneralSettingList } from '../general-setting';
import * as style from './style.css';

export type UserInfoProps = {
  onAccountSettingClick: () => void;
  onTabChange: (
    key: SettingTab,
    workspaceMetadata: WorkspaceMetadata | null
  ) => void;
  active?: boolean;
};

export const UserInfo = ({
  onAccountSettingClick,
  onTabChange,
  active,
}: UserInfoProps) => {
  const account = useLiveData(useService(AuthService).session.account$);

  const onClick = useCatchEventCallback(() => {
    onTabChange('plans', null);
  }, [onTabChange]);

  if (!account) {
    // TODO(@eyhn): loading ui
    return;
  }
  return (
    <div
      data-testid="user-info-card"
      className={clsx(style.accountButton, {
        active: active,
      })}
      onClick={onAccountSettingClick}
    >
      <Avatar
        size={28}
        rounded={2}
        name={account.label}
        url={account.avatar}
        className="avatar"
      />

      <div className="content">
        <div className="name-container">
          <div className="name" title={account.label}>
            {account.label}
          </div>
          <UserPlanButton onClick={onClick} />
        </div>

        <div className="email" title={account.email}>
          {account.email}
        </div>
      </div>
    </div>
  );
};

export const SignInButton = () => {
  const t = useI18n();
  const globalDialogService = useService(GlobalDialogService);

  return (
    <div
      className={style.accountButton}
      onClick={useCallback(() => {
        globalDialogService.open('sign-in', {});
      }, [globalDialogService])}
    >
      <div className="avatar not-sign">
        <Logo1Icon />
      </div>

      <div className="content">
        <div className="name" title={t['com.affine.settings.sign']()}>
          {t['com.affine.settings.sign']()}
        </div>
        <div className="email" title={t['com.affine.setting.sign.message']()}>
          {t['com.affine.setting.sign.message']()}
        </div>
      </div>
    </div>
  );
};

const SettingSidebarItem = ({
  isActive,
  icon,
  label,
  ...props
}: {
  isActive: boolean;
  label: string;
  icon: ReactNode;
} & HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      {...props}
      title={label}
      className={clsx(style.sidebarSelectItem, {
        active: isActive,
      })}
    >
      <div className={style.sidebarSelectItemIcon}>{icon}</div>
      <div className={style.sidebarSelectItemName}>{label}</div>
    </div>
  );
};

export const SettingSidebar = ({
  activeTab,
  onTabChange,
}: {
  activeTab: SettingTab;
  onTabChange: (key: SettingTab) => void;
}) => {
  const t = useI18n();
  const loginStatus = useLiveData(useService(AuthService).session.status$);
  const generalList = useGeneralSettingList();
  const gotoTab = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const tab = e.currentTarget.dataset.eventArg;
      if (!tab) return;
      track.$.settingsPanel.menu.openSettings({ to: tab });
      onTabChange(tab as SettingTab);
    },
    [onTabChange]
  );
  const onAccountSettingClick = useCallback(() => {
    track.$.settingsPanel.menu.openSettings({ to: 'account' });
    onTabChange('account');
  }, [onTabChange]);
  const onWorkspaceSettingClick = useCallback(
    (tab: SettingTab) => {
      track.$.settingsPanel.menu.openSettings({
        to: 'workspace',
        control: tab,
      });
      onTabChange(tab);
    },
    [onTabChange]
  );

  return (
    <div className={style.settingSlideBar} data-testid="settings-sidebar">
      <div className={style.sidebarTitle}>
        {t['com.affine.settingSidebar.title']()}
      </div>

      {loginStatus === 'unauthenticated' ? <SignInButton /> : null}
      {loginStatus === 'authenticated' ? (
        <Suspense>
          <UserInfo
            onAccountSettingClick={onAccountSettingClick}
            active={activeTab === 'account'}
            onTabChange={onTabChange}
          />
        </Suspense>
      ) : null}

      <div className={style.sidebarGroup}>
        <div className={style.sidebarSubtitle}>
          {t['com.affine.settingSidebar.settings.general']()}
        </div>
        <div className={style.sidebarItemsWrapper}>
          {generalList.map(({ title, icon, key, testId }) => {
            return (
              <SettingSidebarItem
                isActive={key === activeTab}
                key={key}
                label={title}
                data-event-arg={key}
                onClick={gotoTab}
                data-testid={testId}
                icon={icon}
              />
            );
          })}
        </div>
      </div>

      <div className={style.sidebarGroup}>
        <div className={style.sidebarSubtitle}>
          {t['com.affine.settingSidebar.settings.workspace']()}
        </div>
        <div className={style.sidebarItemsWrapper}>
          <Suspense fallback={<WorkspaceListSkeleton />}>
            <CurrentWorkspaceScopeProvider>
              <WorkspaceSettingItems
                onWorkspaceSettingClick={onWorkspaceSettingClick}
                activeTab={activeTab}
              />
            </CurrentWorkspaceScopeProvider>
          </Suspense>
        </div>
      </div>
    </div>
  );
};

const WorkspaceSettingItems = ({
  onWorkspaceSettingClick,
  activeTab,
}: {
  onWorkspaceSettingClick: (activeTab: SettingTab) => void;
  activeTab: SettingTab;
}) => {
  const { userFeatureService } = useServices({
    UserFeatureService,
  });

  const workspaceService = useService(WorkspaceService);
  const information = useWorkspaceInfo(workspaceService.workspace);

  const t = useI18n();

  useEffect(() => {
    userFeatureService.userFeature.revalidate();
  }, [userFeatureService]);

  const showBilling = information?.isTeam && information?.isOwner;
  const subTabs = useMemo(() => {
    const subTabConfigs = [
      {
        key: 'workspace:preference',
        title: 'com.affine.settings.workspace.preferences',
        icon: <SettingsIcon />,
      },
      {
        key: 'workspace:properties',
        title: 'com.affine.settings.workspace.properties',
        icon: <PropertyIcon />,
      },
      ...(showBilling
        ? [
            {
              key: 'workspace:billing' as SettingTab,
              title: 'com.affine.settings.workspace.billing',
              icon: <PaymentIcon />,
            },
          ]
        : []),
    ] satisfies {
      key: SettingTab;
      title: keyof ReturnType<typeof useI18n>;
      icon: ReactNode;
    }[];

    return subTabConfigs.map(({ key, title, icon }) => {
      return (
        <SettingSidebarItem
          isActive={activeTab === key}
          label={t[title]()}
          icon={icon}
          data-testid={`workspace-list-item-${key}`}
          onClick={() => {
            onWorkspaceSettingClick(key);
          }}
          className={clsx(style.sidebarSelectItem, {
            active: activeTab === key,
          })}
          key={key}
        />
      );
    });
  }, [activeTab, onWorkspaceSettingClick, showBilling, t]);

  return (
    <div className={style.sidebarItemsWrapper}>
      {/* TODO: remove the suspense? */}
      <Suspense fallback={<WorkspaceListSkeleton />}>{subTabs}</Suspense>
    </div>
  );
};
