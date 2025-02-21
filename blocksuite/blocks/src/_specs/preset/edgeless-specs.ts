import { EdgelessBuiltInSpecs } from '@blocksuite/affine-block-root';
import type { ExtensionType } from '@blocksuite/store';

import { EdgelessFirstPartyBlockSpecs } from '../common';

export const EdgelessEditorBlockSpecs: ExtensionType[] = [
  EdgelessBuiltInSpecs,
  EdgelessFirstPartyBlockSpecs,
].flat();
