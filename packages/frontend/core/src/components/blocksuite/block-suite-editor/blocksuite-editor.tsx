import { useRefEffect } from '@affine/component';
import { EditorLoading } from '@affine/component/page-detail-skeleton';
import {
  customImageProxyMiddleware,
  type DocMode,
  ImageBlockService,
  LinkPreviewerService,
} from '@blocksuite/affine/blocks';
import { DisposableGroup } from '@blocksuite/affine/global/utils';
import type { AffineEditorContainer } from '@blocksuite/affine/presets';
import type { Store } from '@blocksuite/affine/store';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

import type { DefaultOpenProperty } from '../../doc-properties';
import { BlocksuiteEditorContainer } from './blocksuite-editor-container';
import { NoPageRootError } from './no-page-error';

export type EditorProps = {
  page: Store;
  mode: DocMode;
  shared?: boolean;
  defaultOpenProperty?: DefaultOpenProperty;
  // on Editor ready
  onEditorReady?: (editor: AffineEditorContainer) => (() => void) | void;
  style?: CSSProperties;
  className?: string;
};

const BlockSuiteEditorImpl = ({
  mode,
  page,
  className,
  shared,
  style,
  onEditorReady,
  defaultOpenProperty,
}: EditorProps) => {
  useEffect(() => {
    const disposable = page.slots.blockUpdated.once(() => {
      page.workspace.meta.setDocMeta(page.id, {
        updatedDate: Date.now(),
      });
    });
    return () => {
      disposable.dispose();
    };
  }, [page]);

  const editorRef = useRefEffect(
    (editor: AffineEditorContainer) => {
      globalThis.currentEditor = editor;
      let canceled = false;
      const disposableGroup = new DisposableGroup();

      if (onEditorReady) {
        // Invoke onLoad once the editor has been mounted to the DOM.
        editor.updateComplete
          .then(() => {
            if (canceled) {
              return;
            }
            // host should be ready

            // provide image proxy endpoint to blocksuite
            editor.host?.std.clipboard.use(
              customImageProxyMiddleware(BUILD_CONFIG.imageProxyUrl)
            );
            ImageBlockService.setImageProxyURL(BUILD_CONFIG.imageProxyUrl);

            editor.host?.doc
              .get(LinkPreviewerService)
              .setEndpoint(BUILD_CONFIG.linkPreviewUrl);

            return editor.host?.updateComplete;
          })
          .then(() => {
            if (canceled) {
              return;
            }
            const dispose = onEditorReady(editor);
            if (dispose) {
              disposableGroup.add(dispose);
            }
          })
          .catch(console.error);
      }

      return () => {
        canceled = true;
        disposableGroup.dispose();
      };
    },
    [onEditorReady, page]
  );

  return (
    <BlocksuiteEditorContainer
      mode={mode}
      page={page}
      shared={shared}
      defaultOpenProperty={defaultOpenProperty}
      ref={editorRef}
      className={className}
      style={style}
    />
  );
};

export const BlockSuiteEditor = (props: EditorProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (props.page.root) {
      setIsLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      disposable.dispose();
      setError(new NoPageRootError(props.page));
    }, 20 * 1000);
    const disposable = props.page.slots.rootAdded.once(() => {
      setIsLoading(false);
      clearTimeout(timer);
    });
    return () => {
      disposable.dispose();
      clearTimeout(timer);
    };
  }, [props.page]);

  if (error) {
    throw error;
  }

  return isLoading ? (
    <EditorLoading />
  ) : (
    <BlockSuiteEditorImpl key={props.page.id} {...props} />
  );
};
