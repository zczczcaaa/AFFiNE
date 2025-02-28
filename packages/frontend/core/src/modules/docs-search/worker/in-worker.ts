import type {
  AffineTextAttributes,
  AttachmentBlockModel,
  BookmarkBlockModel,
  EmbedBlockModel,
  ImageBlockModel,
  TableBlockModel,
} from '@blocksuite/affine/blocks';
import {
  defaultBlockMarkdownAdapterMatchers,
  InlineDeltaToMarkdownAdapterExtensions,
  MarkdownAdapter,
  MarkdownInlineToDeltaAdapterExtensions,
  TableModelFlavour,
} from '@blocksuite/affine/blocks';
import { Container } from '@blocksuite/affine/global/di';
import {
  createYProxy,
  type DraftModel,
  Transformer,
  type TransformerMiddleware,
  type YBlock,
} from '@blocksuite/affine/store';
import type { DeltaInsert } from '@blocksuite/inline';
import { Document } from '@toeverything/infra';
import { toHexString } from 'lib0/buffer.js';
import { digest as lib0Digest } from 'lib0/hash/sha256';
import { difference, uniq } from 'lodash-es';
import {
  applyUpdate,
  Array as YArray,
  Doc as YDoc,
  Map as YMap,
  Text as YText,
} from 'yjs';

import { getAFFiNEWorkspaceSchema } from '../../workspace/global-schema';
import { WorkspaceImpl } from '../../workspace/impls/workspace';
import type { BlockIndexSchema, DocIndexSchema } from '../schema';
import type {
  WorkerIngoingMessage,
  WorkerInput,
  WorkerOutgoingMessage,
  WorkerOutput,
} from './types';

const blocksuiteSchema = getAFFiNEWorkspaceSchema();

const LRU_CACHE_SIZE = 5;

// lru cache for ydoc instances, last used at the end of the array
const lruCache = [] as { doc: YDoc; hash: string }[];

async function digest(data: Uint8Array) {
  if (
    globalThis.crypto &&
    globalThis.crypto.subtle &&
    typeof globalThis.crypto.subtle.digest === 'function'
  ) {
    return new Uint8Array(
      await globalThis.crypto.subtle.digest('SHA-256', data)
    );
  }
  return lib0Digest(data);
}

async function getOrCreateCachedYDoc(data: Uint8Array) {
  try {
    const hash = toHexString(await digest(data));
    const cachedIndex = lruCache.findIndex(item => item.hash === hash);
    if (cachedIndex !== -1) {
      const cached = lruCache.splice(cachedIndex, 1)[0];
      lruCache.push(cached);
      return cached.doc;
    } else {
      const doc = new YDoc();
      if (!isEmptyUpdate(data)) {
        applyUpdate(doc, data);
      }
      lruCache.push({ doc, hash });
      return doc;
    }
  } finally {
    if (lruCache.length > LRU_CACHE_SIZE) {
      lruCache.shift();
    }
  }
}

interface BlockDocumentInfo {
  docId: string;
  blockId: string;
  content?: string | string[];
  flavour: string;
  blob?: string[];
  refDocId?: string[];
  ref?: string[];
  parentFlavour?: string;
  parentBlockId?: string;
  additional?: {
    databaseName?: string;
    displayMode?: string;
    noteBlockId?: string;
  };
  yblock: YMap<any>;
  markdownPreview?: string;
}

const bookmarkFlavours = new Set([
  'affine:bookmark',
  'affine:embed-youtube',
  'affine:embed-figma',
  'affine:embed-github',
  'affine:embed-loom',
]);

const markdownPreviewDocCollection = new WorkspaceImpl({
  id: 'indexer',
});

function generateMarkdownPreviewBuilder(
  yRootDoc: YDoc,
  workspaceId: string,
  blocks: BlockDocumentInfo[]
) {
  function yblockToDraftModal(yblock: YBlock): DraftModel | null {
    const flavour = yblock.get('sys:flavour') as string;
    const blockSchema = blocksuiteSchema.flavourSchemaMap.get(flavour);
    if (!blockSchema) {
      return null;
    }
    const keys = Array.from(yblock.keys())
      .filter(key => key.startsWith('prop:'))
      .map(key => key.substring(5));

    const props = Object.fromEntries(
      keys.map(key => [key, createYProxy(yblock.get(`prop:${key}`))])
    );

    return {
      ...props,
      id: yblock.get('sys:id') as string,
      flavour,
      children: [],
      role: blockSchema.model.role,
      version: (yblock.get('sys:version') as number) ?? blockSchema.version,
      keys: Array.from(yblock.keys())
        .filter(key => key.startsWith('prop:'))
        .map(key => key.substring(5)),
    } as DraftModel;
  }

  const titleMiddleware: TransformerMiddleware = ({ adapterConfigs }) => {
    const pages = yRootDoc.getMap('meta').get('pages');
    if (!(pages instanceof YArray)) {
      return;
    }
    for (const meta of pages.toArray()) {
      adapterConfigs.set(
        'title:' + meta.get('id'),
        meta.get('title')?.toString() ?? 'Untitled'
      );
    }
  };

  const baseUrl = `/workspace/${workspaceId}`;

  function getDocLink(docId: string, blockId: string) {
    const searchParams = new URLSearchParams();
    searchParams.set('blockIds', blockId);
    return `${baseUrl}/${docId}?${searchParams.toString()}`;
  }

  const docLinkBaseURLMiddleware: TransformerMiddleware = ({
    adapterConfigs,
  }) => {
    adapterConfigs.set('docLinkBaseUrl', baseUrl);
  };

  const container = new Container();
  [
    ...MarkdownInlineToDeltaAdapterExtensions,
    ...defaultBlockMarkdownAdapterMatchers,
    ...InlineDeltaToMarkdownAdapterExtensions,
  ].forEach(ext => {
    ext.setup(container);
  });

  const provider = container.provider();
  const markdownAdapter = new MarkdownAdapter(
    new Transformer({
      schema: getAFFiNEWorkspaceSchema(),
      blobCRUD: markdownPreviewDocCollection.blobSync,
      docCRUD: {
        create: (id: string) => markdownPreviewDocCollection.createDoc({ id }),
        get: (id: string) => markdownPreviewDocCollection.getDoc(id),
        delete: (id: string) => markdownPreviewDocCollection.removeDoc(id),
      },
      middlewares: [docLinkBaseURLMiddleware, titleMiddleware],
    }),
    provider
  );

  const markdownPreviewCache = new WeakMap<BlockDocumentInfo, string | null>();

  function trimCodeBlock(markdown: string) {
    const lines = markdown.split('\n').filter(line => line.trim() !== '');
    if (lines.length > 5) {
      return [...lines.slice(0, 4), '...', lines.at(-1), ''].join('\n');
    }
    return [...lines, ''].join('\n');
  }

  function trimParagraph(markdown: string) {
    const lines = markdown.split('\n').filter(line => line.trim() !== '');

    if (lines.length > 3) {
      return [...lines.slice(0, 3), '...', lines.at(-1), ''].join('\n');
    }

    return [...lines, ''].join('\n');
  }

  function getListDepth(block: BlockDocumentInfo) {
    let parentBlockCount = 0;
    let currentBlock: BlockDocumentInfo | undefined = block;
    do {
      currentBlock = blocks.find(
        b => b.blockId === currentBlock?.parentBlockId
      );

      // reach the root block. do not count it.
      if (!currentBlock || currentBlock.flavour !== 'affine:list') {
        break;
      }
      parentBlockCount++;
    } while (currentBlock);
    return parentBlockCount;
  }

  // only works for list block
  function indentMarkdown(markdown: string, depth: number) {
    if (depth <= 0) {
      return markdown;
    }

    return (
      markdown
        .split('\n')
        .map(line => '    '.repeat(depth) + line)
        .join('\n') + '\n'
    );
  }

  const generateDatabaseMarkdownPreview = (block: BlockDocumentInfo) => {
    const isDatabaseBlock = (block: BlockDocumentInfo) => {
      return block.flavour === 'affine:database';
    };

    const model = yblockToDraftModal(block.yblock);

    if (!model) {
      return null;
    }

    let dbBlock: BlockDocumentInfo | null = null;

    if (isDatabaseBlock(block)) {
      dbBlock = block;
    } else {
      const parentBlock = blocks.find(b => b.blockId === block.parentBlockId);

      if (parentBlock && isDatabaseBlock(parentBlock)) {
        dbBlock = parentBlock;
      }
    }

    if (!dbBlock) {
      return null;
    }

    const url = getDocLink(block.docId, dbBlock.blockId);
    const title = dbBlock.additional?.databaseName;

    return `[database · ${title || 'Untitled'}][](${url})\n`;
  };

  const generateImageMarkdownPreview = (block: BlockDocumentInfo) => {
    const isImageModel = (
      model: DraftModel | null
    ): model is DraftModel<ImageBlockModel> => {
      return model?.flavour === 'affine:image';
    };

    const model = yblockToDraftModal(block.yblock);

    if (!isImageModel(model)) {
      return null;
    }

    const info = ['an image block'];

    if (model.sourceId) {
      info.push(`file id ${model.sourceId}`);
    }

    if (model.caption) {
      info.push(`with caption ${model.caption}`);
    }

    return info.join(', ') + '\n';
  };

  const generateEmbedMarkdownPreview = (block: BlockDocumentInfo) => {
    const isEmbedModel = (
      model: DraftModel | null
    ): model is DraftModel<EmbedBlockModel> => {
      return (
        model?.flavour === 'affine:embed-linked-doc' ||
        model?.flavour === 'affine:embed-synced-doc'
      );
    };

    const draftModel = yblockToDraftModal(block.yblock);
    if (!isEmbedModel(draftModel)) {
      return null;
    }

    const url = getDocLink(block.docId, draftModel.id);

    return `[](${url})\n`;
  };

  const generateLatexMarkdownPreview = (block: BlockDocumentInfo) => {
    let content =
      typeof block.content === 'string'
        ? block.content.trim()
        : block.content?.join('').trim();

    content = content?.split('\n').join(' ') ?? '';

    return `LaTeX, with value ${content}\n`;
  };

  const generateBookmarkMarkdownPreview = (block: BlockDocumentInfo) => {
    const isBookmarkModel = (
      model: DraftModel | null
    ): model is DraftModel<BookmarkBlockModel> => {
      return bookmarkFlavours.has(model?.flavour ?? '');
    };

    const draftModel = yblockToDraftModal(block.yblock);
    if (!isBookmarkModel(draftModel)) {
      return null;
    }
    const title = draftModel.title;
    const url = draftModel.url;
    return `[${title}](${url})\n`;
  };

  const generateAttachmentMarkdownPreview = (block: BlockDocumentInfo) => {
    const isAttachmentModel = (
      model: DraftModel | null
    ): model is DraftModel<AttachmentBlockModel> => {
      return model?.flavour === 'affine:attachment';
    };

    const draftModel = yblockToDraftModal(block.yblock);
    if (!isAttachmentModel(draftModel)) {
      return null;
    }

    return `[${draftModel.name}](${draftModel.sourceId})\n`;
  };

  const generateTableMarkdownPreview = (block: BlockDocumentInfo) => {
    const isTableModel = (
      model: DraftModel | null
    ): model is DraftModel<TableBlockModel> => {
      return model?.flavour === TableModelFlavour;
    };

    const draftModel = yblockToDraftModal(block.yblock);
    if (!isTableModel(draftModel)) {
      return null;
    }

    const url = getDocLink(block.docId, draftModel.id);

    return `[table][](${url})\n`;
  };

  const generateMarkdownPreview = async (block: BlockDocumentInfo) => {
    if (markdownPreviewCache.has(block)) {
      return markdownPreviewCache.get(block);
    }
    const flavour = block.flavour;
    let markdown: string | null = null;

    if (
      flavour === 'affine:paragraph' ||
      flavour === 'affine:list' ||
      flavour === 'affine:code'
    ) {
      const draftModel = yblockToDraftModal(block.yblock);
      markdown =
        block.parentFlavour === 'affine:database'
          ? generateDatabaseMarkdownPreview(block)
          : ((draftModel ? await markdownAdapter.fromBlock(draftModel) : null)
              ?.file ?? null);

      if (markdown) {
        if (flavour === 'affine:code') {
          markdown = trimCodeBlock(markdown);
        } else if (flavour === 'affine:paragraph') {
          markdown = trimParagraph(markdown);
        }
      }
    } else if (flavour === 'affine:database') {
      markdown = generateDatabaseMarkdownPreview(block);
    } else if (
      flavour === 'affine:embed-linked-doc' ||
      flavour === 'affine:embed-synced-doc'
    ) {
      markdown = generateEmbedMarkdownPreview(block);
    } else if (flavour === 'affine:attachment') {
      markdown = generateAttachmentMarkdownPreview(block);
    } else if (flavour === 'affine:image') {
      markdown = generateImageMarkdownPreview(block);
    } else if (flavour === 'affine:surface' || flavour === 'affine:page') {
      // skip
    } else if (flavour === 'affine:latex') {
      markdown = generateLatexMarkdownPreview(block);
    } else if (bookmarkFlavours.has(flavour)) {
      markdown = generateBookmarkMarkdownPreview(block);
    } else if (flavour === TableModelFlavour) {
      markdown = generateTableMarkdownPreview(block);
    } else {
      console.warn(`unknown flavour: ${flavour}`);
    }

    if (markdown && flavour === 'affine:list') {
      const blockDepth = getListDepth(block);
      markdown = indentMarkdown(markdown, Math.max(0, blockDepth));
    }

    markdownPreviewCache.set(block, markdown);
    return markdown;
  };

  return generateMarkdownPreview;
}

// remove the indent of the first line of list
// e.g.,
// ```
//     - list item 1
//       - list item 2
// ```
// becomes
// ```
// - list item 1
//   - list item 2
// ```
function unindentMarkdown(markdown: string) {
  const lines = markdown.split('\n');
  const res: string[] = [];
  let firstListFound = false;
  let baseIndent = 0;

  for (let current of lines) {
    const indent = current.match(/^\s*/)?.[0]?.length ?? 0;

    if (indent > 0) {
      if (!firstListFound) {
        // For the first list item, remove all indentation
        firstListFound = true;
        baseIndent = indent;
        current = current.trimStart();
      } else {
        // For subsequent list items, maintain relative indentation
        current =
          ' '.repeat(Math.max(0, indent - baseIndent)) + current.trimStart();
      }
    }

    res.push(current);
  }

  return res.join('\n');
}

async function crawlingDocData({
  docBuffer,
  docId,
  rootDocBuffer,
  rootDocId,
}: WorkerInput & { type: 'doc' }): Promise<WorkerOutput> {
  if (isEmptyUpdate(rootDocBuffer)) {
    console.warn('[worker]: Empty root doc buffer');
    return {};
  }

  const yRootDoc = await getOrCreateCachedYDoc(rootDocBuffer);

  let docExists: boolean | null = null;

  (
    yRootDoc.getMap('meta').get('pages') as YArray<YMap<any>> | undefined
  )?.forEach(page => {
    if (page.get('id') === docId) {
      docExists = !(page.get('trash') ?? false);
    }
  });

  if (!docExists) {
    return {
      deletedDoc: [docId],
    };
  } else {
    if (isEmptyUpdate(docBuffer)) {
      return {
        deletedDoc: [docId],
      };
    }

    const ydoc = await getOrCreateCachedYDoc(docBuffer);
    let docTitle = '';
    let summaryLenNeeded = 1000;
    let summary = '';
    const blockDocuments: BlockDocumentInfo[] = [];

    const generateMarkdownPreview = generateMarkdownPreviewBuilder(
      yRootDoc,
      rootDocId,
      blockDocuments
    );

    const blocks = ydoc.getMap<any>('blocks');

    // build a parent map for quick lookup
    // for each block, record its parent id
    const parentMap: Record<string, string | null> = {};
    for (const [id, block] of blocks.entries()) {
      const children = block.get('sys:children') as YArray<string> | undefined;
      if (children instanceof YArray && children.length) {
        for (const child of children) {
          parentMap[child] = id;
        }
      }
    }

    if (blocks.size === 0) {
      return { deletedDoc: [docId] };
    }

    // find the nearest block that satisfies the predicate
    const nearest = (
      blockId: string,
      predicate: (block: YMap<any>) => boolean
    ) => {
      let current: string | null = blockId;
      while (current) {
        const block = blocks.get(current);
        if (block && predicate(block)) {
          return block;
        }
        current = parentMap[current] ?? null;
      }
      return null;
    };

    const nearestByFlavour = (blockId: string, flavour: string) =>
      nearest(blockId, block => block.get('sys:flavour') === flavour);

    let rootBlockId: string | null = null;
    for (const block of blocks.values()) {
      const flavour = block.get('sys:flavour')?.toString();
      const blockId = block.get('sys:id')?.toString();
      if (flavour === 'affine:page' && blockId) {
        rootBlockId = blockId;
      }
    }

    if (!rootBlockId) {
      return { deletedDoc: [docId] };
    }

    const queue: { parent?: string; id: string }[] = [{ id: rootBlockId }];
    const visited = new Set<string>(); // avoid loop

    const pushChildren = (id: string, block: YMap<any>) => {
      const children = block.get('sys:children');
      if (children instanceof YArray && children.length) {
        for (let i = children.length - 1; i >= 0; i--) {
          const childId = children.get(i);
          if (childId && !visited.has(childId)) {
            queue.push({ parent: id, id: childId });
            visited.add(childId);
          }
        }
      }
    };

    // #region first loop - generate block base info
    while (queue.length) {
      const next = queue.pop();
      if (!next) {
        break;
      }

      const { parent: parentBlockId, id: blockId } = next;
      const block = blockId ? blocks.get(blockId) : null;
      const parentBlock = parentBlockId ? blocks.get(parentBlockId) : null;
      if (!block) {
        break;
      }

      const flavour = block.get('sys:flavour')?.toString();
      const parentFlavour = parentBlock?.get('sys:flavour')?.toString();
      const noteBlock = nearestByFlavour(blockId, 'affine:note');

      // display mode:
      // - both: page and edgeless -> fallback to page
      // - page: only page -> page
      // - edgeless: only edgeless -> edgeless
      // - undefined: edgeless (assuming it is a normal element on the edgeless)
      let displayMode = noteBlock?.get('prop:displayMode') ?? 'edgeless';

      if (displayMode === 'both') {
        displayMode = 'page';
      }

      const noteBlockId: string | undefined = noteBlock
        ?.get('sys:id')
        ?.toString();

      pushChildren(blockId, block);

      const commonBlockProps = {
        docId,
        flavour,
        blockId,
        yblock: block,
        additional: { displayMode, noteBlockId },
      };

      if (flavour === 'affine:page') {
        docTitle = block.get('prop:title').toString();
        blockDocuments.push({
          ...commonBlockProps,
          content: docTitle,
        });
      } else if (
        flavour === 'affine:paragraph' ||
        flavour === 'affine:list' ||
        flavour === 'affine:code'
      ) {
        const text = block.get('prop:text') as YText;

        if (!text) {
          continue;
        }

        const deltas: DeltaInsert<AffineTextAttributes>[] = text.toDelta();
        const refs = uniq(
          deltas
            .flatMap(delta => {
              if (
                delta.attributes &&
                delta.attributes.reference &&
                delta.attributes.reference.pageId
              ) {
                const { pageId: refDocId, params = {} } =
                  delta.attributes.reference;
                return {
                  refDocId,
                  ref: JSON.stringify({ docId: refDocId, ...params }),
                };
              }
              return null;
            })
            .filter(ref => !!ref)
        );

        const databaseName =
          flavour === 'affine:paragraph' && parentFlavour === 'affine:database' // if block is a database row
            ? parentBlock?.get('prop:title')?.toString()
            : undefined;

        blockDocuments.push({
          ...commonBlockProps,
          content: text.toString(),
          ...refs.reduce<{ refDocId: string[]; ref: string[] }>(
            (prev, curr) => {
              prev.refDocId.push(curr.refDocId);
              prev.ref.push(curr.ref);
              return prev;
            },
            { refDocId: [], ref: [] }
          ),
          parentFlavour,
          parentBlockId,
          additional: { ...commonBlockProps.additional, databaseName },
        });

        if (summaryLenNeeded > 0) {
          summary += text.toString();
          summaryLenNeeded -= text.length;
        }
      } else if (
        flavour === 'affine:embed-linked-doc' ||
        flavour === 'affine:embed-synced-doc'
      ) {
        const pageId = block.get('prop:pageId');
        if (typeof pageId === 'string') {
          // reference info
          const params = block.get('prop:params') ?? {};
          blockDocuments.push({
            ...commonBlockProps,
            refDocId: [pageId],
            ref: [JSON.stringify({ docId: pageId, ...params })],
            parentFlavour,
            parentBlockId,
          });
        }
      } else if (
        flavour === 'affine:attachment' ||
        flavour === 'affine:image'
      ) {
        const blobId = block.get('prop:sourceId');
        if (typeof blobId === 'string') {
          blockDocuments.push({
            ...commonBlockProps,
            blob: [blobId],
            parentFlavour,
            parentBlockId,
          });
        }
      } else if (flavour === 'affine:surface') {
        const texts = [];

        const elementsObj = block.get('prop:elements');
        if (
          !(
            elementsObj instanceof YMap &&
            elementsObj.get('type') === '$blocksuite:internal:native$'
          )
        ) {
          continue;
        }
        const elements = elementsObj.get('value') as YMap<any>;
        if (!(elements instanceof YMap)) {
          continue;
        }

        for (const element of elements.values()) {
          if (!(element instanceof YMap)) {
            continue;
          }
          const text = element.get('text') as YText;
          if (!text) {
            continue;
          }

          texts.push(text.toString());
        }

        blockDocuments.push({
          ...commonBlockProps,
          content: texts,
          parentFlavour,
          parentBlockId,
        });
      } else if (flavour === 'affine:database') {
        const texts = [];
        const columnsObj = block.get('prop:columns');
        const databaseTitle = block.get('prop:title');
        if (databaseTitle instanceof YText) {
          texts.push(databaseTitle.toString());
        }
        if (columnsObj instanceof YArray) {
          for (const column of columnsObj) {
            if (!(column instanceof YMap)) {
              continue;
            }
            if (typeof column.get('name') === 'string') {
              texts.push(column.get('name'));
            }

            const data = column.get('data');
            if (!(data instanceof YMap)) {
              continue;
            }
            const options = data.get('options');
            if (!(options instanceof YArray)) {
              continue;
            }
            for (const option of options) {
              if (!(option instanceof YMap)) {
                continue;
              }
              const value = option.get('value');
              if (typeof value === 'string') {
                texts.push(value);
              }
            }
          }
        }

        blockDocuments.push({
          ...commonBlockProps,
          content: texts,
          additional: {
            ...commonBlockProps.additional,
            databaseName: databaseTitle?.toString(),
          },
        });
      } else if (flavour === 'affine:latex') {
        blockDocuments.push({
          ...commonBlockProps,
          content: block.get('prop:latex')?.toString() ?? '',
        });
      } else if (
        bookmarkFlavours.has(flavour) ||
        flavour === TableModelFlavour
      ) {
        blockDocuments.push({
          ...commonBlockProps,
        });
      }
    }
    // #endregion

    // #region second loop - generate markdown preview
    const TARGET_PREVIEW_CHARACTER = 500;
    const TARGET_PREVIOUS_BLOCK = 1;
    const TARGET_FOLLOW_BLOCK = 4;
    for (const block of blockDocuments) {
      if (block.ref?.length) {
        const target = block;

        // should only generate the markdown preview belong to the same affine:note
        const noteBlock = nearestByFlavour(block.blockId, 'affine:note');

        const sameNoteBlocks = noteBlock
          ? blockDocuments.filter(
              candidate =>
                nearestByFlavour(candidate.blockId, 'affine:note') === noteBlock
            )
          : [];

        // only generate markdown preview for reference blocks
        let previewText = (await generateMarkdownPreview(target)) ?? '';
        let previousBlock = 0;
        let followBlock = 0;
        let previousIndex = sameNoteBlocks.findIndex(
          block => block.blockId === target.blockId
        );
        let followIndex = previousIndex;

        while (
          !(
            (
              previewText.length > TARGET_PREVIEW_CHARACTER || // stop if preview text reaches the limit
              ((previousBlock >= TARGET_PREVIOUS_BLOCK || previousIndex < 0) &&
                (followBlock >= TARGET_FOLLOW_BLOCK ||
                  followIndex >= sameNoteBlocks.length))
            ) // stop if no more blocks, or preview block reaches the limit
          )
        ) {
          if (previousBlock < TARGET_PREVIOUS_BLOCK) {
            previousIndex--;
            const block =
              previousIndex >= 0 ? sameNoteBlocks.at(previousIndex) : null;
            const markdown = block
              ? await generateMarkdownPreview(block)
              : null;
            if (
              markdown &&
              !previewText.startsWith(
                markdown
              ) /* A small hack to skip blocks with the same content */
            ) {
              previewText = markdown + '\n' + previewText;
              previousBlock++;
            }
          }

          if (followBlock < TARGET_FOLLOW_BLOCK) {
            followIndex++;
            const block = sameNoteBlocks.at(followIndex);
            const markdown = block
              ? await generateMarkdownPreview(block)
              : null;
            if (
              markdown &&
              !previewText.endsWith(
                markdown
              ) /* A small hack to skip blocks with the same content */
            ) {
              previewText = previewText + '\n' + markdown;
              followBlock++;
            }
          }
        }

        block.markdownPreview = unindentMarkdown(previewText);
      }
    }
    // #endregion

    return {
      addedDoc: [
        {
          id: docId,
          doc: Document.from<DocIndexSchema>(docId, {
            docId,
            title: docTitle,
            summary,
          }),
          blocks: blockDocuments.map(block =>
            Document.from<BlockIndexSchema>(`${docId}:${block.blockId}`, {
              docId: block.docId,
              blockId: block.blockId,
              content: block.content,
              flavour: block.flavour,
              blob: block.blob,
              refDocId: block.refDocId,
              ref: block.ref,
              parentFlavour: block.parentFlavour,
              parentBlockId: block.parentBlockId,
              additional: block.additional
                ? JSON.stringify(block.additional)
                : undefined,
              markdownPreview: block.markdownPreview,
            })
          ),
        },
      ],
    };
  }
}

async function crawlingRootDocData({
  allIndexedDocs,
  rootDocBuffer,
  reindexAll,
}: WorkerInput & {
  type: 'rootDoc';
}): Promise<WorkerOutput> {
  const ydoc = await getOrCreateCachedYDoc(rootDocBuffer);

  const docs = ydoc.getMap('meta').get('pages') as
    | YArray<YMap<any>>
    | undefined;

  if (!docs) {
    return {};
  }

  const availableDocs = [];

  for (const page of docs) {
    const docId = page.get('id');

    if (typeof docId !== 'string') {
      continue;
    }

    const inTrash = page.get('trash') ?? false;

    if (!inTrash) {
      availableDocs.push(docId);
    }
  }

  const needDelete = difference(allIndexedDocs, availableDocs);
  const needAdd = reindexAll
    ? availableDocs
    : difference(availableDocs, allIndexedDocs);

  return {
    reindexDoc: [...needAdd, ...needDelete].map(docId => ({
      docId,
      storageDocId: ydoc.getMap<YDoc>('spaces').get(docId)?.guid ?? docId,
    })),
  };
}

globalThis.onmessage = async (event: MessageEvent<WorkerIngoingMessage>) => {
  const message = event.data;
  if (message.type === 'init') {
    postMessage({ type: 'init', msgId: message.msgId });
    return;
  }
  if (message.type === 'run') {
    const { input } = message;
    try {
      let data;
      if (input.type === 'rootDoc') {
        data = await crawlingRootDocData(input);
      } else {
        data = await crawlingDocData(input);
      }

      postMessage({ type: 'done', msgId: message.msgId, output: data });
    } catch (error) {
      postMessage({
        type: 'failed',
        msgId: message.msgId,
        error: error instanceof Error ? error.message : error + '',
      });
    }
  }
};

declare function postMessage(message: WorkerOutgoingMessage): void;

function isEmptyUpdate(binary: Uint8Array) {
  return (
    binary.byteLength === 0 ||
    (binary.byteLength === 2 && binary[0] === 0 && binary[1] === 0)
  );
}
