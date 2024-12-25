import { DocsService } from '@affine/core/modules/doc';
import { JournalService } from '@affine/core/modules/journal';
import { WorkspaceService } from '@affine/core/modules/workspace';
import type { DocCollection, DocMeta } from '@blocksuite/affine/store';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import { useCallback, useMemo } from 'react';

import { useAsyncCallback } from './affine-async-hooks';
import { useAllBlockSuiteDocMeta } from './use-all-block-suite-page-meta';

/**
 * Get pageMetas excluding journal pages without updatedDate
 * If you want to get all pageMetas, use `useAllBlockSuitePageMeta` instead
 * @returns
 */
export function useBlockSuiteDocMeta(docCollection: DocCollection) {
  const pageMetas = useAllBlockSuiteDocMeta(docCollection);
  const journalService = useService(JournalService);

  const journalIds = useLiveData(
    useMemo(
      () =>
        LiveData.computed(get =>
          pageMetas
            .map(meta => meta.id)
            .filter(id => !!get(journalService.journalDate$(id)))
        ),
      [pageMetas, journalService]
    )
  );

  return useMemo(
    () =>
      pageMetas.filter(
        pageMeta => !journalIds.includes(pageMeta.id) || !!pageMeta.updatedDate
      ),
    [journalIds, pageMetas]
  );
}

export function useDocMetaHelper() {
  const workspaceService = useService(WorkspaceService);
  const docsService = useService(DocsService);

  const setDocTitle = useAsyncCallback(
    async (docId: string, newTitle: string) => {
      await docsService.changeDocTitle(docId, newTitle);
    },
    [docsService]
  );

  const setDocMeta = useCallback(
    (docId: string, docMeta: Partial<DocMeta>) => {
      const doc = docsService.list.doc$(docId).value;
      if (doc) {
        doc.setMeta(docMeta);
      }
    },
    [docsService]
  );

  const getDocMeta = useCallback(
    (docId: string) => {
      const doc = docsService.list.doc$(docId).value;
      return doc?.meta$.value;
    },
    [docsService]
  );
  const setDocReadonly = useCallback(
    (docId: string, readonly: boolean) => {
      const doc = workspaceService.workspace.docCollection.getDoc(docId);
      if (doc?.blockCollection) {
        workspaceService.workspace.docCollection.awarenessStore.setReadonly(
          doc.blockCollection,
          readonly
        );
      }
    },
    [workspaceService]
  );

  return useMemo(
    () => ({
      setDocTitle,
      setDocMeta,
      getDocMeta,
      setDocReadonly,
    }),
    [getDocMeta, setDocMeta, setDocReadonly, setDocTitle]
  );
}
