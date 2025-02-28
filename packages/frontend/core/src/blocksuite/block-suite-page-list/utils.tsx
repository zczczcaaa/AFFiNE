import { toast } from '@affine/component';
import type { DocProps } from '@affine/core/blocksuite/initialization';
import { AppSidebarService } from '@affine/core/modules/app-sidebar';
import { DocsService } from '@affine/core/modules/doc';
import { EditorSettingService } from '@affine/core/modules/editor-setting';
import { WorkbenchService } from '@affine/core/modules/workbench';
import { getAFFiNEWorkspaceSchema } from '@affine/core/modules/workspace';
import { type DocMode } from '@blocksuite/affine/blocks';
import type { Workspace } from '@blocksuite/affine/store';
import { useServices } from '@toeverything/infra';
import { useCallback, useMemo } from 'react';

export const usePageHelper = (docCollection: Workspace) => {
  const {
    docsService,
    workbenchService,
    editorSettingService,
    appSidebarService,
  } = useServices({
    DocsService,
    WorkbenchService,
    EditorSettingService,
    AppSidebarService,
  });
  const workbench = workbenchService.workbench;
  const docRecordList = docsService.list;
  const appSidebar = appSidebarService.sidebar;

  const createPageAndOpen = useCallback(
    (
      mode?: DocMode,
      options: {
        at?: 'new-tab' | 'tail' | 'active';
        show?: boolean;
      } = {
        at: 'active',
        show: true,
      }
    ) => {
      appSidebar.setHovering(false);
      const docProps: DocProps = {
        note: editorSettingService.editorSetting.get('affine:note'),
      };
      const page = docsService.createDoc({ docProps });

      if (mode) {
        docRecordList.doc$(page.id).value?.setPrimaryMode(mode);
      }

      if (options.show !== false) {
        workbench.openDoc(page.id, {
          at: options.at,
          show: options.show,
        });
      }
      return page;
    },
    [
      appSidebar,
      docRecordList,
      docsService,
      editorSettingService.editorSetting,
      workbench,
    ]
  );

  const createEdgelessAndOpen = useCallback(
    (
      options: {
        at?: 'new-tab' | 'tail' | 'active';
        show?: boolean;
      } = {
        at: 'active',
        show: true,
      }
    ) => {
      return createPageAndOpen('edgeless', options);
    },
    [createPageAndOpen]
  );

  const importFileAndOpen = useMemo(
    () => async () => {
      const { showImportModal } = await import('@blocksuite/affine/blocks');
      const { promise, resolve, reject } =
        Promise.withResolvers<
          Parameters<
            NonNullable<Parameters<typeof showImportModal>[0]['onSuccess']>
          >[1]
        >();
      const onSuccess = (
        pageIds: string[],
        options: { isWorkspaceFile: boolean; importedCount: number }
      ) => {
        resolve(options);
        toast(
          `Successfully imported ${options.importedCount} Page${
            options.importedCount > 1 ? 's' : ''
          }.`
        );
        if (options.isWorkspaceFile) {
          workbench.openAll();
          return;
        }

        if (pageIds.length === 0) {
          return;
        }
        const pageId = pageIds[0];
        workbench.openDoc(pageId);
      };
      showImportModal({
        collection: docCollection,
        schema: getAFFiNEWorkspaceSchema(),
        onSuccess,
        onFail: message => {
          reject(new Error(message));
        },
      });
      return await promise;
    },
    [docCollection, workbench]
  );

  return useMemo(() => {
    return {
      createPage: (
        mode?: DocMode,
        options?: {
          at?: 'new-tab' | 'tail' | 'active';
          show?: boolean;
        }
      ) => createPageAndOpen(mode, options),
      createEdgeless: createEdgelessAndOpen,
      importFile: importFileAndOpen,
    };
  }, [createEdgelessAndOpen, createPageAndOpen, importFileAndOpen]);
};
