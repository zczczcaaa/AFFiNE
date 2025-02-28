import { DocsSearchService } from '@affine/core/modules/docs-search';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import { type ReactNode, useMemo } from 'react';

interface PagePreviewProps {
  pageId: string;
  emptyFallback?: ReactNode;
  fallback?: ReactNode;
}

const PagePreviewInner = ({
  pageId,
  emptyFallback,
  fallback,
}: PagePreviewProps) => {
  const docSummary = useService(DocsSearchService);
  const summary = useLiveData(
    useMemo(
      () => LiveData.from(docSummary.watchDocSummary(pageId), null),
      [docSummary, pageId]
    )
  );

  const res =
    summary === null ? fallback : summary === '' ? emptyFallback : summary;
  return res;
};

export const PagePreview = (props: PagePreviewProps) => {
  return <PagePreviewInner {...props} />;
};
