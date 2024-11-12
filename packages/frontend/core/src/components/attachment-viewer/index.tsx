import { ViewBody, ViewHeader } from '@affine/core/modules/workbench';
import type { AttachmentBlockModel } from '@blocksuite/affine/blocks';

import { AttachmentPreviewErrorBoundary, Error } from './error';
import { PDFViewer } from './pdf-viewer';
import * as styles from './styles.css';
import { Titlebar } from './titlebar';
import { buildAttachmentProps } from './utils';

export type AttachmentViewerProps = {
  model: AttachmentBlockModel;
};

// In Peek view
export const AttachmentViewer = ({ model }: AttachmentViewerProps) => {
  const props = buildAttachmentProps(model);

  return (
    <div className={styles.viewerContainer}>
      <Titlebar {...props} />
      {model.type.endsWith('pdf') ? (
        <AttachmentPreviewErrorBoundary>
          <PDFViewer {...props} />
        </AttachmentPreviewErrorBoundary>
      ) : (
        <Error {...props} />
      )}
    </div>
  );
};

// In View container
export const AttachmentViewerView = ({ model }: AttachmentViewerProps) => {
  const props = buildAttachmentProps(model);

  return (
    <>
      <ViewHeader>
        <Titlebar {...props} />
      </ViewHeader>
      <ViewBody>
        {model.type.endsWith('pdf') ? (
          <AttachmentPreviewErrorBoundary>
            <PDFViewer {...props} />
          </AttachmentPreviewErrorBoundary>
        ) : (
          <Error {...props} />
        )}
      </ViewBody>
    </>
  );
};
