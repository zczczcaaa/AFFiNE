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

  get hostRect() {
    return this.editorContainer.host!.getBoundingClientRect();
  }

  get hostLayout(): {
    section: SectionLayout;
    hostRect: DOMRect;
  } {
    const paragraphBlocks = this.editorContainer.host!.querySelectorAll(
      '.affine-paragraph-rich-text-wrapper [data-v-text="true"]'
    );

    const { viewport } = this;
    const zoom = this.viewport.zoom;
    const hostRect = this.hostRect;

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

  public async render(toScreen = true): Promise<void> {
    const { section } = this.hostLayout;
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
          this.canvas.style.width = this.hostRect.width + 'px';
          this.canvas.style.height = this.hostRect.height + 'px';
          this.canvas.width = this.hostRect.width * window.devicePixelRatio;
          this.canvas.height = this.hostRect.height * window.devicePixelRatio;

          if (!this.targetContainer.querySelector('canvas')) {
            this.targetContainer.append(this.canvas);
          }

          const ctx = this.canvas.getContext('2d');
          const bitmapCanvas = new OffscreenCanvas(
            section.rect.w * window.devicePixelRatio * this.viewport.zoom,
            section.rect.h * window.devicePixelRatio * this.viewport.zoom
          );
          const bitmapCtx = bitmapCanvas.getContext('bitmaprenderer');
          bitmapCtx?.transferFromImageBitmap(bitmap);

          if (!toScreen) {
            resolve();
            return;
          }

          const sectionViewCoord = this.viewport.toViewCoord(
            section.rect.x,
            section.rect.y
          );

          ctx?.drawImage(
            bitmapCanvas,
            sectionViewCoord[0] * window.devicePixelRatio,
            sectionViewCoord[1] * window.devicePixelRatio,
            section.rect.w * window.devicePixelRatio * this.viewport.zoom,
            section.rect.h * window.devicePixelRatio * this.viewport.zoom
          );

          resolve();
        }
      };
    });
  }

  public destroy() {
    this.worker.terminate();
  }
}
