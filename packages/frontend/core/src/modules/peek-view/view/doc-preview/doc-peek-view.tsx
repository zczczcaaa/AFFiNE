import { Scrollable } from '@affine/component';
import { PageDetailSkeleton } from '@affine/component/page-detail-skeleton';
import { AIProvider } from '@affine/core/blocksuite/ai';
import type { AffineEditorContainer } from '@affine/core/blocksuite/block-suite-editor';
import { EditorOutlineViewer } from '@affine/core/blocksuite/outline-viewer';
import { AffineErrorBoundary } from '@affine/core/components/affine/affine-error-boundary';
import { PageNotFound } from '@affine/core/desktop/pages/404';
import { EditorService } from '@affine/core/modules/editor';
import { GuardService } from '@affine/core/modules/permissions';
import { DebugLogger } from '@affine/debug';
import { GfxControllerIdentifier } from '@blocksuite/affine/block-std/gfx';
import { RefNodeSlotsProvider } from '@blocksuite/affine/blocks';
import {
  Bound,
  type Disposable,
  DisposableGroup,
} from '@blocksuite/affine/global/utils';
import {
  FrameworkScope,
  useLiveData,
  useService,
  useServices,
} from '@toeverything/infra';
import clsx from 'clsx';
import { lazy, Suspense, useCallback, useEffect } from 'react';

import { WorkbenchService } from '../../../workbench';
import type { DocReferenceInfo } from '../../entities/peek-view';
import { PeekViewService } from '../../services/peek-view';
import { useEditor } from '../utils';
import * as styles from './doc-peek-view.css';

const logger = new DebugLogger('doc-peek-view');

// Lazy load BlockSuiteEditor to break circular dependency
const BlockSuiteEditor = lazy(() =>
  import('@affine/core/blocksuite/block-suite-editor').then(module => ({
    default: module.BlockSuiteEditor,
  }))
);

function fitViewport(
  editor: AffineEditorContainer,
  xywh?: `[${number},${number},${number},${number}]`
) {
  try {
    if (!editor.host) {
      throw new Error('editor host is not ready');
    }

    const gfx = editor.host.std.get(GfxControllerIdentifier);
    const viewport = gfx.viewport;
    viewport.onResize();

    if (xywh) {
      const newViewport = {
        xywh: xywh,
        padding: [60, 20, 20, 20] as [number, number, number, number],
      };
      viewport.setViewportByBound(
        Bound.deserialize(newViewport.xywh),
        newViewport.padding,
        false
      );
    } else {
      gfx.fitToScreen({
        smooth: false,
      });
    }
  } catch (e) {
    logger.warn('failed to fitViewPort', e);
  }
}

function DocPeekPreviewEditor({
  xywh,
}: {
  xywh?: `[${number},${number},${number},${number}]`;
}) {
  const { editorService } = useServices({
    EditorService,
  });
  const editor = editorService.editor;
  const doc = editor.doc;
  const workspace = editor.doc.workspace;
  const mode = useLiveData(editor.mode$);
  const defaultOpenProperty = useLiveData(editor.defaultOpenProperty$);
  const workbench = useService(WorkbenchService).workbench;
  const peekView = useService(PeekViewService).peekView;
  const guardService = useService(GuardService);
  const editorElement = useLiveData(editor.editorContainer$);

  const isInTrash = useLiveData(doc.record.trash$);

  const handleOnEditorReady = useCallback(
    (editorContainer: AffineEditorContainer) => {
      const disposableGroup = new DisposableGroup();
      const refNodeSlots =
        editorContainer.std.getOptional(RefNodeSlotsProvider);
      if (!refNodeSlots) return;
      // doc change event inside peek view should be handled by peek view
      disposableGroup.add(
        // todo(@pengx17): seems not working
        refNodeSlots.docLinkClicked.on(options => {
          if (options.host !== editorContainer.host) {
            return;
          }
          peekView
            .open({
              docRef: { docId: options.pageId },
              ...options.params,
            })
            .catch(console.error);
        })
      );

      const unbind = editor.bindEditorContainer(editorContainer);

      if (mode === 'edgeless') {
        fitViewport(editorContainer, xywh);
      }

      return () => {
        unbind();
        disposableGroup.dispose();
      };
    },
    [editor, mode, peekView, xywh]
  );

  useEffect(() => {
    const disposables: Disposable[] = [];
    const openHandler = () => {
      if (doc) {
        workbench.openDoc(doc.id);
        peekView.close();
        // chat panel open is already handled in <DetailPageImpl />
      }
    };
    disposables.push(AIProvider.slots.requestOpenWithChat.on(openHandler));
    disposables.push(AIProvider.slots.requestSendWithChat.on(openHandler));
    return () => disposables.forEach(d => d.dispose());
  }, [doc, peekView, workbench, workspace.id]);

  const openOutlinePanel = useCallback(() => {
    workbench.openDoc(doc.id);
    workbench.openSidebar();
    workbench.activeView$.value.activeSidebarTab('outline');
    peekView.close();
  }, [doc, peekView, workbench]);

  const canEdit = useLiveData(guardService.can$('Doc_Update', doc.id));

  const readonly = !canEdit || isInTrash;

  return (
    <AffineErrorBoundary>
      <Scrollable.Root>
        <Scrollable.Viewport
          className={clsx('affine-page-viewport', styles.affineDocViewport)}
        >
          <Suspense fallback={<PageDetailSkeleton />}>
            <BlockSuiteEditor
              className={styles.editor}
              mode={mode}
              page={doc.blockSuiteDoc}
              readonly={readonly}
              onEditorReady={handleOnEditorReady}
              defaultOpenProperty={defaultOpenProperty}
            />
          </Suspense>
        </Scrollable.Viewport>
        <Scrollable.Scrollbar />
      </Scrollable.Root>
      {!BUILD_CONFIG.isMobileEdition && !BUILD_CONFIG.isMobileWeb ? (
        <EditorOutlineViewer
          editor={editorElement?.host ?? null}
          show={mode === 'page'}
          openOutlinePanel={openOutlinePanel}
        />
      ) : null}
    </AffineErrorBoundary>
  );
}

export function DocPeekPreview({
  docRef,
  animating,
}: {
  docRef: DocReferenceInfo;
  animating?: boolean;
}) {
  const {
    docId,
    blockIds,
    elementIds,
    mode,
    xywh,
    databaseId,
    databaseDocId,
    databaseRowId,
  } = docRef;
  const { doc, editor, loading } = useEditor(
    docId,
    mode,
    {
      blockIds,
      elementIds,
    },
    databaseId && databaseRowId && databaseDocId
      ? {
          docId: databaseDocId,
          databaseId,
          databaseRowId,
          type: 'database',
        }
      : undefined,
    !animating
  );

  // if sync engine has been synced and the page is null, show 404 page.
  if (!doc || !editor) {
    return loading ? (
      <PageDetailSkeleton key="current-page-is-null" />
    ) : (
      <PageNotFound noPermission />
    );
  }

  return (
    <FrameworkScope scope={doc.scope}>
      <FrameworkScope scope={editor.scope}>
        <DocPeekPreviewEditor xywh={xywh} />
      </FrameworkScope>
    </FrameworkScope>
  );
}
