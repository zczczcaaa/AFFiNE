import type {
  BlockSelection,
  EditorHost,
  TextSelection,
} from '@blocksuite/affine/block-std';
import {
  createButtonPopper,
  NotificationProvider,
  Tooltip,
  unsafeCSSVarV2,
} from '@blocksuite/affine/blocks';
import { noop, WithDisposable } from '@blocksuite/affine/global/utils';
import { CopyIcon, MoreHorizontalIcon, ResetIcon } from '@blocksuite/icons/lit';
import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import type { ChatAction } from '../_common/chat-actions-handle';
import { copyText } from '../utils/editor-actions';

noop(Tooltip);

export class ChatCopyMore extends WithDisposable(LitElement) {
  static override styles = css`
    .copy-more {
      display: flex;
      gap: 8px;
      height: 36px;
      box-sizing: border-box;
      justify-content: flex-end;
      align-items: center;
      padding: 8px 0;

      div {
        cursor: pointer;
        border-radius: 4px;
      }

      div:hover {
        background-color: var(--affine-hover-color);
      }

      .button {
        display: flex;
        align-items: center;
        justify-content: center;

        svg {
          color: ${unsafeCSSVarV2('icon/primary')};
        }
      }
    }

    .more-menu {
      width: 226px;
      border-radius: 8px;
      background-color: var(--affine-background-overlay-panel-color);
      box-shadow: var(--affine-menu-shadow);
      display: flex;
      flex-direction: column;
      gap: 4px;
      position: absolute;
      z-index: 1;
      user-select: none;

      > div {
        height: 30px;
        display: flex;
        gap: 8px;
        align-items: center;
        cursor: pointer;

        svg {
          margin-left: 12px;
        }
      }

      > div:hover {
        background-color: var(--affine-hover-color);
      }
    }
  `;

  private get _selectionValue() {
    return this.host.selection.value;
  }

  private get _currentTextSelection(): TextSelection | undefined {
    return this._selectionValue.find(v => v.type === 'text') as TextSelection;
  }

  private get _currentBlockSelections(): BlockSelection[] | undefined {
    return this._selectionValue.filter(v => v.type === 'block');
  }

  @state()
  private accessor _showMoreMenu = false;

  @query('.button.more')
  private accessor _moreButton!: HTMLDivElement;

  @query('.more-menu')
  private accessor _moreMenu!: HTMLDivElement;

  private _morePopper: ReturnType<typeof createButtonPopper> | null = null;

  @property({ attribute: false })
  accessor host!: EditorHost;

  @property({ attribute: false })
  accessor actions: ChatAction[] = [];

  @property({ attribute: false })
  accessor content!: string;

  @property({ attribute: false })
  accessor getSessionId!: () => Promise<string | undefined>;

  @property({ attribute: false })
  accessor messageId: string | undefined = undefined;

  @property({ attribute: false })
  accessor isLast!: boolean;

  @property({ attribute: false })
  accessor withMargin = false;

  @property({ attribute: false })
  accessor retry = () => {};

  private _toggle() {
    this._morePopper?.toggle();
  }

  private readonly _notifySuccess = (title: string) => {
    const notificationService = this.host.std.getOptional(NotificationProvider);
    notificationService?.notify({
      title: title,
      accent: 'success',
      onClose: function (): void {},
    });
  };

  protected override updated(changed: PropertyValues): void {
    if (changed.has('isLast')) {
      if (this.isLast) {
        this._morePopper?.dispose();
        this._morePopper = null;
      } else if (!this._morePopper) {
        this._morePopper = createButtonPopper(
          this._moreButton,
          this._moreMenu,
          ({ display }) => (this._showMoreMenu = display === 'show'),
          {
            mainAxis: 0,
            crossAxis: -100,
          }
        );
      }
    }
  }

  override render() {
    const { host, content, isLast, messageId, actions } = this;
    return html`<style>
        .copy-more {
          margin-top: ${this.withMargin ? '8px' : '0px'};
          margin-bottom: ${this.withMargin ? '12px' : '0px'};
        }
        .more-menu {
          padding: ${this._showMoreMenu ? '8px' : '0px'};
        }
      </style>
      <div class="copy-more">
        ${content
          ? html`<div
              class="button copy"
              @click=${async () => {
                const success = await copyText(host, content);
                if (success) {
                  this._notifySuccess('Copied to clipboard');
                }
              }}
              data-testid="action-copy-button"
            >
              ${CopyIcon({ width: '20px', height: '20px' })}
              <affine-tooltip>Copy</affine-tooltip>
            </div>`
          : nothing}
        ${isLast
          ? html`<div
              class="button retry"
              @click=${() => this.retry()}
              data-testid="action-retry-button"
            >
              ${ResetIcon({ width: '20px', height: '20px' })}
              <affine-tooltip .autoShift=${true}>Retry</affine-tooltip>
            </div>`
          : nothing}
        ${isLast
          ? nothing
          : html`<div class="button more" @click=${this._toggle}>
              ${MoreHorizontalIcon({ width: '20px', height: '20px' })}
            </div> `}
      </div>

      <div class="more-menu">
        ${this._showMoreMenu
          ? repeat(
              actions.filter(action => action.showWhen(host)),
              action => action.title,
              action => {
                const currentSelections = {
                  text: this._currentTextSelection,
                  blocks: this._currentBlockSelections,
                };
                return html`<div
                  @click=${async () => {
                    const sessionId = await this.getSessionId();
                    const success = await action.handler(
                      host,
                      content,
                      currentSelections,
                      sessionId,
                      messageId
                    );

                    if (success) {
                      this._notifySuccess(action.toast);
                    }
                  }}
                >
                  ${action.icon}
                  <div>${action.title}</div>
                </div>`;
              }
            )
          : nothing}
      </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-copy-more': ChatCopyMore;
  }
}
