import type { BlockComponent, EditorHost } from '@blocksuite/affine/block-std';
import type { GfxModel } from '@blocksuite/affine/block-std/gfx';
import {
  matchModels,
  MindmapElementModel,
  NoteBlockModel,
  RootBlockModel,
  type ShapeElementModel,
  SurfaceBlockModel,
} from '@blocksuite/affine/blocks';

import {
  AFFINE_EDGELESS_COPILOT_WIDGET,
  type EdgelessCopilotWidget,
} from '../widgets/edgeless-copilot';

export function mindMapToMarkdown(mindmap: MindmapElementModel) {
  let markdownStr = '';

  const traverse = (
    node: MindmapElementModel['tree']['children'][number],
    indent: number = 0
  ) => {
    const text = (node.element as ShapeElementModel).text?.toString() ?? '';

    markdownStr += `${'  '.repeat(indent)}- ${text}\n`;

    if (node.children) {
      node.children.forEach(node => traverse(node, indent + 2));
    }
  };

  traverse(mindmap.tree, 0);

  return markdownStr;
}

export function isMindMapRoot(ele: GfxModel) {
  const group = ele?.group;

  return group instanceof MindmapElementModel && group.tree.element === ele;
}

export function isMindmapChild(ele: GfxModel) {
  return ele?.group instanceof MindmapElementModel && !isMindMapRoot(ele);
}

export function getEdgelessCopilotWidget(
  host: EditorHost
): EdgelessCopilotWidget {
  const rootBlockId = host.doc.root?.id as string;
  const copilotWidget = host.view.getWidget(
    AFFINE_EDGELESS_COPILOT_WIDGET,
    rootBlockId
  ) as EdgelessCopilotWidget;

  return copilotWidget;
}

export function findNoteBlockModel(blockElement: BlockComponent) {
  let curBlock = blockElement;
  while (curBlock) {
    if (matchModels(curBlock.model, [NoteBlockModel])) {
      return curBlock.model;
    }
    if (matchModels(curBlock.model, [RootBlockModel, SurfaceBlockModel])) {
      return null;
    }
    if (!curBlock.parentComponent) {
      break;
    }
    curBlock = curBlock.parentComponent;
  }
  return null;
}
