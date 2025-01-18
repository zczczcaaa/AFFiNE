import {
  type EditorHost,
  ShadowlessElement,
} from '@blocksuite/affine/block-std';
import { WithDisposable } from '@blocksuite/affine/global/utils';
import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import type { DocDisplayConfig } from './chat-config';
import type { ChatContextValue } from './chat-context';
import { getChipKey, isDocChip, isFileChip } from './components/utils';

export class ChatPanelChips extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    .chip-list {
      display: flex;
      flex-wrap: wrap;
    }
  `;

  @property({ attribute: false })
  accessor host!: EditorHost;

  @property({ attribute: false })
  accessor chatContextValue!: ChatContextValue;

  @property({ attribute: false })
  accessor updateContext!: (context: Partial<ChatContextValue>) => void;

  @property({ attribute: false })
  accessor docDisplayConfig!: DocDisplayConfig;

  override render() {
    return html`<div class="chip-list">
      ${repeat(
        this.chatContextValue.chips,
        chip => getChipKey(chip),
        chip => {
          if (isDocChip(chip)) {
            return html`<chat-panel-doc-chip
              .chip=${chip}
              .docDisplayConfig=${this.docDisplayConfig}
              .host=${this.host}
              .chatContextValue=${this.chatContextValue}
              .updateContext=${this.updateContext}
            ></chat-panel-doc-chip>`;
          }
          if (isFileChip(chip)) {
            return html`<chat-panel-file-chip
              .chip=${chip}
            ></chat-panel-file-chip>`;
          }
          return null;
        }
      )}
    </div>`;
  }
}
