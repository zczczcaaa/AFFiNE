import { GfxControllerIdentifier } from '@blocksuite/block-std/gfx';
import type { AffineEditorContainer } from '@blocksuite/presets';

import { getSentenceRects, segmentSentences } from './text-utils.js';
import {
  type ParagraphLayout,
  type SectionLayout,
  type ViewportState,
} from './types.js';

export class CanvasRenderer {
  private readonly worker: Worker;
  private readonly editorContainer: AffineEditorContainer;
  private readonly targetContainer: HTMLElement;
  public readonly canvas: HTMLCanvasElement = document.createElement('canvas');
  private lastZoom: number | null = null;
  private lastSection: SectionLayout | null = null;
  private lastBitmap: ImageBitmap | null = null;
  private lastMode: 'page' | 'edgeless' = 'edgeless';

  constructor(
    editorContainer: AffineEditorContainer,
    targetContainer: HTMLElement
  ) {
    this.editorContainer = editorContainer;
    this.targetContainer = targetContainer;

    this.worker = new Worker(new URL('./canvas.worker.ts', import.meta.url), {
      type: 'module',
    });
  }

  private initWorkerSize(width: number, height: number) {
    const dpr = window.devicePixelRatio;
    const viewport = this.editorContainer.std.get(
      GfxControllerIdentifier
    ).viewport;
    const viewportState: ViewportState = {
      zoom: viewport.zoom,
      viewScale: viewport.viewScale,
      viewportX: viewport.viewportX,
      viewportY: viewport.viewportY,
    };
    this.worker.postMessage({
      type: 'init',
      data: { width, height, dpr, viewport: viewportState },
    });
  }

  get viewport() {
    return this.editorContainer.std.get(GfxControllerIdentifier).viewport;
  }

  getHostRect() {
    return this.editorContainer.host!.getBoundingClientRect();
  }

  getHostLayout() {
    const paragraphBlocks = this.editorContainer.host!.querySelectorAll(
      '.affine-paragraph-rich-text-wrapper [data-v-text="true"]'
    );

    const { viewport } = this;
    const zoom = this.viewport.zoom;
    const hostRect = this.getHostRect();

    let sectionMinX = Infinity;
    let sectionMinY = Infinity;
    let sectionMaxX = -Infinity;
    let sectionMaxY = -Infinity;

    const paragraphs: ParagraphLayout[] = Array.from(paragraphBlocks).map(p => {
      const sentences = segmentSentences(p.textContent || '');
      const sentenceLayouts = sentences.map(sentence => {
        const rects = getSentenceRects(p, sentence);
        rects.forEach(({ rect }) => {
          sectionMinX = Math.min(sectionMinX, rect.x);
          sectionMinY = Math.min(sectionMinY, rect.y);
          sectionMaxX = Math.max(sectionMaxX, rect.x + rect.w);
          sectionMaxY = Math.max(sectionMaxY, rect.y + rect.h);
        });
        return {
          text: sentence,
          rects: rects.map(rect => {
            const [x, y] = viewport.toModelCoordFromClientCoord([
              rect.rect.x,
              rect.rect.y,
            ]);
            return {
              ...rect,
              rect: {
                x,
                y,
                w: rect.rect.w / zoom / viewport.viewScale,
                h: rect.rect.h / zoom / viewport.viewScale,
              },
            };
          }),
        };
      });

      return {
        sentences: sentenceLayouts,
        zoom,
      };
    });

    if (paragraphs.length === 0) return null;

    const sectionModelCoord = viewport.toModelCoordFromClientCoord([
      sectionMinX,
      sectionMinY,
    ]);
    const section: SectionLayout = {
      paragraphs,
      rect: {
        x: sectionModelCoord[0],
        y: sectionModelCoord[1],
        w: (sectionMaxX - sectionMinX) / zoom / viewport.viewScale,
        h: (sectionMaxY - sectionMinY) / zoom / viewport.viewScale,
      },
    };

    return { section, hostRect };
  }

  public async render(): Promise<void> {
    const hostLayout = this.getHostLayout();
    if (!hostLayout) return;

    const { section } = hostLayout;
    const currentZoom = this.viewport.zoom;

    // Use bitmap cache
    if (
      this.lastZoom === currentZoom &&
      this.lastSection &&
      this.lastBitmap &&
      this.lastMode === this.editorContainer.mode
    ) {
      this.drawBitmap(this.lastBitmap, this.lastSection);
      return;
    }

    // Need to re-render if zoom changed or no cached bitmap
    this.initWorkerSize(section.rect.w, section.rect.h);

    return new Promise(resolve => {
      if (!this.worker) return;

      this.worker.postMessage({
        type: 'draw',
        data: {
          section,
        },
      });

      this.worker.onmessage = (e: MessageEvent) => {
        const { type, bitmap } = e.data;
        if (type === 'render') {
          const hostRect = this.getHostRect();
          this.canvas.style.width = hostRect.width + 'px';
          this.canvas.style.height = hostRect.height + 'px';
          this.canvas.width = hostRect.width * window.devicePixelRatio;
          this.canvas.height = hostRect.height * window.devicePixelRatio;

          if (!this.targetContainer.querySelector('canvas')) {
            this.targetContainer.append(this.canvas);
          }

          // Create a copy of bitmap for caching
          const tempCanvas = new OffscreenCanvas(bitmap.width, bitmap.height);
          const tempCtx = tempCanvas.getContext('2d')!;
          tempCtx.drawImage(bitmap, 0, 0);
          const bitmapCopy = tempCanvas.transferToImageBitmap();

          // Cache the current state
          this.lastZoom = currentZoom;
          this.lastSection = section;
          this.lastMode = this.editorContainer.mode;
          if (this.lastBitmap) {
            this.lastBitmap.close();
          }
          this.lastBitmap = bitmapCopy;

          this.drawBitmap(bitmap, section);
          resolve();
        }
      };
    });
  }

  private drawBitmap(bitmap: ImageBitmap, section: SectionLayout) {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const bitmapCanvas = new OffscreenCanvas(
      section.rect.w * window.devicePixelRatio * this.viewport.zoom,
      section.rect.h * window.devicePixelRatio * this.viewport.zoom
    );
    const bitmapCtx = bitmapCanvas.getContext('bitmaprenderer');
    if (!bitmapCtx) return;

    const tempCanvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(bitmap, 0, 0);
    const bitmapCopy = tempCanvas.transferToImageBitmap();

    bitmapCtx.transferFromImageBitmap(bitmapCopy);

    const sectionViewCoord = this.viewport.toViewCoord(
      section.rect.x,
      section.rect.y
    );

    ctx.drawImage(
      bitmapCanvas,
      sectionViewCoord[0] * window.devicePixelRatio,
      sectionViewCoord[1] * window.devicePixelRatio,
      section.rect.w * window.devicePixelRatio * this.viewport.zoom,
      section.rect.h * window.devicePixelRatio * this.viewport.zoom
    );
  }

  public destroy() {
    if (this.lastBitmap) {
      this.lastBitmap.close();
    }
    this.worker.terminate();
  }
}
