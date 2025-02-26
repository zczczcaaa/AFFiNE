import {
  type BlockStdScope,
  LifeCycleWatcher,
  LifeCycleWatcherIdentifier,
  StdIdentifier,
} from '@blocksuite/block-std';
import { GfxControllerIdentifier } from '@blocksuite/block-std/gfx';
import type { Container, ServiceIdentifier } from '@blocksuite/global/di';
import { debounce, DisposableGroup } from '@blocksuite/global/utils';
import { type Pane } from 'tweakpane';

import {
  debugLog,
  getViewportLayout,
  initTweakpane,
  syncCanvasSize,
} from './dom-utils.js';
import type { RenderingState, ViewportLayout } from './types.js';

export const ViewportTurboRendererIdentifier = LifeCycleWatcherIdentifier(
  'ViewportTurboRenderer'
) as ServiceIdentifier<ViewportTurboRendererExtension>;

interface Tile {
  bitmap: ImageBitmap;
  zoom: number;
}

// With high enough zoom, fallback to DOM rendering
const zoomThreshold = 1;

export class ViewportTurboRendererExtension extends LifeCycleWatcher {
  state: RenderingState = 'inactive';
  disposables = new DisposableGroup();
  private layoutVersion = 0;
  private readonly debug = false; // Toggle for debug logs

  static override setup(di: Container) {
    di.addImpl(ViewportTurboRendererIdentifier, this, [StdIdentifier]);
  }

  public readonly canvas: HTMLCanvasElement = document.createElement('canvas');
  private readonly worker: Worker;
  private layoutCache: ViewportLayout | null = null;
  private tile: Tile | null = null;
  private debugPane: Pane | null = null;

  constructor(std: BlockStdScope) {
    super(std);
    this.worker = new Worker(new URL('./painter.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.debugLog('Initialized ViewportTurboRenderer');
  }

  override mounted() {
    const mountPoint = document.querySelector('.affine-edgeless-viewport');
    if (mountPoint) {
      mountPoint.append(this.canvas);
      initTweakpane(this, mountPoint as HTMLElement);
    }

    this.viewport.elementReady.once(() => {
      syncCanvasSize(this.canvas, this.std.host);
      this.setState('pending');
      this.disposables.add(
        this.viewport.viewportUpdated.on(() => {
          this.refresh().catch(console.error);
        })
      );
    });

    this.disposables.add(
      this.std.store.slots.blockUpdated.on(() => {
        this.invalidate();
        this.debouncedRefresh();
      })
    );
  }

  override unmounted() {
    this.debugLog('Unmounting renderer');
    this.clearTile();
    if (this.debugPane) {
      this.debugPane.dispose();
      this.debugPane = null;
    }
    this.worker.terminate();
    this.canvas.remove();
    this.disposables.dispose();
    this.setState('inactive');
  }

  get viewport() {
    return this.std.get(GfxControllerIdentifier).viewport;
  }

  async refresh() {
    if (this.state === 'inactive') return;

    this.clearCanvas();
    if (this.viewport.zoom > zoomThreshold) {
      this.debugLog('Zoom above threshold, falling back to DOM rendering');
      this.setState('pending');
      return;
    } else if (this.canUseBitmapCache()) {
      this.debugLog('Using cached bitmap');
      this.drawCachedBitmap(this.layoutCache!);
      this.setState('ready');
    } else {
      if (!this.layoutCache) {
        this.updateLayoutCache();
      }
      const layout = this.layoutCache!;
      this.setState('rendering');
      await this.paintLayout(layout);
      this.drawCachedBitmap(layout);
      // State will be updated to 'ready' in handlePaintedBitmap if successful
    }
  }

  debouncedRefresh = debounce(
    () => {
      this.refresh().catch(console.error);
    },
    1000, // During this period, fallback to DOM
    { leading: false, trailing: true }
  );

  invalidate() {
    this.layoutVersion++;
    this.layoutCache = null;
    this.clearTile();
    this.clearCanvas(); // Should clear immediately after content updates
    this.setState('pending');
    this.debugLog(`Invalidated renderer (layoutVersion=${this.layoutVersion})`);
  }

  private debugLog(message: string): void {
    if (!this.debug) return;
    debugLog(message, this.state);
  }

  private updateLayoutCache() {
    const layout = getViewportLayout(this.std.host, this.viewport);
    this.layoutCache = layout;
    this.debugLog('Layout cache updated');
  }

  private clearTile() {
    if (this.tile) {
      this.tile.bitmap.close();
      this.tile = null;
      this.debugLog('Tile cleared');
    }
  }

  private async paintLayout(layout: ViewportLayout): Promise<void> {
    return new Promise(resolve => {
      if (!this.worker) return;

      const dpr = window.devicePixelRatio;
      const currentVersion = this.layoutVersion;

      this.debugLog(`Requesting bitmap painting (version=${currentVersion})`);
      this.worker.postMessage({
        type: 'paintLayout',
        data: {
          layout,
          width: layout.rect.w,
          height: layout.rect.h,
          dpr,
          zoom: this.viewport.zoom,
          version: currentVersion,
        },
      });

      this.worker.onmessage = (e: MessageEvent) => {
        if (e.data.type === 'bitmapPainted') {
          if (e.data.version === this.layoutVersion) {
            this.debugLog(
              `Bitmap painted successfully (version=${e.data.version})`
            );
            this.handlePaintedBitmap(e.data.bitmap, resolve);
          } else {
            this.debugLog(
              `Received outdated bitmap (got=${e.data.version}, current=${this.layoutVersion})`
            );
            e.data.bitmap.close();
            this.setState('pending');
            resolve();
          }
        }
      };
    });
  }

  private handlePaintedBitmap(bitmap: ImageBitmap, resolve: () => void) {
    if (this.tile) {
      this.tile.bitmap.close();
    }
    this.tile = {
      bitmap,
      zoom: this.viewport.zoom,
    };
    this.setState('ready');
    resolve();
  }

  private canUseBitmapCache(): boolean {
    return (
      !!this.layoutCache && !!this.tile && this.viewport.zoom === this.tile.zoom
    );
  }

  private clearCanvas() {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.debugLog('Canvas cleared');
  }

  private drawCachedBitmap(layout: ViewportLayout) {
    if (!this.tile) {
      this.debugLog('No cached bitmap available, requesting refresh');
      this.debouncedRefresh();
      return; // version mismatch
    }

    const bitmap = this.tile.bitmap;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    this.clearCanvas();
    const layoutViewCoord = this.viewport.toViewCoord(
      layout.rect.x,
      layout.rect.y
    );

    ctx.drawImage(
      bitmap,
      layoutViewCoord[0] * window.devicePixelRatio,
      layoutViewCoord[1] * window.devicePixelRatio,
      layout.rect.w * window.devicePixelRatio * this.viewport.zoom,
      layout.rect.h * window.devicePixelRatio * this.viewport.zoom
    );

    this.debugLog('Bitmap drawn to canvas');
  }

  setState(newState: RenderingState): void {
    if (this.state === newState) return;
    this.debugLog(`State change: ${this.state} -> ${newState}`);
    this.state = newState;
  }

  canOptimizeDOM(): boolean {
    const isReady = this.state === 'ready';
    const isBelowZoomThreshold = this.viewport.zoom <= zoomThreshold;
    const result = isReady && isBelowZoomThreshold;
    return result;
  }
}
