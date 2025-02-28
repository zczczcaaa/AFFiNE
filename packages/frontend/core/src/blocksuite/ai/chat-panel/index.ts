import './chat-panel-input';
import './chat-panel-messages';

import type { EditorHost } from '@blocksuite/affine/block-std';
import { ShadowlessElement } from '@blocksuite/affine/block-std';
import {
  NotificationProvider,
  type SpecBuilder,
} from '@blocksuite/affine/blocks';
import { WithDisposable } from '@blocksuite/affine/global/utils';
import type { Store } from '@blocksuite/affine/store';
import { css, html, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { createRef, type Ref, ref } from 'lit/directives/ref.js';
import { throttle } from 'lodash-es';

import { AIHelpIcon, SmallHintIcon } from '../_common/icons';
import { AIProvider } from '../provider';
import { extractSelectedContent } from '../utils/extract';
import {
  getSelectedImagesAsBlobs,
  getSelectedTextContent,
} from '../utils/selection-utils';
import type {
  AINetworkSearchConfig,
  DocDisplayConfig,
  DocSearchMenuConfig,
} from './chat-config';
import type {
  ChatAction,
  ChatContextValue,
  ChatItem,
  DocChip,
  FileChip,
} from './chat-context';
import type { ChatPanelMessages } from './chat-panel-messages';
import { isDocContext } from './components/utils';

const DEFAULT_CHAT_CONTEXT_VALUE: ChatContextValue = {
  quote: '',
  images: [],
  abortController: null,
  items: [],
  chips: [],
  status: 'idle',
  error: null,
  markdown: '',
};

export class ChatPanel extends WithDisposable(ShadowlessElement) {
  static override styles = css`
    chat-panel {
      width: 100%;
    }

    .chat-panel-container {
      display: flex;
      flex-direction: column;
      padding: 0 16px;
      padding-top: 8px;
      height: 100%;
    }

    .chat-panel-title {
      background: var(--affine-background-primary-color);
      position: relative;
      padding: 8px 0px;
      width: 100%;
      height: 36px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1;

      div:first-child {
        font-size: 14px;
        font-weight: 500;
        color: var(--affine-text-secondary-color);
      }

      div:last-child {
        width: 24px;
        height: 24px;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
      }
    }

    chat-panel-messages {
      flex: 1;
      overflow-y: hidden;
    }

    .chat-panel-hints {
      margin: 0 4px;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--affine-border-color);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }

    .chat-panel-hints :first-child {
      color: var(--affine-text-primary-color);
    }

    .chat-panel-hints :nth-child(2) {
      color: var(--affine-text-secondary-color);
    }

    .chat-panel-footer {
      margin: 8px 0px;
      height: 20px;
      display: flex;
      gap: 4px;
      align-items: center;
      color: var(--affine-text-secondary-color);
      font-size: 12px;
      user-select: none;
    }
  `;

  private readonly _chatMessages: Ref<ChatPanelMessages> =
    createRef<ChatPanelMessages>();

  // request counter to track the latest request
  private _updateHistoryCounter = 0;

  private _wheelTriggered = false;

  private readonly _updateHistory = async () => {
    const { doc } = this;
    this.isLoading = true;

    const currentRequest = ++this._updateHistoryCounter;

    const [histories, actions] = await Promise.all([
      AIProvider.histories?.chats(doc.workspace.id, doc.id),
      AIProvider.histories?.actions(doc.workspace.id, doc.id),
    ]);

    // Check if this is still the latest request
    if (currentRequest !== this._updateHistoryCounter) {
      return;
    }

    const items: ChatItem[] = actions ? [...actions] : [];

    if (histories?.at(-1)) {
      const history = histories.at(-1);
      if (!history) return;
      items.push(...history.messages);
      AIProvider.LAST_ROOT_SESSION_ID = history.sessionId;
    }

    this.chatContextValue = {
      ...this.chatContextValue,
      items: items.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    };

    this.isLoading = false;
    this._scrollToEnd();
  };

  private readonly _updateChips = async () => {
    // context not initialized, show candidate chip
    if (!this._chatSessionId || !this._chatContextId) {
      return;
    }

    // context initialized, show the chips
    let chips: (DocChip | FileChip)[] = [];
    const { docs = [], files = [] } =
      (await AIProvider.context?.getContextDocsAndFiles(
        this.doc.workspace.id,
        this._chatSessionId,
        this._chatContextId
      )) || {};
    const list = [...docs, ...files].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    chips = list.map(item => {
      let chip: DocChip | FileChip;
      if (isDocContext(item)) {
        chip = {
          docId: item.id,
          state: 'processing',
        };
      } else {
        chip = {
          fileId: item.id,
          state: item.status === 'finished' ? 'success' : item.status,
          fileName: item.name,
          fileType: '',
        };
      }
      return chip;
    });
    this.chatContextValue = {
      ...this.chatContextValue,
      chips,
    };
  };

  private readonly _getSessionId = async () => {
    if (this._chatSessionId) {
      return this._chatSessionId;
    }
    this._chatSessionId = await AIProvider.session?.createSession(
      this.doc.workspace.id,
      this.doc.id
    );
    return this._chatSessionId;
  };

  private readonly _getContextId = async () => {
    if (this._chatContextId) {
      return this._chatContextId;
    }
    const sessionId = await this._getSessionId();
    if (sessionId) {
      this._chatContextId = await AIProvider.context?.createContext(
        this.doc.workspace.id,
        sessionId
      );
    }
    return this._chatContextId;
  };

  @property({ attribute: false })
  accessor host!: EditorHost;

  @property({ attribute: false })
  accessor doc!: Store;

  @property({ attribute: false })
  accessor networkSearchConfig!: AINetworkSearchConfig;

  @property({ attribute: false })
  accessor docSearchMenuConfig!: DocSearchMenuConfig;

  @property({ attribute: false })
  accessor docDisplayConfig!: DocDisplayConfig;

  @property({ attribute: false })
  accessor previewSpecBuilder!: SpecBuilder;

  @state()
  accessor isLoading = false;

  @state()
  accessor chatContextValue: ChatContextValue = DEFAULT_CHAT_CONTEXT_VALUE;

  private _chatSessionId: string | null | undefined = null;

  private _chatContextId: string | null | undefined = null;

  private readonly _scrollToEnd = () => {
    if (!this._wheelTriggered) {
      this._chatMessages.value?.scrollToEnd();
    }
  };

  private readonly _throttledScrollToEnd = throttle(this._scrollToEnd, 600);

  private readonly _cleanupHistories = async () => {
    const notification = this.host.std.getOptional(NotificationProvider);
    if (!notification) return;

    if (
      await notification.confirm({
        title: 'Clear History',
        message:
          'Are you sure you want to clear all history? This action will permanently delete all content, including all chat logs and data, and cannot be undone.',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
      })
    ) {
      await AIProvider.histories?.cleanup(this.doc.workspace.id, this.doc.id, [
        this._chatSessionId ?? '',
        ...(
          this.chatContextValue.items.filter(
            item => 'sessionId' in item
          ) as ChatAction[]
        ).map(item => item.sessionId),
      ]);
      notification.toast('History cleared');
      await this._updateHistory();
    }
  };

  private readonly _initPanel = async () => {
    try {
      const userId = (await AIProvider.userInfo)?.id;
      if (!userId) return;

      const sessions = await AIProvider.session?.getSessions(
        this.doc.workspace.id,
        this.doc.id
      );
      if (sessions?.length) {
        this._chatSessionId = sessions?.[0].id;
        await this._updateHistory();
      }
      if (this._chatSessionId) {
        this._chatContextId = await AIProvider.context?.getContextId(
          this.doc.workspace.id,
          this._chatSessionId
        );
      }
      await this._updateChips();
    } catch (error) {
      console.error(error);
    }
  };

  protected override updated(_changedProperties: PropertyValues) {
    if (_changedProperties.has('doc')) {
      this._chatSessionId = null;
      this._chatContextId = null;
      this.chatContextValue = DEFAULT_CHAT_CONTEXT_VALUE;

      requestAnimationFrame(async () => {
        await this._initPanel();
      });
    }

    if (this.chatContextValue.status === 'loading') {
      // reset the wheel triggered flag when the status is loading
      this._wheelTriggered = false;
    }

    if (
      _changedProperties.has('chatContextValue') &&
      (this.chatContextValue.status === 'loading' ||
        this.chatContextValue.status === 'error' ||
        this.chatContextValue.status === 'success')
    ) {
      setTimeout(this._scrollToEnd, 500);
    }

    if (
      _changedProperties.has('chatContextValue') &&
      this.chatContextValue.status === 'transmitting'
    ) {
      this._throttledScrollToEnd();
    }
  }

  protected override firstUpdated(): void {
    const chatMessages = this._chatMessages.value;
    if (chatMessages) {
      chatMessages.updateComplete
        .then(() => {
          chatMessages.getScrollContainer()?.addEventListener('wheel', () => {
            this._wheelTriggered = true;
          });
        })
        .catch(console.error);
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    if (!this.doc) throw new Error('doc is required');

    this._disposables.add(
      AIProvider.slots.actions.on(({ event }) => {
        const { status } = this.chatContextValue;
        if (
          event === 'finished' &&
          (status === 'idle' || status === 'success')
        ) {
          this._updateHistory().catch(console.error);
        }
      })
    );
    this._disposables.add(
      AIProvider.slots.userInfo.on(async () => {
        await this._initPanel();
      })
    );
    this._disposables.add(
      AIProvider.slots.requestOpenWithChat.on(async ({ host }) => {
        if (this.host === host) {
          const context = await extractSelectedContent(host);
          if (!context) return;
          this.updateContext(context);
        }
      })
    );
  }

  updateContext = (context: Partial<ChatContextValue>) => {
    this.chatContextValue = { ...this.chatContextValue, ...context };
  };

  continueInChat = async () => {
    const text = await getSelectedTextContent(this.host, 'plain-text');
    const markdown = await getSelectedTextContent(this.host, 'markdown');
    const images = await getSelectedImagesAsBlobs(this.host);
    this.updateContext({
      quote: text,
      markdown,
      images,
    });
  };

  override render() {
    return html` <div class="chat-panel-container">
      <div class="chat-panel-title">
        <div>AFFiNE AI</div>
        <div
          @click=${() => {
            AIProvider.toggleGeneralAIOnboarding?.(true);
          }}
        >
          ${AIHelpIcon}
        </div>
      </div>
      <chat-panel-messages
        ${ref(this._chatMessages)}
        .chatContextValue=${this.chatContextValue}
        .getSessionId=${this._getSessionId}
        .updateContext=${this.updateContext}
        .host=${this.host}
        .isLoading=${this.isLoading}
        .previewSpecBuilder=${this.previewSpecBuilder}
      ></chat-panel-messages>
      <chat-panel-chips
        .host=${this.host}
        .chatContextValue=${this.chatContextValue}
        .getContextId=${this._getContextId}
        .updateContext=${this.updateContext}
        .docDisplayConfig=${this.docDisplayConfig}
        .docSearchMenuConfig=${this.docSearchMenuConfig}
      ></chat-panel-chips>
      <chat-panel-input
        .chatContextValue=${this.chatContextValue}
        .getSessionId=${this._getSessionId}
        .networkSearchConfig=${this.networkSearchConfig}
        .updateContext=${this.updateContext}
        .host=${this.host}
        .cleanupHistories=${this._cleanupHistories}
      ></chat-panel-input>
      <div class="chat-panel-footer">
        ${SmallHintIcon}
        <div>AI outputs can be misleading or wrong</div>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-panel': ChatPanel;
  }
}
