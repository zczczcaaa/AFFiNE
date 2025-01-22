import {
  PropTypes,
  requiredProperties,
  ShadowlessElement,
} from '@blocksuite/block-std';
import { SignalWatcher, WithDisposable } from '@blocksuite/global/utils';
import { provide } from '@lit/context';
import { effect } from '@preact/signals-core';
import { html, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';

import type { AffineEditorContainer } from '../../editors/editor-container.js';
import {
  editorContext,
  type OutlineSettingsDataType,
  outlineSettingsKey,
} from './config.js';
import * as styles from './outline-panel.css';

export const AFFINE_OUTLINE_PANEL = 'affine-outline-panel';

@requiredProperties({
  editor: PropTypes.object,
})
export class OutlinePanel extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  private readonly _setNoticeVisibility = (visibility: boolean) => {
    this._noticeVisible = visibility;
  };

  private _settings: OutlineSettingsDataType = {
    showIcons: false,
    enableSorting: false,
  };

  private readonly _toggleNotesSorting = () => {
    this._enableNotesSorting = !this._enableNotesSorting;
    this._updateAndSaveSettings({ enableSorting: this._enableNotesSorting });
  };

  private readonly _toggleShowPreviewIcon = (on: boolean) => {
    this._showPreviewIcon = on;
    this._updateAndSaveSettings({ showIcons: on });
  };

  get doc() {
    return this.editor.doc;
  }

  get host() {
    return this.editor.host;
  }

  get mode() {
    return this.editor.mode;
  }

  private _loadSettingsFromLocalStorage() {
    const settings = localStorage.getItem(outlineSettingsKey);
    if (settings) {
      this._settings = JSON.parse(settings);
      this._showPreviewIcon = this._settings.showIcons;
      this._enableNotesSorting = this._settings.enableSorting;
    }
  }

  private _saveSettingsToLocalStorage() {
    localStorage.setItem(outlineSettingsKey, JSON.stringify(this._settings));
  }

  private _updateAndSaveSettings(
    newSettings: Partial<OutlineSettingsDataType>
  ) {
    this._settings = { ...this._settings, ...newSettings };
    this._saveSettingsToLocalStorage();
  }

  override connectedCallback() {
    super.connectedCallback();
    this.classList.add(styles.outlinePanel);

    this.disposables.add(
      effect(() => {
        if (this.editor.mode === 'edgeless') {
          this._enableNotesSorting = true;
        } else {
          this._loadSettingsFromLocalStorage();
        }
      })
    );
  }

  override willUpdate(_changedProperties: PropertyValues): void {
    if (_changedProperties.has('editor')) {
      if (this.editor.mode === 'edgeless') {
        this._enableNotesSorting = true;
      } else {
        this._loadSettingsFromLocalStorage();
      }
    }
  }

  override render() {
    if (!this.host) return;

    return html`
      <affine-outline-panel-header
        .showPreviewIcon=${this._showPreviewIcon}
        .enableNotesSorting=${this._enableNotesSorting}
        .toggleShowPreviewIcon=${this._toggleShowPreviewIcon}
        .toggleNotesSorting=${this._toggleNotesSorting}
      ></affine-outline-panel-header>
      <affine-outline-panel-body
        .fitPadding=${this.fitPadding}
        .mode=${this.mode}
        .showPreviewIcon=${this._showPreviewIcon}
        .enableNotesSorting=${this._enableNotesSorting}
        .toggleNotesSorting=${this._toggleNotesSorting}
        .noticeVisible=${this._noticeVisible}
        .setNoticeVisibility=${this._setNoticeVisibility}
      >
      </affine-outline-panel-body>
      <affine-outline-notice
        .noticeVisible=${this._noticeVisible}
        .toggleNotesSorting=${this._toggleNotesSorting}
        .setNoticeVisibility=${this._setNoticeVisibility}
      ></affine-outline-notice>
    `;
  }

  @state()
  private accessor _enableNotesSorting = false;

  @state()
  private accessor _noticeVisible = false;

  @state()
  private accessor _showPreviewIcon = false;

  @provide({ context: editorContext })
  @property({ attribute: false })
  accessor editor!: AffineEditorContainer;

  @property({ attribute: false })
  accessor fitPadding!: number[];
}

declare global {
  interface HTMLElementTagNameMap {
    [AFFINE_OUTLINE_PANEL]: OutlinePanel;
  }
}
