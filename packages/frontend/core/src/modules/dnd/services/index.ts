import {
  type ExternalGetDataFeedbackArgs,
  type fromExternalData,
  type toExternalData,
} from '@affine/component';
import { createPageModeSpecs } from '@affine/core/components/blocksuite/block-suite-editor/specs/page';
import type { AffineDNDData } from '@affine/core/types/dnd';
import { BlockStdScope } from '@blocksuite/affine/block-std';
import type { DNDAPIExtension } from '@blocksuite/affine/blocks';
import { DndApiExtensionIdentifier } from '@blocksuite/affine/blocks';
import { type SliceSnapshot } from '@blocksuite/affine/store';
import type { DocsService, WorkspaceService } from '@toeverything/infra';
import { Service } from '@toeverything/infra';

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

  private _blocksuiteDndAPI: DNDAPIExtension | null = null;

  get blocksuiteDndAPI() {
    if (this._blocksuiteDndAPI) {
      return this._blocksuiteDndAPI;
    }

    const collection = this.workspaceService.workspace.docCollection;
    const doc = collection.createDoc();
    const std = new BlockStdScope({
      doc,
      extensions: createPageModeSpecs(this.framework),
    });
    const dndAPI = std.get(DndApiExtensionIdentifier);
    this._blocksuiteDndAPI = dndAPI;
    return dndAPI;
  }

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

    const snapshotSlice = this.blocksuiteDndAPI.fromEntity({
      docId: normalData.entity.id,
      flavour: 'affine:embed-linked-doc',
    });

    if (!snapshotSlice) {
      return {};
    }

    const encoded = this.blocksuiteDndAPI.encodeSnapshot(snapshotSlice);

    return {
      [this.blocksuiteDndAPI.mimeType]: encoded,
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
    const encoded = source.getStringData(this.blocksuiteDndAPI.mimeType);
    if (!encoded) {
      return null;
    }
    const snapshot = this.blocksuiteDndAPI.decodeSnapshot(encoded);
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
