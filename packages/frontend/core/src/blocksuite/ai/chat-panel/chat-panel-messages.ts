import type { EditorHost } from '@blocksuite/affine/block-std';
import { ShadowlessElement } from '@blocksuite/affine/block-std';
import {
  DocModeProvider,
  FeatureFlagService,
  isInsidePageEditor,
  type SpecBuilder,
} from '@blocksuite/affine/blocks';
import { WithDisposable } from '@blocksuite/affine/global/utils';
import type { BaseSelection } from '@blocksuite/affine/store';
import { css, html, nothing } from 'lit';
import { property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';
import { debounce } from 'lodash-es';

import {
  EdgelessEditorActions,
  PageEditorActions,
} from '../_common/chat-actions-handle';
import { AffineAvatarIcon, AffineIcon, DownArrowIcon } from '../_common/icons';
import {
  type AIError,
  PaymentRequiredError,
  UnauthorizedError,
} from '../components/ai-item/types';
import { AIChatErrorRenderer } from '../messages/error';
import { AIProvider } from '../provider';
import {
  type ChatContextValue,
  type ChatItem,
  type ChatMessage,
  isChatMessage,
} from './chat-context';
import { HISTORY_IMAGE_ACTIONS } from './const';
import { AIPreloadConfig } from './preload-config';

export class ChatPanelMessages extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    chat-panel-messages {
      position: relative;
    }

    .chat-panel-messages {
      display: flex;
      flex-direction: column;
      gap: 24px;
      height: 100%;
      position: relative;
      overflow-y: auto;
    }

    .chat-panel-messages-placeholder {
      width: 100%;
      position: absolute;
      z-index: 1;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .item-wrapper {
      margin-left: 32px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 4px;
      color: var(--affine-text-primary-color);
      font-size: 14px;
      font-weight: 500;
      user-select: none;
    }

    .message-info {
      color: var(--affine-placeholder-color);
      font-size: 12px;
      font-weight: 400;
    }

    .avatar-container {
      width: 24px;
      height: 24px;
    }

    .avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: var(--affine-primary-color);
    }

    .avatar-container img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }

    .down-indicator {
      position: absolute;
      left: 50%;
      transform: translate(-50%, 0);
      bottom: 24px;
      z-index: 1;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      border: 0.5px solid var(--affine-border-color);
      background-color: var(--affine-background-primary-color);
      box-shadow: var(--affine-shadow-2);
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
    }
  `;

  @state()
  accessor _selectionValue: BaseSelection[] = [];

  @state()
  accessor showDownIndicator = false;

  @state()
  accessor avatarUrl = '';

  @property({ attribute: false })
  accessor host!: EditorHost;

  @property({ attribute: false })
  accessor isLoading!: boolean;

  @property({ attribute: false })
  accessor chatContextValue!: ChatContextValue;

  @property({ attribute: false })
  accessor getSessionId!: () => Promise<string | undefined>;

  @property({ attribute: false })
  accessor updateContext!: (context: Partial<ChatContextValue>) => void;

  @property({ attribute: false })
  accessor previewSpecBuilder!: SpecBuilder;

  @query('.chat-panel-messages')
  accessor messagesContainer: HTMLDivElement | null = null;

  getScrollContainer(): HTMLDivElement | null {
    return this.messagesContainer;
  }

  private _renderAIOnboarding() {
    return this.isLoading ||
      !this.host?.doc.get(FeatureFlagService).getFlag('enable_ai_onboarding')
      ? nothing
      : html`<div
          style=${styleMap({
            display: 'flex',
            gap: '8px',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: '16px',
            width: '100%',
          })}
        >
          ${repeat(
            AIPreloadConfig,
            config => config.text,
            config => {
              return html`<div
                @click=${() => config.handler()}
                style=${styleMap({
                  display: 'flex',
                  height: '28px',
                  gap: '8px',
                  width: '88%',
                  alignItems: 'center',
                  justifyContent: 'start',
                  cursor: 'pointer',
                })}
              >
                ${config.icon}
                <div
                  style=${styleMap({
                    fontSize: '12px',
                    fontWeight: '400',
                    color: 'var(--affine-text-primary-color)',
                  })}
                >
                  ${config.text}
                </div>
              </div>`;
            }
          )}
        </div>`;
  }

  private readonly _onScroll = () => {
    if (!this.messagesContainer) return;
    const { clientHeight, scrollTop, scrollHeight } = this.messagesContainer;
    this.showDownIndicator = scrollHeight - scrollTop - clientHeight > 200;
  };

  private readonly _debouncedOnScroll = debounce(
    this._onScroll.bind(this),
    100
  );

  protected override render() {
    const { items } = this.chatContextValue;
    const { isLoading } = this;
    const filteredItems = items.filter(item => {
      return (
        isChatMessage(item) ||
        item.messages?.length === 3 ||
        (HISTORY_IMAGE_ACTIONS.includes(item.action) &&
          item.messages?.length === 2)
      );
    });

    return html`<style>
        .chat-panel-messages-placeholder div {
          color: ${isLoading
            ? 'var(--affine-text-secondary-color)'
            : 'var(--affine-text-primary-color)'};
          font-size: ${isLoading ? 'var(--affine-font-sm)' : '18px'};
          font-weight: 600;
        }
      </style>

      <div
        class="chat-panel-messages"
        @scroll=${() => this._debouncedOnScroll()}
      >
        ${items.length === 0
          ? html`<div class="chat-panel-messages-placeholder">
              ${AffineIcon(
                isLoading
                  ? 'var(--affine-icon-secondary)'
                  : 'var(--affine-primary-color)'
              )}
              <div>
                ${this.isLoading
                  ? 'AFFiNE AI is loading history...'
                  : 'What can I help you with?'}
              </div>
              ${this._renderAIOnboarding()}
            </div> `
          : repeat(
              filteredItems,
              (_, index) => index,
              (item, index) => {
                const isLast = index === filteredItems.length - 1;
                return html`<div class="message">
                  ${this.renderAvatar(item)}
                  <div class="item-wrapper">
                    ${this.renderItem(item, isLast)}
                  </div>
                </div>`;
              }
            )}
      </div>
      ${this.showDownIndicator && filteredItems.length > 1
        ? html`<div class="down-indicator" @click=${this.scrollToEnd}>
            ${DownArrowIcon}
          </div>`
        : nothing} `;
  }

  override connectedCallback() {
    super.connectedCallback();
    const { disposables } = this;
    const docModeService = this.host.std.get(DocModeProvider);

    Promise.resolve(AIProvider.userInfo)
      .then(res => {
        this.avatarUrl = res?.avatarUrl ?? '';
      })
      .catch(console.error);

    disposables.add(
      AIProvider.slots.userInfo.on(userInfo => {
        const { status, error } = this.chatContextValue;
        this.avatarUrl = userInfo?.avatarUrl ?? '';
        if (
          status === 'error' &&
          error instanceof UnauthorizedError &&
          userInfo
        ) {
          this.updateContext({ status: 'idle', error: null });
        }
      })
    );
    disposables.add(
      this.host.selection.slots.changed.on(() => {
        this._selectionValue = this.host.selection.value;
      })
    );
    disposables.add(
      docModeService.onPrimaryModeChange(
        () => this.requestUpdate(),
        this.host.doc.id
      )
    );
  }

  renderItem(item: ChatItem, isLast: boolean) {
    const { status, error } = this.chatContextValue;
    const { host } = this;

    if (isLast && status === 'loading') {
      return this.renderLoading();
    }

    if (
      isLast &&
      status === 'error' &&
      (error instanceof PaymentRequiredError ||
        error instanceof UnauthorizedError)
    ) {
      return AIChatErrorRenderer(host, error);
    }

    if (isChatMessage(item)) {
      const state = isLast
        ? status !== 'loading' && status !== 'transmitting'
          ? 'finished'
          : 'generating'
        : 'finished';
      const shouldRenderError = isLast && status === 'error' && !!error;
      return html`<chat-text
          .host=${host}
          .attachments=${item.attachments}
          .text=${item.content}
          .state=${state}
          .previewSpecBuilder=${this.previewSpecBuilder}
        ></chat-text>
        ${shouldRenderError ? AIChatErrorRenderer(host, error) : nothing}
        ${this.renderEditorActions(item, isLast)}`;
    } else {
      switch (item.action) {
        case 'Create a presentation':
          return html`<action-slides
            .host=${host}
            .item=${item}
          ></action-slides>`;
        case 'Make it real':
          return html`<action-make-real
            .host=${host}
            .item=${item}
          ></action-make-real>`;
        case 'Brainstorm mindmap':
          return html`<action-mindmap
            .host=${host}
            .item=${item}
          ></action-mindmap>`;
        case 'Explain this image':
        case 'Generate a caption':
          return html`<action-image-to-text
            .host=${host}
            .item=${item}
          ></action-image-to-text>`;
        default:
          if (HISTORY_IMAGE_ACTIONS.includes(item.action)) {
            return html`<action-image
              .host=${host}
              .item=${item}
            ></action-image>`;
          }

          return html`<action-text
            .item=${item}
            .host=${host}
            .isCode=${item.action === 'Explain this code' ||
            item.action === 'Check code error'}
          ></action-text>`;
      }
    }
  }

  renderAvatar(item: ChatItem) {
    const isUser = isChatMessage(item) && item.role === 'user';
    const isAssistant = isChatMessage(item) && item.role === 'assistant';
    const isWithDocs =
      isAssistant &&
      item.content &&
      item.content.includes('[^') &&
      /\[\^\d+\]:{"type":"doc","docId":"[^"]+"}/.test(item.content);

    return html`<div class="user-info">
      ${isUser
        ? html`<div class="avatar-container">
            ${this.avatarUrl
              ? html`<img .src=${this.avatarUrl} />`
              : html`<div class="avatar"></div>`}
          </div>`
        : AffineAvatarIcon}
      ${isUser ? 'You' : 'AFFiNE AI'}
      ${isWithDocs
        ? html`<span class="message-info">with your docs</span>`
        : nothing}
    </div>`;
  }

  renderLoading() {
    return html` <ai-loading></ai-loading>`;
  }

  scrollToEnd() {
    requestAnimationFrame(() => {
      if (!this.messagesContainer) return;
      this.messagesContainer.scrollTo({
        top: this.messagesContainer.scrollHeight,
        behavior: 'smooth',
      });
    });
  }

  retry = async () => {
    const { doc } = this.host;
    try {
      const sessionId = await this.getSessionId();
      if (!sessionId) return;

      const abortController = new AbortController();
      const items = [...this.chatContextValue.items];
      const last = items[items.length - 1];
      if ('content' in last) {
        last.content = '';
        last.createdAt = new Date().toISOString();
      }
      this.updateContext({ items, status: 'loading', error: null });

      const stream = AIProvider.actions.chat?.({
        sessionId,
        retry: true,
        docId: doc.id,
        workspaceId: doc.workspace.id,
        host: this.host,
        stream: true,
        signal: abortController.signal,
        where: 'chat-panel',
        control: 'chat-send',
        isRootSession: true,
      });

      if (stream) {
        this.updateContext({ abortController });
        for await (const text of stream) {
          const items = [...this.chatContextValue.items];
          const last = items[items.length - 1] as ChatMessage;
          last.content += text;
          this.updateContext({ items, status: 'transmitting' });
        }

        this.updateContext({ status: 'success' });
      }
    } catch (error) {
      this.updateContext({ status: 'error', error: error as AIError });
    } finally {
      this.updateContext({ abortController: null });
    }
  };

  renderEditorActions(item: ChatMessage, isLast: boolean) {
    const { status } = this.chatContextValue;

    if (item.role !== 'assistant') return nothing;

    if (
      isLast &&
      status !== 'success' &&
      status !== 'idle' &&
      status !== 'error'
    )
      return nothing;

    const { host } = this;
    const { content, id: messageId } = item;
    const actions = isInsidePageEditor(host)
      ? PageEditorActions
      : EdgelessEditorActions;

    return html`
      <chat-copy-more
        .host=${host}
        .actions=${actions}
        .content=${content}
        .isLast=${isLast}
        .getSessionId=${this.getSessionId}
        .messageId=${messageId}
        .withMargin=${true}
        .retry=${() => this.retry()}
      ></chat-copy-more>
      ${isLast && !!content
        ? html`<chat-action-list
            .actions=${actions}
            .host=${host}
            .content=${content}
            .getSessionId=${this.getSessionId}
            .messageId=${messageId ?? undefined}
            .withMargin=${true}
          ></chat-action-list>`
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-panel-messages': ChatPanelMessages;
  }
}
