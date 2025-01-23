import { ShadowlessElement } from '@blocksuite/block-std';
import { WithDisposable } from '@blocksuite/global/utils';
import { CloseIcon, SortIcon } from '@blocksuite/icons/lit';
import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';

import * as styles from './outline-notice.css';

export const AFFINE_OUTLINE_NOTICE = 'affine-outline-notice';

export class OutlineNotice extends WithDisposable(ShadowlessElement) {
  private _handleNoticeButtonClick() {
    this.toggleNotesSorting();
    this.setNoticeVisibility(false);
  }

  override render() {
    if (!this.noticeVisible) {
      return nothing;
    }

    return html`
      <div class=${styles.outlineNotice}>
        <div class=${styles.outlineNoticeHeader}>
          <span class=${styles.outlineNoticeLabel}>SOME CONTENTS HIDDEN</span>
          <span
            class=${styles.outlineNoticeCloseButton}
            @click=${() => this.setNoticeVisibility(false)}
            >${CloseIcon({ width: '16px', height: '16px' })}</span
          >
        </div>
        <div class=${styles.outlineNoticeBody}>
          <div class="${styles.notice}">
            Some contents are not visible on edgeless.
          </div>
          <div class="${styles.button}" @click=${this._handleNoticeButtonClick}>
            <span class=${styles.buttonSpan}>Click here or</span>
            <span class=${styles.buttonSpan}
              >${SortIcon({ width: '20px', height: '20px' })}</span
            >
            <span class=${styles.buttonSpan}>to organize content.</span>
          </div>
        </div>
      </div>
    `;
  }

  @property({ attribute: false })
  accessor noticeVisible!: boolean;

  @property({ attribute: false })
  accessor setNoticeVisibility!: (visibility: boolean) => void;

  @property({ attribute: false })
  accessor toggleNotesSorting!: () => void;
}

declare global {
  interface HTMLElementTagNameMap {
    [AFFINE_OUTLINE_NOTICE]: OutlineNotice;
  }
}
