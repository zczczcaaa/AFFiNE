import type {
  BrushElementModel,
  ConnectorElementModel,
  DocMode,
  GroupElementModel,
} from '@blocksuite/affine-model';
import type { Slot } from '@blocksuite/global/utils';
import type { Blocks } from '@blocksuite/store';

/** Common context interface definition for block models. */

type EditorSlots = {
  docUpdated: Slot<{ newDocId: string }>;
};

export type AbstractEditor = {
  doc: Blocks;
  mode: DocMode;
  readonly slots: EditorSlots;
} & HTMLElement;

export type Connectable = Exclude<
  BlockSuite.EdgelessModel,
  ConnectorElementModel | BrushElementModel | GroupElementModel
>;
