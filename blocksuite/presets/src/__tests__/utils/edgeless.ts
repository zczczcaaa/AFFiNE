import type {
  EdgelessRootBlockComponent,
  PageRootBlockComponent,
  SurfaceBlockComponent,
} from '@blocksuite/blocks';
import type { Blocks } from '@blocksuite/store';

import type { AffineEditorContainer } from '../../index.js';

export function getSurface(doc: Blocks, editor: AffineEditorContainer) {
  const surfaceModel = doc.getBlockByFlavour('affine:surface');

  return editor.host!.view.getBlock(
    surfaceModel[0]!.id
  ) as SurfaceBlockComponent;
}

export function getDocRootBlock(
  doc: Blocks,
  editor: AffineEditorContainer,
  mode: 'page'
): PageRootBlockComponent;
export function getDocRootBlock(
  doc: Blocks,
  editor: AffineEditorContainer,
  mode: 'edgeless'
): EdgelessRootBlockComponent;
export function getDocRootBlock(
  doc: Blocks,
  editor: AffineEditorContainer,
  _?: 'edgeless' | 'page'
) {
  return editor.host!.view.getBlock(doc.root!.id) as
    | EdgelessRootBlockComponent
    | PageRootBlockComponent;
}

export function addNote(doc: Blocks, props: Record<string, any> = {}) {
  const noteId = doc.addBlock(
    'affine:note',
    {
      xywh: '[0, 0, 800, 100]',
      ...props,
    },
    doc.root
  );

  doc.addBlock('affine:paragraph', {}, noteId);

  return noteId;
}
