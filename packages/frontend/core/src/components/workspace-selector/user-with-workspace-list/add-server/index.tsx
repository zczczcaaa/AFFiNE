import { Divider, MenuItem } from '@affine/component';
import { GlobalDialogService } from '@affine/core/modules/dialogs';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import { useI18n } from '@affine/i18n';
import { PlusIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback } from 'react';

import {
  ItemContainer,
  ItemText,
  prefixIcon,
} from '../add-workspace/index.css';
import { addServerDividerWrapper } from './index.css';

export const AddServer = () => {
  const t = useI18n();
  const globalDialogService = useService(GlobalDialogService);
  const featureFlagService = useService(FeatureFlagService);
  const enableMultipleServer = useLiveData(
    featureFlagService.flags.enable_multiple_cloud_servers.$
  );

  const onAddServer = useCallback(() => {
    globalDialogService.open('sign-in', { step: 'addSelfhosted' });
  }, [globalDialogService]);

  if (!enableMultipleServer) {
    return null;
  }
  return (
    <>
      <div className={addServerDividerWrapper}>
        <Divider size="thinner" />
      </div>
      <MenuItem
        block={true}
        prefixIcon={<PlusIcon />}
        prefixIconClassName={prefixIcon}
        onClick={onAddServer}
        data-testid="new-server"
        className={ItemContainer}
      >
        <div className={ItemText}>
          {t['com.affine.workspaceList.addServer']()}
        </div>
      </MenuItem>
    </>
  );
};
