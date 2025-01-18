import {
  type EditorHost,
  ShadowlessElement,
} from '@blocksuite/affine/block-std';
import { SignalWatcher, WithDisposable } from '@blocksuite/affine/global/utils';
import { Signal } from '@preact/signals-core';
import { html } from 'lit';
import { property } from 'lit/decorators.js';

import { extractMarkdownFromDoc } from '../../utils/extract';
import type { DocDisplayConfig } from '../chat-config';
import type { ChatContextValue, DocChip } from '../chat-context';
import { getChipIcon, getChipTooltip, isDocChip } from './utils';

export class ChatPanelDocChip extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  @property({ attribute: false })
  accessor chip!: DocChip;

  @property({ attribute: false })
  accessor docDisplayConfig!: DocDisplayConfig;

  @property({ attribute: false })
  accessor host!: EditorHost;

  @property({ attribute: false })
  accessor chatContextValue!: ChatContextValue;

  @property({ attribute: false })
  accessor updateContext!: (context: Partial<ChatContextValue>) => void;

  private name = new Signal<string>('');

  private cleanup?: () => any;

  override connectedCallback() {
    super.connectedCallback();
    const { signal, cleanup } = this.docDisplayConfig.getTitle(this.chip.docId);
    this.name = signal;
    this.cleanup = cleanup;
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup?.();
  }

  private readonly onChipClick = () => {
    if (this.chip.state === 'candidate') {
      const doc = this.docDisplayConfig.getDoc(this.chip.docId);
      if (!doc) {
        return;
      }
      this.updateChipContext({
        state: 'embedding',
      });
      extractMarkdownFromDoc(doc, this.host.std.provider)
        .then(result => {
          this.updateChipContext({
            state: 'success',
          });
          this.updateContext({
            docs: [...this.chatContextValue.docs, result],
          });
        })
        .catch(e => {
          this.updateChipContext({
            state: 'failed',
            tooltip: e.message,
          });
        });
    }
  };

  private updateChipContext(options: Partial<DocChip>) {
    const index = this.chatContextValue.chips.findIndex(item => {
      return isDocChip(item) && item.docId === this.chip.docId;
    });
    const nextChip: DocChip = {
      ...this.chip,
      ...options,
    };
    this.updateContext({
      chips: [
        ...this.chatContextValue.chips.slice(0, index),
        nextChip,
        ...this.chatContextValue.chips.slice(index + 1),
      ],
    });
  }

  private readonly onChipDelete = () => {
    if (this.chip.state === 'success') {
      this.updateContext({
        docs: this.chatContextValue.docs.filter(
          doc => doc.docId !== this.chip.docId
        ),
      });
    }

    this.updateContext({
      chips: this.chatContextValue.chips.filter(
        chip => isDocChip(chip) && chip.docId !== this.chip.docId
      ),
    });
  };

  override render() {
    const { state, docId } = this.chip;
    const isLoading = state === 'embedding' || state === 'uploading';
    const getIcon = this.docDisplayConfig.getIcon(docId);
    const docIcon = typeof getIcon === 'function' ? getIcon() : getIcon;
    const icon = getChipIcon(state, docIcon);
    const tooltip = getChipTooltip(state, this.name.value, this.chip.tooltip);

    return html`<chat-panel-chip
      .state=${state}
      .name=${this.name.value}
      .tooltip=${tooltip}
      .icon=${icon}
      .closeable=${!isLoading}
      .onChipClick=${this.onChipClick}
      .onChipDelete=${this.onChipDelete}
    ></chat-panel-chip>`;
  }
}
