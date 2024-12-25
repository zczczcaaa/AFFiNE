import { focusTextModel } from '@blocksuite/affine-components/rich-text';
import {
  DEFAULT_NOTE_HEIGHT,
  DEFAULT_NOTE_WIDTH,
  NOTE_MIN_HEIGHT,
  type NoteBlockModel,
  NoteDisplayMode,
} from '@blocksuite/affine-model';
import { TelemetryProvider } from '@blocksuite/affine-shared/services';
import type { NoteChildrenFlavour } from '@blocksuite/affine-shared/types';
import { handleNativeRangeAtPoint } from '@blocksuite/affine-shared/utils';
import type { BlockStdScope } from '@blocksuite/block-std';
import { GfxControllerIdentifier } from '@blocksuite/block-std/gfx';
import {
  type IPoint,
  type Point,
  serializeXYWH,
} from '@blocksuite/global/utils';

import { DEFAULT_NOTE_OFFSET_X, DEFAULT_NOTE_OFFSET_Y } from './consts.js';
import { addBlock } from './crud.js';

export function addNoteAtPoint(
  std: BlockStdScope,
  /**
   * The point is in browser coordinate
   */
  point: IPoint,
  options: {
    width?: number;
    height?: number;
    parentId?: string;
    noteIndex?: number;
    offsetX?: number;
    offsetY?: number;
    scale?: number;
  } = {}
) {
  const gfx = std.get(GfxControllerIdentifier);
  const {
    width = DEFAULT_NOTE_WIDTH,
    height = DEFAULT_NOTE_HEIGHT,
    offsetX = DEFAULT_NOTE_OFFSET_X,
    offsetY = DEFAULT_NOTE_OFFSET_Y,
    parentId = gfx.doc.root?.id,
    noteIndex,
    scale = 1,
  } = options;
  const [x, y] = gfx.viewport.toModelCoord(point.x, point.y);
  const blockId = addBlock(
    std,
    'affine:note',
    {
      xywh: serializeXYWH(
        x - offsetX * scale,
        y - offsetY * scale,
        width,
        height
      ),
      displayMode: NoteDisplayMode.EdgelessOnly,
    },
    parentId,
    noteIndex
  );

  gfx.std.getOptional(TelemetryProvider)?.track('CanvasElementAdded', {
    control: 'canvas:draw',
    page: 'whiteboard editor',
    module: 'toolbar',
    segment: 'toolbar',
    type: 'note',
  });

  return blockId;
}

type NoteOptions = {
  childFlavour: NoteChildrenFlavour;
  childType: string | null;
  collapse: boolean;
};

export function addNote(
  std: BlockStdScope,
  point: Point,
  options: NoteOptions,
  width = DEFAULT_NOTE_WIDTH,
  height = DEFAULT_NOTE_HEIGHT
) {
  const noteId = addNoteAtPoint(std, point, {
    width,
    height,
  });

  const gfx = std.get(GfxControllerIdentifier);
  const doc = std.doc;

  const blockId = doc.addBlock(
    options.childFlavour,
    { type: options.childType },
    noteId
  );
  if (options.collapse && height > NOTE_MIN_HEIGHT) {
    const note = doc.getBlockById(noteId) as NoteBlockModel;
    doc.updateBlock(note, () => {
      note.edgeless.collapse = true;
      note.edgeless.collapsedHeight = height;
    });
  }
  gfx.tool.setTool('default');

  // Wait for edgelessTool updated
  requestAnimationFrame(() => {
    const blocks =
      (doc.root?.children.filter(
        child => child.flavour === 'affine:note'
      ) as BlockSuite.EdgelessBlockModelType[]) ?? [];
    const element = blocks.find(b => b.id === noteId);
    if (element) {
      gfx.selection.set({
        elements: [element.id],
        editing: true,
      });

      // Waiting dom updated, `note mask` is removed
      if (blockId) {
        focusTextModel(gfx.std, blockId);
      } else {
        // Cannot reuse `handleNativeRangeClick` directly here,
        // since `retargetClick` will re-target to pervious editor
        handleNativeRangeAtPoint(point.x, point.y);
      }
    }
  });
}