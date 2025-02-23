import { registerAIEffects } from '@affine/core/blocksuite/ai/effects';
import { effects as editorEffects } from '@affine/core/blocksuite/editors';
import { effects as bsEffects } from '@blocksuite/affine/effects';

import { effects as edgelessEffects } from './specs/edgeless';
import { effects as patchEffects } from './specs/preview';

bsEffects();
patchEffects();
editorEffects();
edgelessEffects();
registerAIEffects();

export * from './blocksuite-editor';
export * from './blocksuite-editor-container';
