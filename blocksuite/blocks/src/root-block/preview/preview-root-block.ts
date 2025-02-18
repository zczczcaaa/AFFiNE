import { BlockComponent } from '@blocksuite/block-std';
import { css, html } from 'lit';

import { ReadOnlyClipboard } from '../clipboard/readonly-clipboard';

export class PreviewRootBlockComponent extends BlockComponent {
  static override styles = css`
    affine-preview-root {
      display: block;
      padding: 0 24px;
    }
  `;

  clipboardController = new ReadOnlyClipboard(this);

  override connectedCallback() {
    super.connectedCallback();
    this.clipboardController.hostConnected();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.clipboardController.hostDisconnected();
  }

  override renderBlock() {
    return html`<div class="affine-preview-root">
      ${this.host.renderChildren(this.model)}
    </div>`;
  }
}
