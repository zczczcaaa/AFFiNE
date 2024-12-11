import {
  type ExternalGetDataFeedbackArgs,
  type fromExternalData,
  type toExternalData,
} from '@affine/component';
import { createPageModeSpecs } from '@affine/core/components/blocksuite/block-suite-editor/specs/page';
import type { AffineDNDData } from '@affine/core/types/dnd';
import { BlockStdScope } from '@blocksuite/affine/block-std';
import { DndApiExtensionIdentifier } from '@blocksuite/affine/blocks';
import {
  DocCollection,
  nanoid,
  type SliceSnapshot,
} from '@blocksuite/affine/store';
import type { DocsService, WorkspaceService } from '@toeverything/infra';
import { getAFFiNEWorkspaceSchema, Service } from '@toeverything/infra';

import { resolveLinkToDoc } from '../../navigation';

type Entity = AffineDNDData['draggable']['entity'];
type EntityResolver = (data: string) => Entity | null;

type ExternalDragPayload = ExternalGetDataFeedbackArgs['source'];

export class DndService extends Service {
  constructor(
    private readonly docsService: DocsService,
    private readonly workspaceService: WorkspaceService
  ) {
    super();

    // order matters
    this.resolvers.push(this.resolveBlocksuiteExternalData);

    const mimeResolvers: [string, EntityResolver][] = [
      ['text/html', this.resolveHTML],
      ['text/uri-list', this.resolveUriList],
    ];

    mimeResolvers.forEach(([type, resolver]) => {
      this.resolvers.push((source: ExternalDragPayload) => {
        if (source.types.includes(type)) {
          const stringData = source.getStringData(type);
          if (stringData) {
            return resolver(stringData);
          }
        }
        return null;
      });
    });
  }

  private readonly resolvers: ((
    source: ExternalDragPayload
  ) => Entity | null)[] = [];

  readonly blocksuiteDndAPI = (() => {
    const collection = new DocCollection({
      schema: getAFFiNEWorkspaceSchema(),
    });
    collection.meta.initialize();
    const doc = collection.createDoc();
    const std = new BlockStdScope({
      doc,
      extensions: createPageModeSpecs(this.framework),
    });
    this.disposables.push(() => {
      collection.dispose();
    });
    return std.get(DndApiExtensionIdentifier);
  })();

  fromExternalData: fromExternalData<AffineDNDData> = (
    args: ExternalGetDataFeedbackArgs,
    isDropEvent?: boolean
  ) => {
    if (!isDropEvent) {
      return {};
    }
    const from: AffineDNDData['draggable']['from'] = {
      at: 'external',
    };

    let entity: Entity | null = null;

    // in the order of the resolvers instead of the order of the types
    for (const resolver of this.resolvers) {
      const candidate = resolver(args.source);
      if (candidate) {
        entity = candidate;
        break;
      }
    }

    if (!entity) {
      return {}; // no resolver can handle this data
    }

    return {
      from,
      entity,
    };
  };

  toExternalData: toExternalData<AffineDNDData> = (args, data) => {
    const normalData = typeof data === 'function' ? data(args) : data;

    if (
      !normalData ||
      !normalData.entity ||
      normalData.entity.type !== 'doc' ||
      !normalData.entity.id
    ) {
      return {};
    }

    // todo: use blocksuite provided api to generate snapshot
    const snapshotSlice: SliceSnapshot = {
      content: [
        {
          children: [],
          flavour: 'affine:embed-linked-doc',
          type: 'block',
          id: nanoid(),
          props: {
            pageId: normalData.entity.id,
          },
        },
      ],
      type: 'slice',
      pageId: nanoid(),
      pageVersion: 1,
      workspaceId: this.workspaceService.workspace.id,
      workspaceVersion: 2,
    };

    const serialized = JSON.stringify(snapshotSlice);

    const html = `<div data-blocksuite-snapshot="${encodeURIComponent(serialized)}"></div>`;

    return {
      'text/html': html,
    };
  };

  private readonly resolveUriList: EntityResolver = urls => {
    // only deal with the first url
    const url = urls
      ?.split('\n')
      .filter(u => u.trim() && !u.trim().startsWith('#'))[0];

    if (url) {
      const maybeDocLink = resolveLinkToDoc(url);

      // check if the doc is in the current workspace
      if (
        maybeDocLink?.workspaceId === this.workspaceService.workspace.id &&
        this.docsService.list.doc$(maybeDocLink.docId).value &&
        // skip for block references for now
        !maybeDocLink.blockIds?.length
      ) {
        return {
          type: 'doc',
          id: maybeDocLink.docId,
        };
      }
    }
    return null;
  };

  private readonly resolveBlocksuiteExternalData = (
    source: ExternalDragPayload
  ): Entity | null => {
    const fakeDataTransfer = new Proxy(new DataTransfer(), {
      get(target, prop) {
        if (prop === 'getData') {
          return (type: string) => source.getStringData(type);
        }
        return target[prop as keyof DataTransfer];
      },
    });
    const snapshot = this.blocksuiteDndAPI.decodeSnapshot(fakeDataTransfer);
    if (!snapshot) {
      return null;
    }
    return this.resolveBlockSnapshot(snapshot);
  };

  private readonly resolveHTML: EntityResolver = html => {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      // If drag from another secure context, the url-list
      // will be "about:blank#blocked"
      // We can still infer the url-list from the anchor tags
      const urls = Array.from(doc.querySelectorAll('a'))
        .map(a => a.href)
        .join('\n');
      return this.resolveUriList(urls);
    } catch {
      // ignore the error
      return null;
    }
  };

  private readonly resolveBlockSnapshot = (
    snapshot: SliceSnapshot
  ): Entity | null => {
    for (const block of snapshot.content) {
      if (
        ['affine:embed-linked-doc', 'affine:embed-synced-doc'].includes(
          block.flavour
        )
      ) {
        return {
          type: 'doc',
          id: block.props.pageId as string,
        };
      }
    }
    return null;
  };
}
