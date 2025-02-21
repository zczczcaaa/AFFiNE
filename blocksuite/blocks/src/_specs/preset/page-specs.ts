import { PageRootBlockSpec } from '@blocksuite/affine-block-root';
import type { ExtensionType } from '@blocksuite/store';

import { PageFirstPartyBlockSpecs } from '../common.js';

export const PageEditorBlockSpecs: ExtensionType[] = [
  PageRootBlockSpec,
  ...PageFirstPartyBlockSpecs,
].flat();
