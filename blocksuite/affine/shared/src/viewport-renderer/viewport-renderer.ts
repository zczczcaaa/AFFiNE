import {
  type BlockStdScope,
  LifeCycleWatcher,
  LifeCycleWatcherIdentifier,
  StdIdentifier,
} from '@blocksuite/block-std';
import { GfxControllerIdentifier } from '@blocksuite/block-std/gfx';
import { type Container, type ServiceIdentifier } from '@blocksuite/global/di';
import { nextTick } from '@blocksuite/global/utils';
import { type Pane } from 'tweakpane';

import {
  getSectionLayout,
  initTweakpane,
  syncCanvasSize,
} from './dom-utils.js';
import { type SectionLayout } from './types.js';

export const ViewportTurboRendererIdentifier = LifeCycleWatcherIdentifier(
  'ViewportTurboRenderer'
) as ServiceIdentifier<ViewportTurboRendererExtension>;

interface Tile {
  bitmap: ImageBitmap;
}

export class ViewportTurboRendererExtension extends LifeCycleWatcher {
  state: 'monitoring' | 'paused' = 'paused';

  static override setup(di: Container) {
    di.addImpl(ViewportTurboRendererIdentifier, this, [StdIdentifier]);
  }

  public readonly canvas: HTMLCanvasElement = document.createElement('canvas');
  private readonly worker: Worker;
  private lastZoom: number | null = null;
  private lastSection: SectionLayout | null = null;
  private tile: Tile | null = null;
  private debugPane: Pane | null = null;

  constructor(std: BlockStdScope) {
    super(std);
    this.worker = new Worker(new URL('./painter.worker.ts', import.meta.url), {
      type: 'module',
    });
  }

  override mounted() {
    const viewportElement = document.querySelector('.affine-edgeless-viewport');
    if (viewportElement) {
      viewportElement.append(this.canvas);
      initTweakpane(viewportElement as HTMLElement, (value: boolean) => {
        this.state = value ? 'monitoring' : 'paused';
        this.canvas.style.display = value ? 'block' : 'none';
      });
    }
    syncCanvasSize(this.canvas, this.std.host);
    this.viewport.viewportUpdated.on(() => {
      this.refresh().catch(console.error);
    });

    document.fonts.load('15px Inter').then(() => {
      this.state = 'monitoring';
      this.refresh().catch(console.error);
    });
  }

  override unmounted() {
    if (this.tile) {
      this.tile.bitmap.close();
      this.tile = null;
    }
    if (this.debugPane) {
      this.debugPane.dispose();
      this.debugPane = null;
    }
    this.worker.terminate();
    this.canvas.remove();
  }

  get viewport() {
    return this.std.get(GfxControllerIdentifier).viewport;
  }

  private async refresh() {
    await nextTick(); // Improves stability during zooming

    if (this.canUseCache()) {
      this.drawCachedBitmap(this.lastSection!);
    } else {
      const section = getSectionLayout(this.std.host, this.viewport);
      await this.paintSection(section);
      this.lastSection = section;
      this.lastZoom = this.viewport.zoom;
      this.drawCachedBitmap(section);
    }
  }

  private async paintSection(section: SectionLayout): Promise<void> {
    return new Promise(resolve => {
      if (!this.worker) return;

      const dpr = window.devicePixelRatio;
      this.worker.postMessage({
        type: 'paintSection',
        data: {
          section,
          width: section.rect.w,
          height: section.rect.h,
          dpr,
          zoom: this.viewport.zoom,
        },
      });

      this.worker.onmessage = (e: MessageEvent) => {
        if (e.data.type === 'bitmapPainted') {
          this.handlePaintedBitmap(e.data.bitmap, section, resolve);
        }
      };
    });
  }

  private handlePaintedBitmap(
    bitmap: ImageBitmap,
    section: SectionLayout,
    resolve: () => void
  ) {
    if (this.tile) {
      this.tile.bitmap.close();
    }
    this.tile = { bitmap };
    this.drawCachedBitmap(section);
    resolve();
  }

  private canUseCache(): boolean {
    return (
      !!this.lastSection && !!this.tile && this.viewport.zoom === this.lastZoom
    );
  }

  private drawCachedBitmap(section: SectionLayout) {
    if (this.state === 'paused') return;

    const bitmap = this.tile!.bitmap;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const sectionViewCoord = this.viewport.toViewCoord(
      section.rect.x,
      section.rect.y
    );

    ctx.drawImage(
      bitmap,
      sectionViewCoord[0] * window.devicePixelRatio,
      sectionViewCoord[1] * window.devicePixelRatio,
      section.rect.w * window.devicePixelRatio * this.viewport.zoom,
      section.rect.h * window.devicePixelRatio * this.viewport.zoom
    );
  }
}
