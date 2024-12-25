import type { HoverController } from '@blocksuite/affine-components/hover';
import { AttachmentBlockStyles } from '@blocksuite/affine-model';
import {
  EMBED_CARD_HEIGHT,
  EMBED_CARD_WIDTH,
} from '@blocksuite/affine-shared/consts';
import { type BlockService, toGfxBlockComponent } from '@blocksuite/block-std';
import type { Slot } from '@blocksuite/store';
import { styleMap } from 'lit/directives/style-map.js';

import { AttachmentBlockComponent } from './attachment-block.js';

export class AttachmentEdgelessBlockComponent extends toGfxBlockComponent(
  AttachmentBlockComponent
) {
  protected override _whenHover: HoverController | null = null;

  override blockDraggable = false;

  get rootService(): null | (BlockService & { slots: Record<string, Slot> }) {
    return this.std.getService('affine:page');
  }

  override connectedCallback(): void {
    super.connectedCallback();

    const rootService = this.rootService;
    if (!rootService) {
      console.warn('rootService is not found');
      return;
    }

    // TODO: move root service slots to extension
    this._disposables.add(
      rootService.slots.elementResizeStart.on(() => {
        this._isResizing = true;
        this._showOverlay = true;
      })
    );

    // TODO: move root service slots to extension
    this._disposables.add(
      rootService.slots.elementResizeEnd.on(() => {
        this._isResizing = false;
        this._showOverlay =
          this._isResizing || this._isDragging || !this._isSelected;
      })
    );
  }

  override onClick(_: MouseEvent) {
    return;
  }

  override renderGfxBlock() {
    const { style$ } = this.model;
    const cardStyle = style$.value ?? AttachmentBlockStyles[1];
    const width = EMBED_CARD_WIDTH[cardStyle];
    const height = EMBED_CARD_HEIGHT[cardStyle];
    const bound = this.model.elementBound;
    const scaleX = bound.w / width;
    const scaleY = bound.h / height;

    this.containerStyleMap = styleMap({
      width: `${width}px`,
      height: `${height}px`,
      transform: `scale(${scaleX}, ${scaleY})`,
      transformOrigin: '0 0',
      overflow: 'hidden',
    });

    return this.renderPageContent();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-edgeless-attachment': AttachmentEdgelessBlockComponent;
  }
}
