import { IconButton, observeIntersection } from '@affine/component';
import {
  type PDF,
  type PDFPage,
  PDFService,
  PDFStatus,
} from '@affine/core/modules/pdf';
import { LoadingSvg, PDFPageCanvas } from '@affine/core/modules/pdf/views';
import { PeekViewService } from '@affine/core/modules/peek-view';
import { stopPropagation } from '@affine/core/utils';
import {
  ArrowDownSmallIcon,
  ArrowUpSmallIcon,
  AttachmentIcon,
  CenterPeekIcon,
} from '@blocksuite/icons/rc';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import { debounce } from 'lodash-es';
import {
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { PDFViewerProps } from './pdf-viewer';
import * as styles from './styles.css';
import * as embeddedStyles from './styles.embedded.css';

type PDFViewerEmbeddedInnerProps = PDFViewerProps;

export function PDFViewerEmbeddedInner({ model }: PDFViewerEmbeddedInnerProps) {
  const peekView = useService(PeekViewService).peekView;
  const pdfService = useService(PDFService);
  const [pdfEntity, setPdfEntity] = useState<{
    pdf: PDF;
    release: () => void;
  } | null>(null);
  const [pageEntity, setPageEntity] = useState<{
    page: PDFPage;
    release: () => void;
  } | null>(null);

  const meta = useLiveData(
    useMemo(() => {
      return pdfEntity
        ? pdfEntity.pdf.state$.map(s => {
            return s.status === PDFStatus.Opened
              ? s.meta
              : { pageCount: 0, width: 0, height: 0 };
          })
        : new LiveData({ pageCount: 0, width: 0, height: 0 });
    }, [pdfEntity])
  );
  const img = useLiveData(
    useMemo(() => {
      return pageEntity ? pageEntity.page.bitmap$ : null;
    }, [pageEntity])
  );

  const [isLoading, setIsLoading] = useState(true);
  const [cursor, setCursor] = useState(0);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [visibility, setVisibility] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const peek = useCallback(() => {
    const target = model.doc.getBlock(model.id);
    if (!target) return;
    peekView.open({ element: target }).catch(console.error);
  }, [peekView, model]);

  const navigator = useMemo(() => {
    const p = cursor - 1;
    const n = cursor + 1;

    return {
      prev: {
        disabled: p < 0,
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          setCursor(p);
        },
      },
      next: {
        disabled: n >= meta.pageCount,
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          setCursor(n);
        },
      },
      peek: {
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          peek();
        },
      },
    };
  }, [cursor, meta, peek]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = meta;
    if (width * height === 0) return;

    setIsLoading(false);

    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  }, [img, meta]);

  useEffect(() => {
    if (!visibility) return;
    if (!pageEntity) return;

    const { width, height } = meta;
    if (width * height === 0) return;

    pageEntity.page.render({ width, height, scale: 2 });

    return () => {
      pageEntity.page.render.unsubscribe();
    };
  }, [visibility, pageEntity, meta]);

  useEffect(() => {
    if (!visibility) return;
    if (!pdfEntity) return;

    const { width, height } = meta;
    if (width * height === 0) return;

    const pageEntity = pdfEntity.pdf.page(cursor, `${width}:${height}:2`);

    setPageEntity(pageEntity);

    return () => {
      pageEntity.release();
      setPageEntity(null);
    };
  }, [visibility, pdfEntity, cursor, meta]);

  useEffect(() => {
    if (!visibility) return;

    const pdfEntity = pdfService.get(model);

    setPdfEntity(pdfEntity);

    return () => {
      pdfEntity.release();
      setPdfEntity(null);
    };
  }, [model, pdfService, visibility]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    return observeIntersection(
      viewer,
      debounce(
        entry => {
          setVisibility(entry.isIntersecting);
        },
        377,
        {
          trailing: true,
        }
      )
    );
  }, []);

  return (
    <div ref={viewerRef} className={embeddedStyles.pdfContainer}>
      <main className={embeddedStyles.pdfViewer}>
        <div
          className={styles.pdfPage}
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            minHeight: '759px',
          }}
        >
          <PDFPageCanvas ref={canvasRef} />
          <LoadingSvg
            style={{
              position: 'absolute',
              visibility: isLoading ? 'visible' : 'hidden',
            }}
          />
        </div>

        <div className={embeddedStyles.pdfControls}>
          <IconButton
            size={16}
            icon={<ArrowUpSmallIcon />}
            className={embeddedStyles.pdfControlButton}
            onDoubleClick={stopPropagation}
            {...navigator.prev}
          />
          <IconButton
            size={16}
            icon={<ArrowDownSmallIcon />}
            className={embeddedStyles.pdfControlButton}
            onDoubleClick={stopPropagation}
            {...navigator.next}
          />
          <IconButton
            size={16}
            icon={<CenterPeekIcon />}
            className={embeddedStyles.pdfControlButton}
            onDoubleClick={stopPropagation}
            {...navigator.peek}
          />
        </div>
      </main>
      <footer className={embeddedStyles.pdfFooter}>
        <div
          className={clsx([embeddedStyles.pdfFooterItem, { truncate: true }])}
        >
          <AttachmentIcon />
          <span className={embeddedStyles.pdfTitle}>{model.name}</span>
        </div>
        <div
          className={clsx([
            embeddedStyles.pdfFooterItem,
            embeddedStyles.pdfPageCount,
          ])}
        >
          <span>{meta.pageCount > 0 ? cursor + 1 : '-'}</span>/
          <span>{meta.pageCount > 0 ? meta.pageCount : '-'}</span>
        </div>
      </footer>
    </div>
  );
}
