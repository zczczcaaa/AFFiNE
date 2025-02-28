import {
  Bound,
  clamp,
  debounce,
  type IPoint,
  type IVec,
  Slot,
  Vec,
} from '@blocksuite/global/utils';
import { signal } from '@preact/signals-core';

import type { GfxViewportElement } from '.';

function cutoff(value: number, ref: number, sign: number) {
  if (sign > 0 && value > ref) return ref;
  if (sign < 0 && value < ref) return ref;
  return value;
}

export const ZOOM_MAX = 6.0;
export const ZOOM_MIN = 0.1;
export const ZOOM_STEP = 0.25;
export const ZOOM_INITIAL = 1.0;

export const FIT_TO_SCREEN_PADDING = 100;

export class Viewport {
  private _cachedBoundingClientRect: DOMRect | null = null;

  private _cachedOffsetWidth: number | null = null;

  private _resizeObserver: ResizeObserver | null = null;

  protected _center: IPoint = { x: 0, y: 0 };

  protected _shell: HTMLElement | null = null;

  protected _element: GfxViewportElement | null = null;

  protected _height = 0;

  protected _left = 0;

  protected _locked = false;

  protected _rafId: number | null = null;

  protected _top = 0;

  protected _width = 0;

  protected _zoom: number = 1.0;

  elementReady = new Slot<GfxViewportElement>();

  sizeUpdated = new Slot<{
    width: number;
    height: number;
    left: number;
    top: number;
  }>();

  viewportMoved = new Slot<IVec>();

  viewportUpdated = new Slot<{
    zoom: number;
    center: IVec;
  }>();

  zooming$ = signal(false);
  panning$ = signal(false);

  ZOOM_MAX = ZOOM_MAX;

  ZOOM_MIN = ZOOM_MIN;

  private readonly _resetZooming = debounce(
    () => {
      this.zooming$.value = false;
    },
    100,
    { leading: false, trailing: true }
  );

  private readonly _resetPanning = debounce(
    () => {
      this.panning$.value = false;
    },
    100,
    { leading: false, trailing: true }
  );

  constructor() {
    this.elementReady.once(el => (this._element = el));
  }

  get boundingClientRect() {
    if (!this._shell) return new DOMRect(0, 0, 0, 0);
    if (!this._cachedBoundingClientRect) {
      this._cachedBoundingClientRect = this._shell.getBoundingClientRect();
    }
    return this._cachedBoundingClientRect;
  }

  get element() {
    return this._element;
  }

  get center() {
    return this._center;
  }

  get centerX() {
    return this._center.x;
  }

  get centerY() {
    return this._center.y;
  }

  get height() {
    return this.boundingClientRect.height;
  }

  get left() {
    return this._left;
  }

  // Does not allow the user to move and zoom the canvas in copilot tool
  get locked() {
    return this._locked;
  }

  set locked(locked: boolean) {
    this._locked = locked;
  }

  /**
   * Note this is different from the zoom property.
   * The editor itself may be scaled by outer container which is common in nested editor scenarios.
   * This property is used to calculate the scale of the editor.
   */
  get viewScale() {
    if (!this._shell || this._cachedOffsetWidth === null) return 1;
    return this.boundingClientRect.width / this._cachedOffsetWidth;
  }

  get top() {
    return this._top;
  }

  get translateX() {
    return -this.viewportX * this.zoom;
  }

  get translateY() {
    return -this.viewportY * this.zoom;
  }

  get viewportBounds() {
    const { viewportMinXY, viewportMaxXY } = this;

    return Bound.from({
      ...viewportMinXY,
      w: viewportMaxXY.x - viewportMinXY.x,
      h: viewportMaxXY.y - viewportMinXY.y,
    });
  }

  get viewportMaxXY() {
    const { centerX, centerY, width, height, zoom } = this;
    return {
      x: centerX + width / 2 / zoom,
      y: centerY + height / 2 / zoom,
    };
  }

  get viewportMinXY() {
    const { centerX, centerY, width, height, zoom } = this;
    return {
      x: centerX - width / 2 / zoom,
      y: centerY - height / 2 / zoom,
    };
  }

  get viewportX() {
    const { centerX, width, zoom } = this;
    return centerX - width / 2 / zoom;
  }

  get viewportY() {
    const { centerY, height, zoom } = this;
    return centerY - height / 2 / zoom;
  }

  get width() {
    return this.boundingClientRect.width;
  }

  get zoom() {
    return this._zoom;
  }

  applyDeltaCenter(deltaX: number, deltaY: number) {
    this.setCenter(this.centerX + deltaX, this.centerY + deltaY);
  }

  clearViewportElement() {
    if (this._resizeObserver && this._shell) {
      this._resizeObserver.unobserve(this._shell);
      this._resizeObserver.disconnect();
    }
    this._resizeObserver = null;
    this._shell = null;
    this._cachedBoundingClientRect = null;
    this._cachedOffsetWidth = null;
  }

  dispose() {
    this.clearViewportElement();
    this.sizeUpdated.dispose();
    this.viewportMoved.dispose();
    this.viewportUpdated.dispose();
    this.zooming$.value = false;
    this.panning$.value = false;
  }

  getFitToScreenData(
    bounds?: Bound | null,
    padding: [number, number, number, number] = [0, 0, 0, 0],
    maxZoom = ZOOM_MAX,
    fitToScreenPadding = 100
  ) {
    let { centerX, centerY, zoom } = this;

    if (!bounds) {
      return { zoom, centerX, centerY };
    }

    const { x, y, w, h } = bounds;
    const [pt, pr, pb, pl] = padding;
    const { width, height } = this;

    zoom = Math.min(
      (width - fitToScreenPadding - (pr + pl)) / w,
      (height - fitToScreenPadding - (pt + pb)) / h
    );
    zoom = clamp(zoom, ZOOM_MIN, clamp(maxZoom, ZOOM_MIN, ZOOM_MAX));

    centerX = x + (w + pr / zoom) / 2 - pl / zoom / 2;
    centerY = y + (h + pb / zoom) / 2 - pt / zoom / 2;

    return { zoom, centerX, centerY };
  }

  isInViewport(bound: Bound) {
    const viewportBounds = Bound.from(this.viewportBounds);
    return (
      viewportBounds.contains(bound) ||
      viewportBounds.isIntersectWithBound(bound)
    );
  }

  onResize() {
    if (!this._shell) return;
    const { centerX, centerY, zoom, width: oldWidth, height: oldHeight } = this;
    const { left, top, width, height } = this.boundingClientRect;
    this._cachedOffsetWidth = this._shell.offsetWidth;

    this.setRect(left, top, width, height);
    this.setCenter(
      centerX - (oldWidth - width) / zoom / 2,
      centerY - (oldHeight - height) / zoom / 2
    );

    this._width = width;
    this._height = height;
  }

  setCenter(centerX: number, centerY: number) {
    this._center.x = centerX;
    this._center.y = centerY;
    this.panning$.value = true;
    this.viewportUpdated.emit({
      zoom: this.zoom,
      center: Vec.toVec(this.center) as IVec,
    });
    this._resetPanning();
  }

  setRect(left: number, top: number, width: number, height: number) {
    this._left = left;
    this._top = top;
    this.sizeUpdated.emit({
      left,
      top,
      width,
      height,
    });
  }

  setViewport(
    newZoom: number,
    newCenter = Vec.toVec(this.center),
    smooth = false
  ) {
    const preZoom = this._zoom;
    if (smooth) {
      const cofficient = preZoom / newZoom;
      if (cofficient === 1) {
        this.smoothTranslate(newCenter[0], newCenter[1]);
      } else {
        const center = [this.centerX, this.centerY] as IVec;
        const focusPoint = Vec.mul(
          Vec.sub(newCenter, Vec.mul(center, cofficient)),
          1 / (1 - cofficient)
        );
        this.smoothZoom(newZoom, Vec.toPoint(focusPoint));
      }
    } else {
      this._center.x = newCenter[0];
      this._center.y = newCenter[1];
      this.setZoom(newZoom);
    }
  }

  /**
   * Set the viewport to fit the bound with padding.
   * @param bound The bound will be zoomed to fit the viewport.
   * @param padding The padding will be applied to the bound after zooming, default is [0, 0, 0, 0],
   *                the value may be reduced if there is not enough space for the padding.
   *                Use decimal less than 1 to represent percentage padding. e.g. [0.1, 0.1, 0.1, 0.1] means 10% padding.
   * @param smooth whether to animate the zooming
   */
  setViewportByBound(
    bound: Bound,
    padding: [number, number, number, number] = [0, 0, 0, 0],
    smooth = false
  ) {
    let [pt, pr, pb, pl] = padding;

    // Convert percentage padding to absolute values if they are between 0 and 1
    if (pt > 0 && pt < 1) pt *= this.height;
    if (pr > 0 && pr < 1) pr *= this.width;
    if (pb > 0 && pb < 1) pb *= this.height;
    if (pl > 0 && pl < 1) pl *= this.width;

    // Calculate zoom
    let zoom = Math.min(
      (this.width - (pr + pl)) / bound.w,
      (this.height - (pt + pb)) / bound.h
    );

    // Adjust padding if space is not enough
    if (zoom < this.ZOOM_MIN) {
      zoom = this.ZOOM_MIN;
      const totalPaddingWidth = this.width - bound.w * zoom;
      const totalPaddingHeight = this.height - bound.h * zoom;
      pr = pl = Math.max(totalPaddingWidth / 2, 1);
      pt = pb = Math.max(totalPaddingHeight / 2, 1);
    }

    // Ensure zoom does not exceed ZOOM_MAX
    if (zoom > this.ZOOM_MAX) {
      zoom = this.ZOOM_MAX;
    }

    const center = [
      bound.x + (bound.w + pr / zoom) / 2 - pl / zoom / 2,
      bound.y + (bound.h + pb / zoom) / 2 - pt / zoom / 2,
    ] as IVec;

    this.setViewport(zoom, center, smooth);
  }

  /** This is the outer container of the viewport, which is the host of the viewport element */
  setShellElement(el: HTMLElement) {
    this._shell = el;
    this._cachedBoundingClientRect = el.getBoundingClientRect();
    this._cachedOffsetWidth = el.offsetWidth;

    const { left, top, width, height } = this._cachedBoundingClientRect;
    this.setRect(left, top, width, height);

    this._resizeObserver = new ResizeObserver(() => {
      this._cachedBoundingClientRect = null;
      this._cachedOffsetWidth = null;
      this.onResize();
    });
    this._resizeObserver.observe(el);
  }

  setZoom(zoom: number, focusPoint?: IPoint) {
    const prevZoom = this.zoom;
    focusPoint = (focusPoint ?? this._center) as IPoint;
    this._zoom = clamp(zoom, this.ZOOM_MIN, this.ZOOM_MAX);
    const newZoom = this.zoom;

    const offset = Vec.sub(Vec.toVec(this.center), Vec.toVec(focusPoint));
    const newCenter = Vec.add(
      Vec.toVec(focusPoint),
      Vec.mul(offset, prevZoom / newZoom)
    );
    this.zooming$.value = true;
    this.setCenter(newCenter[0], newCenter[1]);
    this.viewportUpdated.emit({
      zoom: this.zoom,
      center: Vec.toVec(this.center) as IVec,
    });
    this._resetZooming();
  }

  smoothTranslate(x: number, y: number, numSteps = 10) {
    const { center } = this;
    const delta = { x: x - center.x, y: y - center.y };
    const innerSmoothTranslate = () => {
      if (this._rafId) cancelAnimationFrame(this._rafId);
      this._rafId = requestAnimationFrame(() => {
        const step = { x: delta.x / numSteps, y: delta.y / numSteps };
        const nextCenter = {
          x: this.centerX + step.x,
          y: this.centerY + step.y,
        };
        const signX = delta.x > 0 ? 1 : -1;
        const signY = delta.y > 0 ? 1 : -1;
        nextCenter.x = cutoff(nextCenter.x, x, signX);
        nextCenter.y = cutoff(nextCenter.y, y, signY);
        this.setCenter(nextCenter.x, nextCenter.y);

        if (nextCenter.x != x || nextCenter.y != y) innerSmoothTranslate();
      });
    };
    innerSmoothTranslate();
  }

  smoothZoom(zoom: number, focusPoint?: IPoint, numSteps = 10) {
    const delta = zoom - this.zoom;
    if (this._rafId) cancelAnimationFrame(this._rafId);

    const innerSmoothZoom = () => {
      this._rafId = requestAnimationFrame(() => {
        const sign = delta > 0 ? 1 : -1;
        const step = delta / numSteps;
        const nextZoom = cutoff(this.zoom + step, zoom, sign);

        this.setZoom(nextZoom, focusPoint);

        if (nextZoom != zoom) innerSmoothZoom();
      });
    };
    innerSmoothZoom();
  }

  toModelBound(bound: Bound) {
    const { w, h } = bound;
    const [x, y] = this.toModelCoord(bound.x, bound.y);

    return new Bound(x, y, w / this.zoom, h / this.zoom);
  }

  toModelCoord(viewX: number, viewY: number): IVec {
    const { viewportX, viewportY, zoom, viewScale } = this;
    return [
      viewportX + viewX / zoom / viewScale,
      viewportY + viewY / zoom / viewScale,
    ];
  }

  toModelCoordFromClientCoord([x, y]: IVec): IVec {
    const { left, top } = this;
    return this.toModelCoord(x - left, y - top);
  }

  toViewBound(bound: Bound) {
    const { w, h } = bound;
    const [x, y] = this.toViewCoord(bound.x, bound.y);

    return new Bound(x, y, w * this.zoom, h * this.zoom);
  }

  toViewCoord(modelX: number, modelY: number): IVec {
    const { viewportX, viewportY, zoom, viewScale } = this;
    return [
      (modelX - viewportX) * zoom * viewScale,
      (modelY - viewportY) * zoom * viewScale,
    ];
  }

  toViewCoordFromClientCoord([x, y]: IVec): IVec {
    const { left, top } = this;
    return [x - left, y - top];
  }
}
