import type {
  EdgelessEditor,
  PageEditor,
} from '@affine/core/blocksuite/editors';
import { FeatureFlagService } from '@affine/core/modules/feature-flag';
import type { BlockStdScope, EditorHost } from '@blocksuite/affine/block-std';
import {
  appendParagraphCommand,
  type DocMode,
  type DocTitle,
  focusBlockEnd,
  getLastNoteBlock,
  type RootBlockModel,
} from '@blocksuite/affine/blocks';
import { type Store } from '@blocksuite/affine/store';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import type React from 'react';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';

import type { DefaultOpenProperty } from '../../components/doc-properties';
import { BlocksuiteDocEditor, BlocksuiteEdgelessEditor } from './lit-adaper';
import * as styles from './styles.css';

interface BlocksuiteEditorContainerProps {
  page: Store;
  mode: DocMode;
  shared?: boolean;
  readonly?: boolean;
  className?: string;
  defaultOpenProperty?: DefaultOpenProperty;
  style?: React.CSSProperties;
}

export interface AffineEditorContainer extends HTMLElement {
  page: Store;
  doc: Store;
  docTitle: DocTitle;
  host?: EditorHost;
  model: RootBlockModel | null;
  updateComplete: Promise<boolean>;
  mode: DocMode;
  origin: HTMLDivElement;
  std: BlockStdScope;
}

export const BlocksuiteEditorContainer = forwardRef<
  AffineEditorContainer,
  BlocksuiteEditorContainerProps
>(function AffineEditorContainer(
  { page, mode, className, style, shared, readonly, defaultOpenProperty },
  ref
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PageEditor>(null);
  const docTitleRef = useRef<DocTitle>(null);
  const edgelessRef = useRef<EdgelessEditor>(null);
  const featureFlags = useService(FeatureFlagService).flags;
  const enableEditorRTL = useLiveData(featureFlags.enable_editor_rtl.$);

  /**
   * mimic an AffineEditorContainer using proxy
   */
  const affineEditorContainerProxy = useMemo(() => {
    const api = {
      get page() {
        return page;
      },
      get doc() {
        return page;
      },
      get docTitle() {
        return docTitleRef.current;
      },
      get host() {
        return (
          (mode === 'page'
            ? docRef.current?.host
            : edgelessRef.current?.host) ?? null
        );
      },
      get model() {
        return page.root as any;
      },
      get updateComplete() {
        return mode === 'page'
          ? docRef.current?.updateComplete
          : edgelessRef.current?.updateComplete;
      },
      get mode() {
        return mode;
      },
      get origin() {
        return rootRef.current;
      },
      get std() {
        return mode === 'page' ? docRef.current?.std : edgelessRef.current?.std;
      },
    };

    const proxy = new Proxy(api, {
      has(_, prop) {
        return (
          Reflect.has(api, prop) ||
          (rootRef.current ? Reflect.has(rootRef.current, prop) : false)
        );
      },
      get(_, prop) {
        if (Reflect.has(api, prop)) {
          return api[prop as keyof typeof api];
        }
        if (rootRef.current && Reflect.has(rootRef.current, prop)) {
          const maybeFn = Reflect.get(rootRef.current, prop);
          if (typeof maybeFn === 'function') {
            return maybeFn.bind(rootRef.current);
          } else {
            return maybeFn;
          }
        }
        return undefined;
      },
    }) as AffineEditorContainer;

    return proxy;
  }, [mode, page]);

  useImperativeHandle(ref, () => affineEditorContainerProxy, [
    affineEditorContainerProxy,
  ]);

  const handleClickPageModeBlank = useCallback(() => {
    if (shared || readonly || page.readonly) return;
    const std = affineEditorContainerProxy.host?.std;
    if (!std) {
      return;
    }
    const note = getLastNoteBlock(page);
    if (note) {
      const lastBlock = note.lastChild();
      if (
        lastBlock &&
        lastBlock.flavour === 'affine:paragraph' &&
        lastBlock.text?.length === 0
      ) {
        const focusBlock = std.view.getBlock(lastBlock.id) ?? undefined;
        std.command.exec(focusBlockEnd, {
          focusBlock,
          force: true,
        });
        return;
      }
    }

    std.command.exec(appendParagraphCommand);
  }, [affineEditorContainerProxy.host?.std, page, readonly, shared]);

  return (
    <div
      data-testid={`editor-${page.id}`}
      dir={enableEditorRTL ? 'rtl' : 'ltr'}
      className={clsx(
        `editor-wrapper ${mode}-mode`,
        styles.docEditorRoot,
        className
      )}
      data-affine-editor-container
      style={style}
      ref={rootRef}
    >
      {mode === 'page' ? (
        <BlocksuiteDocEditor
          shared={shared}
          page={page}
          ref={docRef}
          readonly={readonly}
          titleRef={docTitleRef}
          onClickBlank={handleClickPageModeBlank}
          defaultOpenProperty={defaultOpenProperty}
        />
      ) : (
        <BlocksuiteEdgelessEditor
          shared={shared}
          page={page}
          ref={edgelessRef}
        />
      )}
    </div>
  );
});
