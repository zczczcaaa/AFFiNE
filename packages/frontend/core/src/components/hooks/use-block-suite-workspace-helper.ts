import type { Blocks, Workspace } from '@blocksuite/affine/store';
import { useMemo } from 'react';

export function useDocCollectionHelper(docCollection: Workspace) {
  return useMemo(
    () => ({
      createDoc: (pageId?: string): Blocks => {
        return docCollection.createDoc({ id: pageId });
      },
    }),
    [docCollection]
  );
}
