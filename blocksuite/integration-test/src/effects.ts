import '@blocksuite/blocks/effects';

import { TestAffineEditorContainer } from './editors/index.js';

export function effects() {
  customElements.define('affine-editor-container', TestAffineEditorContainer);
}
