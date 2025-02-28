import type { EditorHost } from '@blocksuite/affine/block-std';
import {
  GfxControllerIdentifier,
  isGfxGroupCompatibleModel,
} from '@blocksuite/affine/block-std/gfx';
import { AIStarIcon, sortEdgelessElements } from '@blocksuite/affine/blocks';
import { WithDisposable } from '@blocksuite/affine/global/utils';
import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import type { AIItemGroupConfig } from '../../components/ai-item/types';
import type { CopilotTool } from '../../tool/copilot-tool';

export class EdgelessCopilotToolbarEntry extends WithDisposable(LitElement) {
  static override styles = css`
    .copilot-icon-button {
      line-height: 20px;

      .label.medium {
        color: var(--affine-brand-color);
      }
    }
  `;

  private readonly _onClick = () => {
    this.onClick?.();
    this._showCopilotPanel();
  };

  private get _gfx() {
    return this.host.std.get(GfxControllerIdentifier);
  }

  private _showCopilotPanel() {
    const selectedElements = sortEdgelessElements(
      this._gfx.selection.selectedElements
    );
    const toBeSelected = new Set(selectedElements);

    selectedElements.forEach(element => {
      // its descendants are already selected
      if (toBeSelected.has(element)) return;

      toBeSelected.add(element);

      if (isGfxGroupCompatibleModel(element)) {
        element.descendantElements.forEach(descendant => {
          toBeSelected.add(descendant);
        });
      }
    });

    this._gfx.tool.setTool('copilot');
    (this._gfx.tool.currentTool$.peek() as CopilotTool).updateSelectionWith(
      Array.from(toBeSelected),
      10
    );
  }

  override render() {
    return html`<edgeless-tool-icon-button
      aria-label="Ask AI"
      class="copilot-icon-button"
      @click=${this._onClick}
    >
      ${AIStarIcon} <span class="label medium">Ask AI</span>
    </edgeless-tool-icon-button>`;
  }

  @property({ attribute: false })
  accessor groups!: AIItemGroupConfig[];

  @property({ attribute: false })
  accessor host!: EditorHost;

  @property({ attribute: false })
  accessor onClick: (() => void) | undefined = undefined;
}
