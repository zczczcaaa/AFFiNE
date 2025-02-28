import type { GfxToolsFullOptionValue } from '@blocksuite/block-std/gfx';
import { PageIcon } from '@blocksuite/icons/lit';
import { effect } from '@preact/signals-core';
import { css, html, LitElement } from 'lit';
import { state } from 'lit/decorators.js';

import { getTooltipWithShortcut } from '../../../components/utils.js';
import type { NoteToolOption } from '../../../gfx-tool/note-tool.js';
import { createPopper, type MenuPopper } from '../common/create-popper.js';
import { QuickToolMixin } from '../mixins/quick-tool.mixin.js';
import type { EdgelessNoteMenu } from './note-menu.js';

export class EdgelessNoteToolButton extends QuickToolMixin(LitElement) {
  static override styles = css`
    :host {
      display: flex;
    }
  `;

  private _noteMenu: MenuPopper<EdgelessNoteMenu> | null = null;

  private readonly _states = ['childFlavour', 'childType', 'tip'] as const;

  override type: GfxToolsFullOptionValue['type'] = 'affine:note';

  private _disposeMenu() {
    this._noteMenu?.dispose();
    this._noteMenu = null;
  }

  private _toggleNoteMenu() {
    if (this._noteMenu) {
      this._disposeMenu();
      this.requestUpdate();
    } else {
      this.edgeless.gfx.tool.setTool('affine:note', {
        childFlavour: this.childFlavour,
        childType: this.childType,
        tip: this.tip,
      });
      this._noteMenu = createPopper('edgeless-note-menu', this);

      this._noteMenu.element.edgeless = this.edgeless;
      this._noteMenu.element.childFlavour = this.childFlavour;
      this._noteMenu.element.childType = this.childType;
      this._noteMenu.element.tip = this.tip;
      this._noteMenu.element.onChange = (
        props: Partial<{
          childFlavour: NoteToolOption['childFlavour'];
          childType: string | null;
          tip: string;
        }>
      ) => {
        this._states.forEach(key => {
          // oxlint-disable-next-line eqeqeq
          if (props[key] != undefined) {
            Object.assign(this, { [key]: props[key] });
          }
        });
        this.edgeless.gfx.tool.setTool('affine:note', {
          childFlavour: this.childFlavour,
          childType: this.childType,
          tip: this.tip,
        });
      };
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this._disposables.add(
      effect(() => {
        const value = this.edgeless.gfx.tool.currentToolName$.value;
        if (value !== 'affine:note') {
          this._disposeMenu();
        }
      })
    );
  }

  override disconnectedCallback() {
    this._disposeMenu();
    super.disconnectedCallback();
  }

  override render() {
    const { active } = this;
    return html`
      <edgeless-tool-icon-button
        class="edgeless-note-button"
        .tooltip=${this._noteMenu ? '' : getTooltipWithShortcut('Note', 'N')}
        .tooltipOffset=${17}
        .active=${active}
        .iconContainerPadding=${6}
        .iconSize=${'24px'}
        @click=${() => {
          this._toggleNoteMenu();
        }}
      >
        ${PageIcon()}
        <toolbar-arrow-up-icon></toolbar-arrow-up-icon>
      </edgeless-tool-icon-button>
    `;
  }

  @state()
  accessor childFlavour: NoteToolOption['childFlavour'] = 'affine:paragraph';

  @state()
  accessor childType = 'text';

  @state()
  accessor tip = 'Text';
}

declare global {
  interface HTMLElementTagNameMap {
    'edgeless-note-tool-button': EdgelessNoteToolButton;
  }
}
