import { OpConsumer, transfer } from '@toeverything/infra/op';
import type { Document } from '@toeverything/pdf-viewer';
import {
  createPDFium,
  PageRenderingflags,
  Runtime,
  Viewer,
} from '@toeverything/pdf-viewer';
import {
  BehaviorSubject,
  combineLatestWith,
  filter,
  from,
  map,
  Observable,
  ReplaySubject,
  share,
  switchMap,
} from 'rxjs';

import type { ClientOps } from './ops';
import type { PDFMeta, RenderPageOpts } from './types';

class PDFRendererBackend extends OpConsumer<ClientOps> {
  private readonly viewer$: Observable<Viewer> = from(
    createPDFium().then(pdfium => {
      return new Viewer(new Runtime(pdfium));
    })
  );

  private readonly binary$ = new BehaviorSubject<Uint8Array | null>(null);

  private readonly doc$ = this.binary$.pipe(
    filter(Boolean),
    combineLatestWith(this.viewer$),
    switchMap(([buffer, viewer]) => {
      return new Observable<Document | undefined>(observer => {
        const doc = viewer.open(buffer);

        if (!doc) {
          observer.error(new Error('Document not opened'));
          return;
        }

        observer.next(doc);

        return () => {
          doc.close();
        };
      });
    }),
    share({
      connector: () => new ReplaySubject(1),
    })
  );

  private readonly docInfo$: Observable<PDFMeta> = this.doc$.pipe(
    map(doc => {
      if (!doc) {
        throw new Error('Document not opened');
      }

      const firstPage = doc.page(0);
      if (!firstPage) {
        throw new Error('Document has no pages');
      }

      return {
        pageCount: doc.pageCount(),
        width: firstPage.width(),
        height: firstPage.height(),
      };
    })
  );

  open({ data }: { data: ArrayBuffer }) {
    this.binary$.next(new Uint8Array(data));
    return this.docInfo$;
  }

  render(opts: RenderPageOpts) {
    return this.doc$.pipe(
      combineLatestWith(this.viewer$),
      switchMap(([doc, viewer]) => {
        if (!doc) {
          throw new Error('Document not opened');
        }

        return from(this.renderPage(viewer, doc, opts));
      }),
      map(bitmap => {
        if (!bitmap) {
          throw new Error('Failed to render page');
        }

        return transfer({ ...opts, bitmap }, [bitmap]);
      })
    );
  }

  async renderPage(viewer: Viewer, doc: Document, opts: RenderPageOpts) {
    const page = doc.page(opts.pageNum);

    if (!page) return;

    const width = Math.ceil(opts.width * (opts.scale ?? 1));
    const height = Math.ceil(opts.height * (opts.scale ?? 1));

    const bitmap = viewer.createBitmap(width, height, 0);
    bitmap.fill(0, 0, width, height);
    page.render(
      bitmap,
      0,
      0,
      width,
      height,
      0,
      PageRenderingflags.REVERSE_BYTE_ORDER | PageRenderingflags.ANNOT
    );

    const data = new Uint8ClampedArray(bitmap.toUint8Array());
    const imageBitmap = await createImageBitmap(
      new ImageData(data, width, height)
    );

    bitmap.close();
    page.close();

    return imageBitmap;
  }

  override listen(): void {
    this.register('open', this.open.bind(this));
    this.register('render', this.render.bind(this));
    super.listen();
  }
}

// @ts-expect-error how could we get correct postMessage signature for worker, exclude `window.postMessage`
new PDFRendererBackend(self).listen();
