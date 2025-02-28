import { type EditorHost } from '@blocksuite/affine/block-std';
import { scrollbarStyle, unsafeCSSVarV2 } from '@blocksuite/affine/blocks';
import { SignalWatcher, WithDisposable } from '@blocksuite/affine/global/utils';
import { ToggleDownIcon } from '@blocksuite/icons/lit';
import { signal } from '@preact/signals-core';
import { baseTheme } from '@toeverything/theme';
import { css, html, LitElement, nothing, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';

import { ErrorTipIcon } from '../_common/icons';
import {
  type AIError,
  PaymentRequiredError,
  UnauthorizedError,
} from '../components/ai-item/types';
import { AIProvider } from '../provider';

export class AIErrorWrapper extends SignalWatcher(WithDisposable(LitElement)) {
  static override styles = css`
    .error-wrapper {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      gap: 12px;
      align-self: stretch;
      border-radius: 4px;
      padding: 8px 8px 12px 8px;
      background-color: ${unsafeCSSVarV2('layer/background/error')};
      font-family: ${unsafeCSS(baseTheme.fontSansFamily)};

      .content {
        align-items: flex-start;
        display: flex;
        gap: 8px;
        align-self: stretch;
        color: ${unsafeCSSVarV2('status/error')};
        font-feature-settings:
          'clig' off,
          'liga' off;
        /* light/sm */
        font-size: var(--affine-font-sm);
        font-style: normal;
        font-weight: 400;
        line-height: 22px; /* 157.143% */

        .icon svg {
          position: relative;
          top: 3px;
        }
      }

      .text-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .detail-container {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 100%;
      }
      .detail-title {
        display: flex;
        align-items: center;
      }
      .detail-title:hover {
        cursor: pointer;
      }
      .detail-content {
        padding: 4px;
        border-radius: 4px;
        background-color: ${unsafeCSSVarV2('layer/background/translucentUI')};
        height: 66px;
        overflow: auto;
      }
      ${scrollbarStyle('.detail-content')}

      .toggle {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .toggle.up svg {
        transform: rotate(180deg);
        transition: all 0.2s ease-in-out;
      }

      .action {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        width: 100%;
      }
      .action-button {
        cursor: pointer;
        color: ${unsafeCSSVarV2('text/primary')};
        background: ${unsafeCSSVarV2('button/secondary')};
        border-radius: 8px;
        border: 1px solid ${unsafeCSSVarV2('button/innerBlackBorder')};
        padding: 4px 12px;
        font-size: var(--affine-font-xs);
        font-style: normal;
        font-weight: 500;
        line-height: 20px;
      }
      .action-button:hover {
        transition: all 0.2s ease-in-out;
        background-image: linear-gradient(
          rgba(0, 0, 0, 0.04),
          rgba(0, 0, 0, 0.04)
        );
      }
    }
  `;

  private readonly _showDetailContent = signal(false);

  protected override render() {
    return html` <div class="error-wrapper">
      <div class="content">
        <div class="icon">${ErrorTipIcon}</div>
        <div class="text-container">
          <div>${this.text}</div>
          ${this.showDetailPanel
            ? html`<div class="detail-container">
                <div
                  class="detail-title"
                  @click=${() =>
                    (this._showDetailContent.value =
                      !this._showDetailContent.value)}
                >
                  <span>Show detail</span>
                  <span
                    class="toggle ${this._showDetailContent.value
                      ? 'down'
                      : 'up'}"
                  >
                    ${ToggleDownIcon({ width: '16px', height: '16px' })}
                  </span>
                </div>
                ${this._showDetailContent.value
                  ? html`<div class="detail-content">${this.errorMessage}</div>`
                  : nothing}
              </div>`
            : nothing}
        </div>
      </div>
      <div class="action">
        <span
          class="action-button"
          @click=${this.onClick}
          data-testid="ai-error-action-button"
        >
          ${this.actionText}
          ${this.actionTooltip
            ? html`<affine-tooltip tip-position="top"
                >${this.actionTooltip}</affine-tooltip
              >`
            : nothing}
        </span>
      </div>
    </div>`;
  }

  @property({ attribute: false })
  accessor text: string = '';

  @property({ attribute: false })
  accessor onClick: () => void = () => {};

  @property({ attribute: false })
  accessor errorMessage: string = '';

  @property({ attribute: false })
  accessor actionText: string = 'Contact us';

  @property({ attribute: false })
  accessor actionTooltip: string = '';

  @property({ attribute: false })
  accessor showDetailPanel: boolean = false;
}

const PaymentRequiredErrorRenderer = (host: EditorHost) => html`
  <ai-error-wrapper
    .text=${"You've reached the current usage cap for AFFiNE AI. You can subscribe to AFFiNE AI to continue the AI experience!"}
    .actionText=${'Upgrade'}
    .onClick=${() => AIProvider.slots.requestUpgradePlan.emit({ host })}
  ></ai-error-wrapper>
`;

const LoginRequiredErrorRenderer = (host: EditorHost) => html`
  <ai-error-wrapper
    .text=${'You need to login to AFFiNE Cloud to continue using AFFiNE AI.'}
    .actionText=${'Login'}
    .onClick=${() => AIProvider.slots.requestLogin.emit({ host })}
  ></ai-error-wrapper>
`;

type ErrorProps = {
  text?: string;
  errorMessage?: string;
  actionText?: string;
  actionTooltip?: string;
};

const generalErrorText =
  'An error occurred, If this issue persists please let us know.';

const GeneralErrorRenderer = (props: ErrorProps = {}) => {
  const onClick = () => {
    window.open('mailto:support@toeverything.info', '_blank');
  };

  return html`<ai-error-wrapper
    .text=${props.text ?? generalErrorText}
    .errorMessage=${props.errorMessage ?? ''}
    .showDetailPanel=${!!props.errorMessage}
    .actionText=${props.actionText ?? 'Contact us'}
    .actionTooltip=${props.actionTooltip ?? 'support@toeverything.info'}
    .onClick=${onClick}
  ></ai-error-wrapper>`;
};

export function AIChatErrorRenderer(host: EditorHost, error: AIError) {
  if (error instanceof PaymentRequiredError) {
    return PaymentRequiredErrorRenderer(host);
  } else if (error instanceof UnauthorizedError) {
    return LoginRequiredErrorRenderer(host);
  } else {
    return GeneralErrorRenderer({
      errorMessage: error.message,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ai-error-wrapper': AIErrorWrapper;
  }
}
