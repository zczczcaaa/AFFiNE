import type { AttachmentBlockModel } from '@blocksuite/affine/blocks';

import { PDFViewerEmbeddedInner } from './pdf-viewer-embedded-inner';

export interface PDFViewerEmbeddedProps {
  model: AttachmentBlockModel;
  name: string;
  ext: string;
  size: string;
}

export function PDFViewerEmbedded(props: PDFViewerEmbeddedProps) {
  return <PDFViewerEmbeddedInner {...props} />;
}
