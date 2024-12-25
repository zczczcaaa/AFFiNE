import { LoadingIcon } from '@affine/core/blocksuite/presets/blocks/_common/icon';
import { fuzzyMatch } from '@affine/core/utils/fuzzy-match';
import { I18n, i18nTime } from '@affine/i18n';
import track from '@affine/track';
import {
  type AffineInlineEditor,
  type DocMode,
  type LinkedMenuGroup,
  type LinkedMenuItem,
  type LinkedWidgetConfig,
  LinkedWidgetUtils,
} from '@blocksuite/affine/blocks';
import { Text } from '@blocksuite/affine/store';
import type { EditorHost } from '@blocksuite/block-std';
import {
  DateTimeIcon,
  NewXxxEdgelessIcon,
  NewXxxPageIcon,
} from '@blocksuite/icons/lit';
import type { DocMeta } from '@blocksuite/store';
import { signal } from '@preact/signals-core';
import { Service } from '@toeverything/infra';
import { cssVarV2 } from '@toeverything/theme/v2';
import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import type { WorkspaceDialogService } from '../../dialogs';
import type { DocsService } from '../../doc';
import type { DocDisplayMetaService } from '../../doc-display-meta';
import type { DocsSearchService } from '../../docs-search';
import type { EditorSettingService } from '../../editor-setting';
import { type JournalService, suggestJournalDate } from '../../journal';
import type { RecentDocsService } from '../../quicksearch';
import type { WorkspaceService } from '../../workspace';

const MAX_DOCS = 3;
const LOAD_CHUNK = 100;
export class AtMenuConfigService extends Service {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly journalService: JournalService,
    private readonly docDisplayMetaService: DocDisplayMetaService,
    private readonly dialogService: WorkspaceDialogService,
    private readonly recentDocsService: RecentDocsService,
    private readonly editorSettingService: EditorSettingService,
    private readonly docsService: DocsService,
    private readonly docsSearch: DocsSearchService
  ) {
    super();
  }

  // todo(@peng17): maybe refactor the config using entity, so that each config
  // can be reactive to the query, instead of recreating the whole config?
  getConfig(): Partial<LinkedWidgetConfig> {
    return {
      getMenus: this.getMenusFn(),
      mobile: this.getMobileConfig(),
    };
  }

  private insertDoc(inlineEditor: AffineInlineEditor, id: string) {
    LinkedWidgetUtils.insertLinkedNode({
      inlineEditor,
      docId: id,
    });
  }

  private linkToDocGroup(
    query: string,
    close: () => void,
    inlineEditor: AffineInlineEditor,
    abortSignal: AbortSignal
  ): LinkedMenuGroup {
    const currentWorkspace = this.workspaceService.workspace;
    const rawMetas = currentWorkspace.docCollection.meta.docMetas;
    const isJournal = (d: DocMeta) =>
      !!this.journalService.journalDate$(d.id).value;
    const docItems = signal<LinkedMenuItem[]>([]);

    const docDisplayMetaService = this.docDisplayMetaService;

    type DocMetaWithHighlights = DocMeta & {
      highlights: string | undefined;
    };

    const toDocItem = (meta: DocMetaWithHighlights): LinkedMenuItem | null => {
      if (isJournal(meta)) {
        return null;
      }

      if (meta.trash) {
        return null;
      }

      let title = docDisplayMetaService.title$(meta.id, {
        reference: true,
      }).value;

      if (typeof title === 'object' && 'i18nKey' in title) {
        title = I18n.t(title);
      }

      if (!fuzzyMatch(title, query)) {
        return null;
      }

      return {
        name: meta.highlights ? html`${unsafeHTML(meta.highlights)}` : title,
        key: meta.id,
        icon: docDisplayMetaService
          .icon$(meta.id, {
            type: 'lit',
            reference: true,
          })
          .value(),
        action: () => {
          close();
          track.doc.editor.atMenu.linkDoc();
          this.insertDoc(inlineEditor, meta.id);
        },
      };
    };

    const showRecent = query.trim().length === 0;

    (async () => {
      const isIndexerLoading =
        this.docsSearch.indexer.status$.value.remaining !== undefined &&
        this.docsSearch.indexer.status$.value.remaining > 0;

      if (!showRecent && isIndexerLoading) {
        // add a loading item
        docItems.value = [
          {
            key: 'loading',
            name: I18n.t('com.affine.editor.at-menu.loading'),
            icon: LoadingIcon,
            action: () => {
              // no action
            },
          },
        ];
        // wait for indexer to finish
        await this.docsSearch.indexer.status$.waitFor(
          status => status.remaining === 0
        );
        // remove the loading item
        docItems.value = [];
      }

      const docMetas = (
        showRecent
          ? this.recentDocsService.getRecentDocs()
          : await this.searchDocs(query)
      )
        .map(doc => {
          const meta = rawMetas.find(meta => meta.id === doc.id);

          if (!meta) {
            return null;
          }

          const highlights = 'highlights' in doc ? doc.highlights : undefined;
          return {
            ...meta,
            highlights,
          };
        })
        .filter((m): m is DocMetaWithHighlights => !!m);

      for (const [index, meta] of docMetas.entries()) {
        if (abortSignal.aborted) {
          return;
        }

        const item = toDocItem(meta);
        if (item) {
          docItems.value = [...docItems.value, item];
        }

        if (index % LOAD_CHUNK === 0) {
          // use scheduler.yield?
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    })().catch(console.error);

    return {
      name: showRecent
        ? I18n.t('com.affine.editor.at-menu.recent-docs')
        : I18n.t('com.affine.editor.at-menu.link-to-doc', {
            query,
          }),
      items: docItems,
      maxDisplay: MAX_DOCS,
      get overflowText() {
        const overflowCount = docItems.value.length - MAX_DOCS;
        return I18n.t('com.affine.editor.at-menu.more-docs-hint', {
          count: overflowCount > 100 ? '100+' : overflowCount,
        });
      },
    };
  }

  private newDocMenuGroup(
    query: string,
    close: () => void,
    editorHost: EditorHost,
    inlineEditor: AffineInlineEditor
  ): LinkedMenuGroup {
    const originalNewDocMenuGroup = LinkedWidgetUtils.createNewDocMenuGroup(
      query,
      close,
      editorHost,
      inlineEditor
    );

    // Patch the import item, to use the custom import dialog.
    const items = Array.isArray(originalNewDocMenuGroup.items)
      ? originalNewDocMenuGroup.items
      : originalNewDocMenuGroup.items.value;

    const newDocItem = items.find(item => item.key === 'create');
    const importItem = items.find(item => item.key === 'import');

    // should have both new doc and import item
    if (!newDocItem || !importItem) {
      return originalNewDocMenuGroup;
    }

    const createPage = (mode: DocMode) => {
      const page = this.docsService.createDoc({
        docProps: {
          note: this.editorSettingService.editorSetting.get('affine:note'),
          page: { title: new Text(query) },
        },
        primaryMode: mode,
      });

      return page;
    };

    const customNewDocItems: LinkedMenuItem[] = [
      {
        key: 'create-page',
        icon: NewXxxPageIcon(),
        name: I18n.t('com.affine.editor.at-menu.create-page', {
          name: query || I18n.t('Untitled'),
        }),
        action: () => {
          close();
          const page = createPage('page');
          this.insertDoc(inlineEditor, page.id);
          track.doc.editor.atMenu.createDoc({
            mode: 'page',
          });
        },
      },
      {
        key: 'create-edgeless',
        icon: NewXxxEdgelessIcon(),
        name: I18n.t('com.affine.editor.at-menu.create-edgeless', {
          name: query || I18n.t('Untitled'),
        }),
        action: () => {
          close();
          const page = createPage('edgeless');
          this.insertDoc(inlineEditor, page.id);
          track.doc.editor.atMenu.createDoc({
            mode: 'edgeless',
          });
        },
      },
    ];
    const customImportItem: LinkedMenuItem = {
      ...importItem,
      name: I18n.t('com.affine.editor.at-menu.import'),
      action: () => {
        close();
        track.doc.editor.atMenu.import();
        this.dialogService.open('import', undefined, payload => {
          if (!payload) {
            return;
          }

          // If the imported file is a workspace file, insert the entry page node.
          const { docIds, entryId, isWorkspaceFile } = payload;
          if (isWorkspaceFile && entryId) {
            this.insertDoc(inlineEditor, entryId);
            return;
          }

          // Otherwise, insert all the doc nodes.
          for (const docId of docIds) {
            this.insertDoc(inlineEditor, docId);
          }
        });
      },
    };

    return {
      ...originalNewDocMenuGroup,
      name: I18n.t('com.affine.editor.at-menu.new-doc'),
      items: [...customNewDocItems, customImportItem],
    };
  }

  private journalGroup(
    query: string,
    close: () => void,
    inlineEditor: AffineInlineEditor
  ): LinkedMenuGroup {
    const suggestedDate = suggestJournalDate(query);

    const items: LinkedMenuItem[] = [
      {
        icon: DateTimeIcon(),
        key: 'date-picker',
        name: I18n.t('com.affine.editor.at-menu.date-picker'),
        action: () => {
          close();

          const getRect = () => {
            let rect = inlineEditor.getNativeRange()?.getBoundingClientRect();

            if (!rect || rect.width === 0 || rect.height === 0) {
              rect = inlineEditor.rootElement.getBoundingClientRect();
            }

            return rect;
          };

          const { x, y, width, height } = getRect();

          const id = this.dialogService.open('date-selector', {
            position: [x, y, width, height || 20],
            onSelect: date => {
              if (date) {
                onSelectDate(date);
                track.doc.editor.atMenu.linkDoc({
                  journal: true,
                  type: 'specific date',
                });
                this.dialogService.close(id);
              }
            },
          });
        },
      },
    ];

    const onSelectDate = (date: string) => {
      close();
      const doc = this.journalService.ensureJournalByDate(date);
      this.insertDoc(inlineEditor, doc.id);
    };

    if (suggestedDate) {
      const { dateString, alias } = suggestedDate;
      const dateDisplay = i18nTime(dateString, {
        absolute: { accuracy: 'day' },
      });

      const icon = this.docDisplayMetaService.getJournalIcon(dateString, {
        type: 'lit',
      });

      items.unshift({
        icon: icon(),
        key: dateString,
        name: alias
          ? html`${alias},
              <span style="color: ${cssVarV2('text/secondary')}"
                >${dateDisplay}</span
              >`
          : dateDisplay,
        action: () => {
          track.doc.editor.atMenu.linkDoc({
            journal: true,
            type: alias,
          });
          onSelectDate(dateString);
        },
      });
    }

    return {
      name: I18n.t('com.affine.editor.at-menu.journal'),
      items,
    };
  }

  private getMenusFn(): LinkedWidgetConfig['getMenus'] {
    return (query, close, editorHost, inlineEditor, abortSignal) => {
      return [
        this.journalGroup(query, close, inlineEditor),
        this.linkToDocGroup(query, close, inlineEditor, abortSignal),
        this.newDocMenuGroup(query, close, editorHost, inlineEditor),
      ];
    };
  }

  private getMobileConfig(): Partial<LinkedWidgetConfig['mobile']> {
    return {
      useScreenHeight: BUILD_CONFIG.isIOS,
      scrollContainer: window,
      scrollTopOffset: () => {
        const header = document.querySelector('header');
        if (!header) return 0;

        const { y, height } = header.getBoundingClientRect();
        return y + height;
      },
    };
  }

  // only search docs by title, excluding blocks
  private async searchDocs(query: string) {
    const { buckets } = await this.docsSearch.indexer.blockIndex.aggregate(
      {
        type: 'boolean',
        occur: 'must',
        queries: [
          {
            type: 'match',
            field: 'content',
            match: query,
          },
          {
            type: 'boolean',
            occur: 'should',
            queries: [
              {
                type: 'match',
                field: 'flavour',
                match: 'affine:page',
              },
            ],
          },
        ],
      },
      'docId',
      {
        hits: {
          fields: ['docId', 'content'],
          pagination: {
            limit: 1,
          },
          highlights: [
            {
              field: 'content',
              before: `<span style="color: ${cssVarV2('text/emphasis')}">`,
              end: '</span>',
            },
          ],
        },
      }
    );
    const result = buckets.map(bucket => {
      return {
        id: bucket.key,
        title: bucket.hits.nodes[0].fields.content,
        highlights: bucket.hits.nodes[0].highlights.content[0],
      };
    });
    return result;
  }
}
