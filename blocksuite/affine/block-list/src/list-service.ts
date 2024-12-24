import { ListBlockSchema } from '@blocksuite/affine-model';
import { BlockService } from '@blocksuite/block-std';

export class ListBlockService extends BlockService {
  static override readonly flavour = ListBlockSchema.model.flavour;
}
