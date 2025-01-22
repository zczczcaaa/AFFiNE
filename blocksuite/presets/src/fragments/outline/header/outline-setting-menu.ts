import { ShadowlessElement } from '@blocksuite/block-std';
import { WithDisposable } from '@blocksuite/global/utils';
import { html } from 'lit';
import { property } from 'lit/decorators.js';

import * as styles from './outline-setting-menu.css';

export const AFFINE_OUTLINE_NOTE_PREVIEW_SETTING_MENU =
  'affine-outline-note-preview-setting-menu';

export class OutlineNotePreviewSettingMenu extends WithDisposable(
  ShadowlessElement
) {
  override render() {
    return html`<div
      class=${styles.notePreviewSettingMenuContainer}
      @click=${(e: MouseEvent) => e.stopPropagation()}
    >
      <div class=${styles.notePreviewSettingMenuItem}>
        <div class=${styles.settingLabel}>Settings</div>
      </div>
      <div class="${styles.notePreviewSettingMenuItem} ${styles.action}">
        <div class=${styles.actionLabel}>Show type icon</div>
        <div class=${styles.toggleButton}>
          <toggle-switch
            .on=${this.showPreviewIcon}
            .onChange=${this.toggleShowPreviewIcon}
          ></toggle-switch>
        </div>
      </div>
    </div>`;
  }

  @property({ attribute: false })
  accessor showPreviewIcon!: boolean;

  @property({ attribute: false })
  accessor toggleShowPreviewIcon!: (on: boolean) => void;
}

declare global {
  interface HTMLElementTagNameMap {
    [AFFINE_OUTLINE_NOTE_PREVIEW_SETTING_MENU]: OutlineNotePreviewSettingMenu;
  }
}
