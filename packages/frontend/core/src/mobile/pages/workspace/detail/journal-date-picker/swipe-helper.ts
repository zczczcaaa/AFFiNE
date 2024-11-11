export interface SwipeInfo {
  e: TouchEvent;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  deltaX: number;
  deltaY: number;
  isFirst: boolean;
}

export interface SwipeHelperOptions {
  scope?: 'global' | 'inside';
  preventScroll?: boolean;
  onTap?: () => void;
  onSwipeStart?: () => void;
  onSwipe?: (info: SwipeInfo) => void;
  onSwipeEnd?: (info: SwipeInfo) => void;
}

export class SwipeHelper {
  private _trigger: HTMLElement | null = null;
  private _options: SwipeHelperOptions = {
    scope: 'global',
  };
  private _startPos: { x: number; y: number } = { x: 0, y: 0 };
  private _isFirst: boolean = true;
  private _lastInfo: SwipeInfo | null = null;

  get scopeElement() {
    return this._options.scope === 'inside'
      ? (this._trigger ?? document.body)
      : document.body;
  }

  private _dragStartCleanup: () => void = () => {};
  private _dragMoveCleanup: () => void = () => {};
  private _dragEndCleanup: () => void = () => {};

  /**
   * Register touch event to observe drag gesture
   */
  public init(trigger: HTMLElement, options?: SwipeHelperOptions) {
    this.destroy();
    this._options = { ...this._options, ...options };
    this._trigger = trigger;
    const handler = this._handleTouchStart.bind(this);
    trigger.addEventListener('touchstart', handler, {
      passive: !this._options.preventScroll,
    });
    this._dragStartCleanup = () => {
      trigger.removeEventListener('touchstart', handler);
    };

    return () => this.destroy();
  }

  /**
   * Remove all listeners
   */
  public destroy() {
    this._dragStartCleanup();
    this._clearDrag();
  }

  private _handleTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    this._startPos = {
      x: touch.clientX,
      y: touch.clientY,
    };
    this._options.onSwipeStart?.();
    const moveHandler = this._handleTouchMove.bind(this);
    this.scopeElement.addEventListener('touchmove', moveHandler, {
      passive: !this._options.preventScroll,
    });
    const endHandler = this._handleTouchEnd.bind(this);
    this.scopeElement.addEventListener('touchend', endHandler, {
      passive: !this._options.preventScroll,
    });
    this._dragMoveCleanup = () => {
      this.scopeElement.removeEventListener('touchmove', moveHandler);
    };
    this._dragEndCleanup = () => {
      this.scopeElement.removeEventListener('touchend', endHandler);
    };
  }

  private _handleTouchMove(e: TouchEvent) {
    if (this._options.preventScroll) {
      e.preventDefault();
    }
    const info = this._getInfo(e);
    this._lastInfo = info;
    this._isFirst = false;
    this._options.onSwipe?.(info);
  }

  private _handleTouchEnd() {
    if (
      !this._lastInfo ||
      (Math.abs(this._lastInfo.deltaY) < 1 &&
        Math.abs(this._lastInfo.deltaX) < 1)
    ) {
      this._options.onTap?.();
    } else {
      this._options.onSwipeEnd?.(this._lastInfo);
    }
    this._clearDrag();
  }

  private _getInfo(e: TouchEvent): SwipeInfo {
    const touch = e.touches[0];
    const deltaX = touch.clientX - this._startPos.x;
    const deltaY = touch.clientY - this._startPos.y;
    return {
      e,
      startX: this._startPos.x,
      startY: this._startPos.y,
      endX: touch.clientX,
      endY: touch.clientY,
      deltaX,
      deltaY,
      isFirst: this._isFirst,
    };
  }

  private _clearDrag() {
    this._lastInfo = null;
    this._dragMoveCleanup();
    this._dragEndCleanup();
  }
}
