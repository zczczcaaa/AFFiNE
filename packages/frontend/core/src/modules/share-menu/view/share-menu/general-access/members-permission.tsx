import { Menu, MenuItem, MenuTrigger, Tooltip } from '@affine/component';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { DocGrantedUsersService } from '@affine/core/modules/permissions';
import { ShareInfoService } from '@affine/core/modules/share-doc';
import { DocRole } from '@affine/graphql';
import { useI18n } from '@affine/i18n';
import { track } from '@affine/track';
import { InformationIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import { useCallback, useMemo } from 'react';

import { PlanTag } from '../plan-tag';
import * as styles from './styles.css';

const getRoleName = (t: ReturnType<typeof useI18n>, role?: DocRole) => {
  switch (role) {
    case DocRole.Manager:
      return t['com.affine.share-menu.option.permission.can-manage']();
    case DocRole.Editor:
      return t['com.affine.share-menu.option.permission.can-edit']();
    case DocRole.Reader:
      return t['com.affine.share-menu.option.permission.can-read']();
    default:
      return '';
  }
};

export const MembersPermission = ({
  openPaywallModal,
  hittingPaywall,
  disabled,
}: {
  hittingPaywall: boolean;
  openPaywallModal?: () => void;
  disabled?: boolean;
}) => {
  const t = useI18n();
  const shareInfoService = useService(ShareInfoService);
  const docGrantedUsersService = useService(DocGrantedUsersService);
  const docDefaultRole = useLiveData(
    shareInfoService.shareInfo.info$
  )?.defaultRole;
  const currentRoleName = useMemo(
    () => getRoleName(t, docDefaultRole),
    [docDefaultRole, t]
  );
  const showTips =
    docDefaultRole === DocRole.Reader || docDefaultRole === DocRole.Editor;
  const changePermission = useCallback(
    async (docRole: DocRole) => {
      track.$.sharePanel.$.modifyDocDefaultRole();
      await docGrantedUsersService.updateDocDefaultRole(docRole);
      shareInfoService.shareInfo.revalidate();
    },
    [docGrantedUsersService, shareInfoService.shareInfo]
  );

  const selectManage = useAsyncCallback(async () => {
    await changePermission(DocRole.Manager);
  }, [changePermission]);

  const selectEdit = useAsyncCallback(async () => {
    if (hittingPaywall) {
      openPaywallModal?.();
      return;
    }
    await changePermission(DocRole.Editor);
  }, [changePermission, hittingPaywall, openPaywallModal]);

  const selectRead = useAsyncCallback(async () => {
    if (hittingPaywall) {
      openPaywallModal?.();
      return;
    }
    await changePermission(DocRole.Reader);
  }, [changePermission, hittingPaywall, openPaywallModal]);

  return (
    <div className={styles.rowContainerStyle}>
      <div className={styles.labelStyle}>
        {t['com.affine.share-menu.option.permission.label']()}
      </div>
      {disabled ? (
        <div className={clsx(styles.menuTriggerStyle, 'disable')}>
          {showTips ? <Tips disable={disabled} /> : null} {currentRoleName}
        </div>
      ) : (
        <Menu
          contentOptions={{
            align: 'end',
          }}
          items={
            <>
              <MenuItem
                onSelect={selectManage}
                selected={docDefaultRole === DocRole.Manager}
              >
                <div className={styles.publicItemRowStyle}>
                  {t['com.affine.share-menu.option.permission.can-manage']()}
                </div>
              </MenuItem>
              <MenuItem
                onSelect={selectEdit}
                selected={docDefaultRole === DocRole.Editor}
              >
                <div className={styles.publicItemRowStyle}>
                  <div className={styles.tagContainerStyle}>
                    {t['com.affine.share-menu.option.permission.can-edit']()}
                    {hittingPaywall ? <PlanTag /> : null}
                  </div>
                </div>
              </MenuItem>
              <MenuItem
                onSelect={selectRead}
                selected={docDefaultRole === DocRole.Reader}
              >
                <div className={styles.publicItemRowStyle}>
                  <div className={styles.tagContainerStyle}>
                    {t['com.affine.share-menu.option.permission.can-read']()}
                    {hittingPaywall ? <PlanTag /> : null}
                  </div>
                </div>
              </MenuItem>
            </>
          }
        >
          <MenuTrigger
            className={styles.menuTriggerStyle}
            variant="plain"
            contentStyle={{
              width: '100%',
            }}
            prefix={showTips ? <Tips /> : undefined}
          >
            {currentRoleName}
          </MenuTrigger>
        </Menu>
      )}
    </div>
  );
};

export const Tips = ({ disable }: { disable?: boolean }) => {
  const t = useI18n();

  return (
    <Tooltip content={t['com.affine.share-menu.option.permission.tips']()}>
      <InformationIcon
        className={clsx(styles.informationIcon, {
          disable: disable,
        })}
      />
    </Tooltip>
  );
};
