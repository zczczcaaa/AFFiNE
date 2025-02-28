type Direction = 'horizontal' | 'vertical';

export interface SwipeInfo {
  e: TouchEvent;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  deltaX: number;
  deltaY: number;
  isFirst: boolean;
  /**
   * Instant horizontal speed in `px/s`
   */
  speedX: number;
  /**
   * Average horizontal speed in `px/s`
   */
  averageSpeedX: number;
  /**
   * Instant vertical speed in `px/s`
   */
  speedY: number;
  /**
   * Average vertical speed in `px/s`
   */
  averageSpeedY: number;
  /**
   * The first detected direction
   */
  initialDirection: Direction | null;
}

export interface SwipeHelperOptions {
  scope?: 'global' | 'inside';
  /**
   * When swipe started, the direction will be detected and not change until swipe ended.
   * If the direction is specified, and not match the detected one, the scroll won't be prevented.
   */
  direction?: Direction;
  /**
   * @description The distance in px that determine which direction the swipe gesture is
   * @default 10
   */
  directionThreshold?: number;
  preventScroll?: boolean;
  onTap?: () => void;
  onSwipeStart?: () => void;
  onSwipe?: (info: SwipeInfo) => void;
  onSwipeEnd?: (info: SwipeInfo) => void;
}
const defaultOptions = Object.freeze({
  scope: 'global',
  directionThreshold: 10,
} as const);

export class SwipeHelper {
  private _trigger: HTMLElement | null = null;
  private _options: SwipeHelperOptions = defaultOptions;
  private _direction: Direction | null = null;
  private _startPos: { x: number; y: number } = { x: 0, y: 0 };
  private _isFirst: boolean = true;
  private _lastInfo: SwipeInfo | null = null;
  private _startTime: number = 0;
  private _lastTime: number = 0;

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
    this._lastTime = Date.now();
    this._startTime = this._lastTime;
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
    const info = this._getInfo(e);
    if (
      this._options.preventScroll &&
      // direction is not detected
      (!this._direction ||
        // direction is not specified
        !this._options.direction ||
        // direction is same as specified
        this._direction === this._options.direction)
    ) {
      e.preventDefault();
    }
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
    const lastTime = this._lastTime;
    this._lastTime = Date.now();
    const deltaTime = this._lastTime - lastTime;
    const touch = e.touches[0];
    const deltaX = touch.clientX - this._startPos.x;
    const deltaY = touch.clientY - this._startPos.y;
    const speedX =
      (Math.abs(deltaX - (this._lastInfo?.deltaX ?? 0)) / deltaTime) * 1000;
    const averageSpeedX =
      (Math.abs(deltaX) / (this._lastTime - this._startTime)) * 1000;
    const speedY =
      (Math.abs(deltaY - (this._lastInfo?.deltaY ?? 0)) / deltaTime) * 1000;
    const averageSpeedY =
      (Math.abs(deltaY) / (this._lastTime - this._startTime)) * 1000;

    // detect direction
    const threshold =
      this._options.directionThreshold ?? defaultOptions.directionThreshold;
    const maxDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
    if (!this._direction && maxDelta > threshold) {
      this._direction =
        Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
    }

    return {
      e,
      startX: this._startPos.x,
      startY: this._startPos.y,
      endX: touch.clientX,
      endY: touch.clientY,
      deltaX,
      deltaY,
      isFirst: this._isFirst,
      speedX,
      averageSpeedX,
      speedY,
      averageSpeedY,
      initialDirection: this._direction,
    };
  }

  private _clearDrag() {
    this._lastInfo = null;
    this._lastTime = 0;
    this._startTime = 0;
    this._direction = null;
    this._dragMoveCleanup();
    this._dragEndCleanup();
  }
}
