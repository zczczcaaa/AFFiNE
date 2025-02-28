import type { AffineEditorContainer } from '@affine/core/blocksuite/block-suite-editor';
import type { DefaultOpenProperty } from '@affine/core/components/doc-properties';
import { GfxControllerIdentifier } from '@blocksuite/affine/block-std/gfx';
import {
  type DocMode,
  type DocTitle,
  FeatureFlagService as BSFeatureFlagService,
  HighlightSelection,
  type ReferenceParams,
} from '@blocksuite/affine/blocks';
import type { InlineEditor } from '@blocksuite/inline';
import { effect } from '@preact/signals-core';
import { Entity, LiveData } from '@toeverything/infra';
import { defaults, isEqual, omit } from 'lodash-es';
import { skip } from 'rxjs';

import type { DocService } from '../../doc';
import { AFFINE_FLAGS, type FeatureFlagService } from '../../feature-flag';
import { paramsParseOptions, preprocessParams } from '../../navigation/utils';
import type { WorkbenchView } from '../../workbench';
import type { WorkspaceService } from '../../workspace';
import { EditorScope } from '../scopes/editor';
import type { EditorSelector } from '../types';

export class Editor extends Entity {
  readonly scope = this.framework.createScope(EditorScope, {
    editor: this as Editor,
  });

  readonly mode$ = new LiveData<DocMode>('page');
  readonly selector$ = new LiveData<EditorSelector | undefined>(undefined);
  readonly doc = this.docService.doc;
  readonly isSharedMode =
    this.workspaceService.workspace.openOptions.isSharedMode;
  readonly editorContainer$ = new LiveData<AffineEditorContainer | null>(null);
  readonly defaultOpenProperty$ = new LiveData<DefaultOpenProperty | undefined>(
    undefined
  );
  workbenchView: WorkbenchView | null = null;
  scrollPosition: {
    page: number | null;
    edgeless: {
      centerX: number;
      centerY: number;
      zoom: number;
    } | null;
  } = {
    page: null,
    edgeless: null,
  };

  private readonly focusAt$ = LiveData.computed(get => {
    const selector = get(this.selector$);
    const mode = get(this.mode$);
    let id = selector?.blockIds?.[0];
    let key = 'blockIds';

    if (mode === 'edgeless') {
      const elementId = selector?.elementIds?.[0];
      if (elementId) {
        id = elementId;
        key = 'elementIds';
      }
    }

    if (!id) return null;

    return { id, key, mode, refreshKey: selector?.refreshKey };
  });

  isPresenting$ = new LiveData<boolean>(false);

  togglePresentation() {
    const gfx = this.editorContainer$.value?.host?.std.get(
      GfxControllerIdentifier
    );
    if (!gfx) return;
    gfx.tool.setTool({
      type: !this.isPresenting$.value ? 'frameNavigator' : 'default',
    });
  }

  setSelector(selector: EditorSelector | undefined) {
    this.selector$.next(selector);
  }

  toggleMode() {
    this.mode$.next(this.mode$.value === 'edgeless' ? 'page' : 'edgeless');
  }

  setMode(mode: DocMode) {
    this.mode$.next(mode);
  }

  setDefaultOpenProperty(defaultOpenProperty: DefaultOpenProperty | undefined) {
    this.defaultOpenProperty$.next(defaultOpenProperty);
  }

  /**
   * sync editor params with view query string
   *
   * this function will be called when editor is initialized with in a workbench view
   *
   * this won't be called in shared page.
   */
  bindWorkbenchView(view: WorkbenchView) {
    if (this.workbenchView) {
      throw new Error('already bound');
    }
    this.workbenchView = view;
    const savedScrollPosition = view.getScrollPosition() ?? null;
    if (typeof savedScrollPosition === 'number') {
      this.scrollPosition.page = savedScrollPosition;
    } else if (typeof savedScrollPosition === 'object') {
      this.scrollPosition.edgeless = savedScrollPosition;
    }

    const stablePrimaryMode = this.doc.getPrimaryMode();

    const viewParams$ = view
      .queryString$<ReferenceParams & { refreshKey?: string }>(
        paramsParseOptions
      )
      .map(preprocessParams)
      .map(params =>
        defaults(params, {
          mode: stablePrimaryMode || ('page' as DocMode),
        })
      );

    const editorParams$ = LiveData.computed(get => {
      return {
        mode: get(this.mode$),
        ...get(this.selector$),
      };
    });

    // prevent infinite loop
    let updating = false;

    const unsubscribeViewParams = viewParams$.subscribe(params => {
      if (updating) return;
      updating = true;
      // when view params changed, sync to editor
      try {
        const editorParams = editorParams$.value;
        if (params.mode !== editorParams.mode) {
          this.setMode(params.mode);
        }

        const selector = omit(params, ['mode']);
        if (!isEqual(selector, omit(editorParams, ['mode']))) {
          this.setSelector(selector);
        }
      } finally {
        updating = false;
      }
    });

    const unsubscribeEditorParams = editorParams$.subscribe(params => {
      if (updating) return;
      updating = true;
      try {
        // when editor params changed, sync to view
        if (!isEqual(params, viewParams$.value)) {
          const newQueryString: Record<string, string> = {};

          Object.entries(params).forEach(([k, v]) => {
            newQueryString[k] = Array.isArray(v) ? v.join(',') : v;
          });

          view.updateQueryString(newQueryString, { replace: true });
        }
      } finally {
        updating = false;
      }
    });

    return () => {
      this.workbenchView = null;
      unsubscribeEditorParams.unsubscribe();
      unsubscribeViewParams.unsubscribe();
    };
  }

  bindEditorContainer(
    editorContainer: AffineEditorContainer,
    docTitle?: DocTitle | null,
    scrollViewport?: HTMLElement | null
  ) {
    if (this.editorContainer$.value) {
      throw new Error('already bound');
    }

    this._setupBlocksuiteEditorFlags(editorContainer);
    this.editorContainer$.next(editorContainer);
    const unsubs: (() => void)[] = [];

    const gfx = editorContainer.host?.std.get(GfxControllerIdentifier);

    // ----- Scroll Position and Selection -----
    // if we have default scroll position, we should restore it
    if (this.mode$.value === 'page' && this.scrollPosition.page !== null) {
      scrollViewport?.scrollTo(0, this.scrollPosition.page);
    } else if (
      this.mode$.value === 'edgeless' &&
      this.scrollPosition.edgeless &&
      gfx
    ) {
      gfx.viewport.setViewport(this.scrollPosition.edgeless.zoom, [
        this.scrollPosition.edgeless.centerX,
        this.scrollPosition.edgeless.centerY,
      ]);
    } else {
      // if we don't have default scroll position, we should focus on the title
      const initialFocusAt = this.focusAt$.value;

      if (initialFocusAt === null) {
        const title = docTitle?.querySelector<
          HTMLElement & { inlineEditor: InlineEditor | null }
        >('rich-text');
        // Only focus on the title when it's empty on mobile edition.
        if (BUILD_CONFIG.isMobileEdition) {
          const titleText = this.doc.title$.value;
          if (!titleText?.length) {
            title?.inlineEditor?.focusEnd();
          }
        } else {
          title?.inlineEditor?.focusEnd();
        }
      } else {
        const selection = editorContainer.host?.std.selection;

        const { id, key, mode } = initialFocusAt;

        if (mode === this.mode$.value) {
          selection?.setGroup('scene', [
            selection?.create(HighlightSelection, {
              mode,
              [key]: [id],
            }),
          ]);
        }
      }
    }

    // update scroll position when scrollViewport scroll
    const saveScrollPosition = () => {
      if (this.mode$.value === 'page' && scrollViewport) {
        this.scrollPosition.page = scrollViewport.scrollTop;
        this.workbenchView?.setScrollPosition(scrollViewport.scrollTop);
      } else if (this.mode$.value === 'edgeless' && gfx) {
        const pos = {
          centerX: gfx.viewport.centerX,
          centerY: gfx.viewport.centerY,
          zoom: gfx.viewport.zoom,
        };
        this.scrollPosition.edgeless = pos;
        this.workbenchView?.setScrollPosition(pos);
      }
    };
    scrollViewport?.addEventListener('scroll', saveScrollPosition);
    unsubs.push(() => {
      scrollViewport?.removeEventListener('scroll', saveScrollPosition);
    });
    if (gfx) {
      unsubs.push(gfx.viewport.viewportUpdated.on(saveScrollPosition).dispose);
    }

    // update selection when focusAt$ changed
    const subscription = this.focusAt$
      .distinctUntilChanged(
        (a, b) =>
          a?.id === b?.id &&
          a?.key === b?.key &&
          a?.refreshKey === b?.refreshKey
      )
      .pipe(skip(1))
      .subscribe(anchor => {
        if (!anchor) return;

        const selection = editorContainer.host?.std.selection;
        if (!selection) return;

        const { id, key, mode } = anchor;

        selection.setGroup('scene', [
          selection.create(HighlightSelection, {
            mode,
            [key]: [id],
          }),
        ]);
      });
    unsubs.push(subscription.unsubscribe.bind(subscription));

    // ----- Presenting -----
    const edgelessPage = editorContainer.host?.querySelector(
      'affine-edgeless-root'
    );
    if (!edgelessPage) {
      this.isPresenting$.next(false);
    } else {
      this.isPresenting$.next(
        edgelessPage.gfx.tool.currentToolName$.peek() === 'frameNavigator'
      );

      const disposable = effect(() => {
        this.isPresenting$.next(
          edgelessPage.gfx.tool.currentToolName$.value === 'frameNavigator'
        );
      });
      unsubs.push(disposable);
    }

    return () => {
      this.editorContainer$.next(null);
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }

  private _setupBlocksuiteEditorFlags(editorContainer: AffineEditorContainer) {
    const affineFeatureFlagService = this.featureFlagService;
    const bsFeatureFlagService = editorContainer.doc.get(BSFeatureFlagService);
    Object.entries(AFFINE_FLAGS).forEach(([key, flag]) => {
      if (flag.category === 'blocksuite') {
        const value =
          affineFeatureFlagService.flags[key as keyof AFFINE_FLAGS].value;
        if (value !== undefined) {
          bsFeatureFlagService.setFlag(flag.bsFlag, value);
        }
      }
    });
  }

  constructor(
    private readonly docService: DocService,
    private readonly workspaceService: WorkspaceService,
    private readonly featureFlagService: FeatureFlagService
  ) {
    super();
  }
}
