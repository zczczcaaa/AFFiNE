import '@blocksuite/affine-shared/commands';
import '@blocksuite/blocks/effects';

import {
  AffineEditorContainer,
  EdgelessEditor,
  PageEditor,
} from './editors/index.js';
import { CommentInput } from './fragments/comment/comment-input.js';
import { CommentPanel } from './fragments/index.js';

export function effects() {
  customElements.define('page-editor', PageEditor);
  customElements.define('comment-input', CommentInput);
  customElements.define('comment-panel', CommentPanel);
  customElements.define('affine-editor-container', AffineEditorContainer);
  customElements.define('edgeless-editor', EdgelessEditor);
}
