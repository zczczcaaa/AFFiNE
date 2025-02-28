import {
  type EditorHost,
  ShadowlessElement,
} from '@blocksuite/affine/block-std';
import { scrollbarStyle } from '@blocksuite/affine/blocks';
import { throttle, WithDisposable } from '@blocksuite/affine/global/utils';
import type { PropertyValues } from 'lit';
import { css, html } from 'lit';
import { property, query } from 'lit/decorators.js';

import type {
  AffineAIPanelState,
  AffineAIPanelWidgetConfig,
} from '../widgets/ai-panel/type';
import type { TextRendererOptions } from './text-renderer';

export class AIScrollableTextRenderer extends WithDisposable(
  ShadowlessElement
) {
  static override styles = css`
    .ai-scrollable-text-renderer {
      overflow-y: auto;
    }

    ${scrollbarStyle('.ai-scrollable-text-renderer')};
  `;

  private _lastScrollHeight = 0;

  private readonly _scrollToEnd = () => {
    requestAnimationFrame(() => {
      if (!this._scrollableTextRenderer) {
        return;
      }
      const scrollHeight = this._scrollableTextRenderer.scrollHeight || 0;

      if (scrollHeight > this._lastScrollHeight) {
        this._lastScrollHeight = scrollHeight;
        // Scroll when scroll height greater than maxheight
        this._scrollableTextRenderer?.scrollTo({
          top: scrollHeight,
        });
      }
    });
  };

  private readonly _throttledScrollToEnd = throttle(this._scrollToEnd, 300);

  private readonly _onWheel = (e: WheelEvent) => {
    e.stopPropagation();
    if (this.state === 'generating') {
      e.preventDefault();
    }
  };

  protected override updated(_changedProperties: PropertyValues) {
    if (
      this.autoScroll &&
      _changedProperties.has('answer') &&
      (this.state === 'generating' || this.state === 'finished')
    ) {
      this._throttledScrollToEnd();
    }
  }

  override render() {
    const { host, answer, state, textRendererOptions } = this;

    return html` <style>
        .ai-scrollable-text-renderer {
          max-height: ${this.maxHeight}px;
        }
      </style>
      <div class="ai-scrollable-text-renderer" @wheel=${this._onWheel}>
        <text-renderer
          .host=${host}
          .answer=${answer}
          .state=${state}
          .options=${textRendererOptions}
        ></text-renderer>
      </div>`;
  }

  @property({ attribute: false })
  accessor answer!: string;

  @property({ attribute: false })
  accessor host: EditorHost | null = null;

  @property({ attribute: false })
  accessor state: AffineAIPanelState | undefined = undefined;

  @property({ attribute: false })
  accessor textRendererOptions!: TextRendererOptions;

  @property({ attribute: false })
  accessor maxHeight = 320;

  @property({ attribute: false })
  accessor autoScroll = true;

  @query('.ai-scrollable-text-renderer')
  accessor _scrollableTextRenderer: HTMLDivElement | null = null;
}

export const createAIScrollableTextRenderer: (
  host: EditorHost,
  textRendererOptions: TextRendererOptions,
  maxHeight: number,
  autoScroll: boolean
) => AffineAIPanelWidgetConfig['answerRenderer'] = (
  host,
  textRendererOptions,
  maxHeight,
  autoScroll
) => {
  return (answer, state) => {
    return html`<ai-scrollable-text-renderer
      .host=${host}
      .answer=${answer}
      .state=${state}
      .textRendererOptions=${textRendererOptions}
      .maxHeight=${maxHeight}
      .autoScroll=${autoScroll}
    ></ai-scrollable-text-renderer>`;
  };
};

declare global {
  interface HTMLElementTagNameMap {
    'ai-scrollable-text-renderer': AIScrollableTextRenderer;
  }
}
