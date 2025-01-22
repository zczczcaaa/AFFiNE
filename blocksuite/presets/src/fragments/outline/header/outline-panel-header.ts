import { ShadowlessElement } from '@blocksuite/block-std';
import { createButtonPopper } from '@blocksuite/blocks';
import { WithDisposable } from '@blocksuite/global/utils';
import { html } from 'lit';
import { property, query, state } from 'lit/decorators.js';

import { SettingsIcon, SortingIcon } from '../../_common/icons.js';
import * as styles from './outline-panel-header.css';

export const AFFINE_OUTLINE_PANEL_HEADER = 'affine-outline-panel-header';

export class OutlinePanelHeader extends WithDisposable(ShadowlessElement) {
  private _notePreviewSettingMenuPopper: ReturnType<
    typeof createButtonPopper
  > | null = null;

  override firstUpdated() {
    const _disposables = this._disposables;

    this._notePreviewSettingMenuPopper = createButtonPopper(
      this._noteSettingButton,
      this._notePreviewSettingMenu,
      ({ display }) => {
        this._settingPopperShow = display === 'show';
      },
      {
        mainAxis: 14,
        crossAxis: -30,
      }
    );
    _disposables.add(this._notePreviewSettingMenuPopper);
  }

  override render() {
    return html`<div class=${styles.container}>
        <div class=${styles.noteSettingContainer}>
          <span class=${styles.label}>Table of Contents</span>
          <edgeless-tool-icon-button
            class="${this._settingPopperShow ? 'active' : ''}"
            .tooltip=${this._settingPopperShow ? '' : 'Preview Settings'}
            .tipPosition=${'bottom'}
            .active=${this._settingPopperShow}
            .activeMode=${'background'}
            @click=${() => this._notePreviewSettingMenuPopper?.toggle()}
          >
            ${SettingsIcon}
          </edgeless-tool-icon-button>
        </div>
        <edgeless-tool-icon-button
          data-testid="toggle-notes-sorting-button"
          class="${this.enableNotesSorting ? 'active' : ''}"
          .tooltip=${'Visibility and sort'}
          .tipPosition=${'left'}
          .iconContainerPadding=${0}
          .active=${this.enableNotesSorting}
          .activeMode=${'color'}
          @click=${() => this.toggleNotesSorting()}
        >
          ${SortingIcon}
        </edgeless-tool-icon-button>
      </div>
      <div class=${styles.notePreviewSettingContainer}>
        <affine-outline-note-preview-setting-menu
          .showPreviewIcon=${this.showPreviewIcon}
          .toggleShowPreviewIcon=${this.toggleShowPreviewIcon}
        ></affine-outline-note-preview-setting-menu>
      </div>`;
  }

  @query(`.${styles.notePreviewSettingContainer}`)
  private accessor _notePreviewSettingMenu!: HTMLDivElement;

  @query(`.${styles.noteSettingContainer}`)
  private accessor _noteSettingButton!: HTMLDivElement;

  @state()
  private accessor _settingPopperShow = false;

  @property({ attribute: false })
  accessor enableNotesSorting!: boolean;

  @property({ attribute: false })
  accessor showPreviewIcon!: boolean;

  @property({ attribute: false })
  accessor toggleNotesSorting!: () => void;

  @property({ attribute: false })
  accessor toggleShowPreviewIcon!: (on: boolean) => void;
}

declare global {
  interface HTMLElementTagNameMap {
    [AFFINE_OUTLINE_PANEL_HEADER]: OutlinePanelHeader;
  }
}
