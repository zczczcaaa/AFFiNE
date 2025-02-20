import type {
  BrushElementModel,
  ConnectorElementModel,
  GroupElementModel,
} from '@blocksuite/affine-model';
import type { GfxModel } from '@blocksuite/block-std/gfx';

export type Connectable = Exclude<
  GfxModel,
  ConnectorElementModel | BrushElementModel | GroupElementModel
>;
