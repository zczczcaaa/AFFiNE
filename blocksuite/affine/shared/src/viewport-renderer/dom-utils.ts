import {
  GfxControllerIdentifier,
  type Viewport,
} from '@blocksuite/block-std/gfx';
import { Pane } from 'tweakpane';

import { getSentenceRects, segmentSentences } from './text-utils.js';
import type { ParagraphLayout, SectionLayout } from './types.js';
import type { ViewportTurboRendererExtension } from './viewport-renderer.js';

export function syncCanvasSize(canvas: HTMLCanvasElement, host: HTMLElement) {
  const hostRect = host.getBoundingClientRect();
  const dpr = window.devicePixelRatio;
  canvas.style.position = 'absolute';
  canvas.style.left = '0px';
  canvas.style.top = '0px';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.width = hostRect.width * dpr;
  canvas.height = hostRect.height * dpr;
  canvas.style.pointerEvents = 'none';
}

export function getSectionLayout(
  host: HTMLElement,
  viewport: Viewport
): SectionLayout {
  const paragraphBlocks = host.querySelectorAll(
    '.affine-paragraph-rich-text-wrapper [data-v-text="true"]'
  );

  const zoom = viewport.zoom;

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
  const w = (sectionMaxX - sectionMinX) / zoom / viewport.viewScale;
  const h = (sectionMaxY - sectionMinY) / zoom / viewport.viewScale;
  const section: SectionLayout = {
    paragraphs,
    rect: {
      x: sectionModelCoord[0],
      y: sectionModelCoord[1],
      w: Math.max(w, 0),
      h: Math.max(h, 0),
    },
  };
  return section;
}

export function initTweakpane(
  renderer: ViewportTurboRendererExtension,
  viewportElement: HTMLElement
) {
  const debugPane = new Pane({ container: viewportElement });
  const paneElement = debugPane.element;
  paneElement.style.position = 'absolute';
  paneElement.style.top = '10px';
  paneElement.style.right = '10px';
  paneElement.style.width = '250px';
  debugPane.title = 'Viewport Turbo Renderer';

  debugPane
    .addBinding({ paused: true }, 'paused', {
      label: 'Paused',
    })
    .on('change', ({ value }) => {
      renderer.state = value ? 'paused' : 'monitoring';
    });

  debugPane
    .addBinding({ keepDOM: true }, 'keepDOM', {
      label: 'Keep DOM',
    })
    .on('change', ({ value }) => {
      const container = viewportElement.querySelector('gfx-viewport')!;
      (container as HTMLElement).style.display = value ? 'block' : 'none';
    });

  debugPane.addButton({ title: 'Fit Viewport' }).on('click', () => {
    const gfx = renderer.std.get(GfxControllerIdentifier);
    gfx.fitToScreen();
  });

  debugPane.addButton({ title: 'Force Refresh' }).on('click', () => {
    renderer.refresh(true).catch(console.error);
  });
}
