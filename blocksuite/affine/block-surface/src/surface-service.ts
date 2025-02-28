import { BlockService } from '@blocksuite/block-std';
import { GfxControllerIdentifier } from '@blocksuite/block-std/gfx';

import { type SurfaceBlockModel, SurfaceBlockSchema } from './surface-model.js';
import { getSurfaceBlock } from './utils/get-surface-block.js';

export class SurfaceBlockService extends BlockService {
  static override readonly flavour = SurfaceBlockSchema.model.flavour;

  surface!: SurfaceBlockModel;

  get layer() {
    return this.std.get(GfxControllerIdentifier).layer;
  }

  override mounted(): void {
    super.mounted();

    const surface = getSurfaceBlock(this.doc);

    // FIXME: BS-2271
    this.surface = surface!;

    if (!this.surface) {
      const disposable = this.doc.slots.blockUpdated.on(payload => {
        if (payload.flavour === 'affine:surface') {
          disposable.dispose();
          const surface = this.doc.getBlockById(
            payload.id
          ) as SurfaceBlockModel | null;
          if (!surface) return;
          this.surface = surface;
        }
      });
    }
  }
}
