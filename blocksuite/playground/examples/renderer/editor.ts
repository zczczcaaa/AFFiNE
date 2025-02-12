import '../../style.css';

import { ViewportTurboRendererExtension } from '@blocksuite/affine-shared/viewport-renderer';
import { effects as blocksEffects } from '@blocksuite/blocks/effects';
import { AffineEditorContainer } from '@blocksuite/presets';
import { effects as presetsEffects } from '@blocksuite/presets/effects';

import { createEmptyDoc } from '../../apps/_common/helper';

blocksEffects();
presetsEffects();

export const { doc } = createEmptyDoc();
export const editor = new AffineEditorContainer();

editor.edgelessSpecs = [
  ...editor.edgelessSpecs,
  ViewportTurboRendererExtension,
];

editor.doc = doc;
editor.mode = 'edgeless';
