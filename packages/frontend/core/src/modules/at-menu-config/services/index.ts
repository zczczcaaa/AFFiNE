import { I18n, i18nTime } from '@affine/i18n';
import track from '@affine/track';
import {
  type AffineInlineEditor,
  type LinkedMenuGroup,
  type LinkedMenuItem,
  type LinkedWidgetConfig,
  LinkedWidgetUtils,
} from '@blocksuite/affine/blocks';
import type { EditorHost } from '@blocksuite/block-std';
import { DateTimeIcon } from '@blocksuite/icons/lit';
import type { DocMeta } from '@blocksuite/store';
import { signal } from '@preact/signals-core';
import type { WorkspaceService } from '@toeverything/infra';
import { Service } from '@toeverything/infra';
import { cssVarV2 } from '@toeverything/theme/v2';
import dayjs from 'dayjs';
import { html } from 'lit';

import type { WorkspaceDialogService } from '../../dialogs';
import type { DocDisplayMetaService } from '../../doc-display-meta';
import { JOURNAL_DATE_FORMAT, type JournalService } from '../../journal';
import type { RecentDocsService } from '../../quicksearch';

const MAX_DOCS = 3;
const LOAD_CHUNK = 100;
export class AtMenuConfigService extends Service {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly journalService: JournalService,
    private readonly docDisplayMetaService: DocDisplayMetaService,
    private readonly dialogService: WorkspaceDialogService,
    private readonly recentDocsService: RecentDocsService,
    private readonly workspaceDialogService: WorkspaceDialogService
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

    // recent docs should be at the top
    const recentDocs = this.recentDocsService.getRecentDocs();

    const sortedRawMetas =
      query.trim().length === 0
        ? rawMetas.toSorted((a, b) => {
            const indexA = recentDocs.findIndex(doc => doc.id === a.id);
            const indexB = recentDocs.findIndex(doc => doc.id === b.id);

            if (indexA > -1 && indexB < 0) {
              return -1;
            } else if (indexA < 0 && indexB > -1) {
              return 1;
            } else if (indexA > -1 && indexB > -1) {
              return indexA - indexB;
            }

            return Number.MAX_SAFE_INTEGER;
          })
        : rawMetas;

    const docDisplayMetaService = this.docDisplayMetaService;

    const toDocItem = (meta: DocMeta): LinkedMenuItem | null => {
      if (isJournal(meta) && !meta.updatedDate) {
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
        name: title,
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

    (async () => {
      for (const [index, meta] of sortedRawMetas.entries()) {
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
      name: I18n.t('com.affine.editor.at-menu.link-to-doc'),
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

    const customNewDocItem: LinkedMenuItem = {
      ...newDocItem,
      name: I18n.t('com.affine.editor.at-menu.create-doc', {
        name: query || I18n.t('Untitled'),
      }),
    };

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
            LinkedWidgetUtils.insertLinkedNode({
              inlineEditor,
              docId: entryId,
            });
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
      items: [customNewDocItem, customImportItem],
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

          const id = this.workspaceDialogService.open('date-selector', {
            position: [x, y, width, height || 20],
            onSelect: date => {
              if (date) {
                onSelectDate(date);
                this.workspaceDialogService.close(id);
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
}

/**
 * Checks if the name is a fuzzy match of the query.
 *
 * @example
 * ```ts
 * const name = 'John Smith';
 * const query = 'js';
 * const isMatch = fuzzyMatch(name, query);
 * // isMatch: true
 * ```
 *
 * if initialMatch = true, the first char must match as well
 */
function fuzzyMatch(name: string, query: string, matchInitial?: boolean) {
  const pureName = name
    .trim()
    .toLowerCase()
    .split('')
    .filter(char => char !== ' ')
    .join('');

  const regex = new RegExp(
    query
      .split('')
      .filter(char => char !== ' ')
      .map(item => `${escapeRegExp(item)}.*`)
      .join(''),
    'i'
  );

  if (matchInitial && query.length > 0 && !pureName.startsWith(query[0])) {
    return false;
  }

  return regex.test(pureName);
}

function escapeRegExp(input: string) {
  // escape regex characters in the input string to prevent regex format errors
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// todo: infer locale from user's locale?
const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
    new Date(2024, index)
  )
);

// todo: infer locale from user's locale?
const weekDayNames = Array.from({ length: 7 }, (_, index) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(
    new Date(2024, 0, index)
  )
);

export function suggestJournalDate(query: string): {
  dateString: string;
  alias?: string;
} | null {
  // given a query string, suggest a journal date
  // if the query is empty or, starts with "t" AND matches today
  //   -> suggest today's date
  // if the query starts with "y" AND matches "yesterday"
  //   -> suggest yesterday's date
  // if the query starts with "l" AND matches last
  //   -> suggest last week's date
  // if the query starts with "n" AND matches "next"
  //   -> suggest next week's date
  // if the query starts with the first letter of a month and matches the month name
  //   -> if the trailing part matches a number
  //      -> suggest the date of the month
  //      -> otherwise, suggest the current day of the month
  // otherwise, return null
  query = query.trim().toLowerCase().split(' ').join('');

  if (query === '' || fuzzyMatch('today', query, true)) {
    return {
      dateString: dayjs().format(JOURNAL_DATE_FORMAT),
      alias: I18n.t('com.affine.today'),
    };
  }

  if (fuzzyMatch('tomorrow', query, true)) {
    return {
      dateString: dayjs().add(1, 'day').format(JOURNAL_DATE_FORMAT),
      alias: I18n.t('com.affine.tomorrow'),
    };
  }

  if (fuzzyMatch('yesterday', query, true)) {
    return {
      dateString: dayjs().subtract(1, 'day').format(JOURNAL_DATE_FORMAT),
      alias: I18n.t('com.affine.yesterday'),
    };
  }

  // next week dates, start from monday
  const nextWeekDates = Array.from({ length: 7 }, (_, index) =>
    dayjs()
      .add(1, 'week')
      .startOf('week')
      .add(index, 'day')
      .format(JOURNAL_DATE_FORMAT)
  ).map(date => ({
    dateString: date,
    alias: I18n.t('com.affine.next-week', {
      weekday: weekDayNames[dayjs(date).day()],
    }),
  }));

  const lastWeekDates = Array.from({ length: 7 }, (_, index) =>
    dayjs()
      .subtract(1, 'week')
      .startOf('week')
      .add(index, 'day')
      .format(JOURNAL_DATE_FORMAT)
  ).map(date => ({
    dateString: date,
    alias: I18n.t('com.affine.last-week', {
      weekday: weekDayNames[dayjs(date).day()],
    }),
  }));

  for (const date of [...nextWeekDates, ...lastWeekDates]) {
    const matched = fuzzyMatch(date.alias, query, true);
    if (matched) {
      return date;
    }
  }

  // if query is a string that starts with alphabet letters and/or numbers
  const regex = new RegExp(`^([a-z]+)(\\d*)$`, 'i');
  const matched = query.match(regex);

  if (matched) {
    const [_, letters, numbers] = matched;

    for (const month of monthNames) {
      const monthMatched = fuzzyMatch(month, letters, true);
      if (monthMatched) {
        let day = numbers ? parseInt(numbers) : dayjs().date();
        const invalidDay = day < 1 || day > 31;
        if (invalidDay) {
          // fallback to today's day
          day = dayjs().date();
        }
        const year = dayjs().year();
        return {
          dateString: dayjs(`${year}-${month}-${day}`).format(
            JOURNAL_DATE_FORMAT
          ),
        };
      }
    }
  }

  return null;
}
