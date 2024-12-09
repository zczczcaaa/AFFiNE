import { usePageHelper } from '@affine/core/components/blocksuite/block-suite-page-list/utils';
import track from '@affine/track';
import { EditIcon } from '@blocksuite/icons/rc';
import { useService, WorkspaceService } from '@toeverything/infra';
import { useCallback } from 'react';

import type { AppTabCustomFCProps } from './data';
import { TabItem } from './tab-item';

export const AppTabCreate = ({ tab }: AppTabCustomFCProps) => {
  const workspaceService = useService(WorkspaceService);
  const currentWorkspace = workspaceService.workspace;
  const pageHelper = usePageHelper(currentWorkspace.docCollection);

  const createPage = useCallback(
    (isActive: boolean) => {
      if (isActive) return;
      pageHelper.createPage(undefined, true);
      track.$.navigationPanel.$.createDoc();
    },
    [pageHelper]
  );

  return (
    <TabItem id={tab.key} onClick={createPage} label="New Page">
      <EditIcon />
    </TabItem>
  );
};
