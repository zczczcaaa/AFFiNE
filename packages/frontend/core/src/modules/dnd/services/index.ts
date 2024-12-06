import type { ExternalGetDataFeedbackArgs } from '@affine/component';
import type { AffineDNDData } from '@affine/core/types/dnd';
import type { DocsService, WorkspaceService } from '@toeverything/infra';
import { Service } from '@toeverything/infra';

import { resolveLinkToDoc } from '../../navigation';

type EntityResolver = (
  data: string
) => AffineDNDData['draggable']['entity'] | null;

export class DndService extends Service {
  constructor(
    private readonly docsService: DocsService,
    private readonly workspaceService: WorkspaceService
  ) {
    super();

    // order matters
    this.resolvers.set('text/html', this.resolveHTML);
    this.resolvers.set('text/uri-list', this.resolveUriList);
  }

  private readonly resolvers = new Map<string, EntityResolver>();

  externalDataAdapter = (args: ExternalGetDataFeedbackArgs) => {
    const from: AffineDNDData['draggable']['from'] = {
      at: 'external',
    };
    let entity: AffineDNDData['draggable']['entity'];

    // in the order of the resolvers instead of the order of the types
    for (const [type, resolver] of this.resolvers) {
      if (args.source.types.includes(type)) {
        const stringData = args.source.getStringData(type);
        if (stringData) {
          const candidate = resolver(stringData);
          if (candidate) {
            entity = candidate;
            break;
          }
        }
      }
    }

    return {
      from,
      entity,
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

  // todo: implement this
  private readonly resolveHTML: EntityResolver = _html => {
    try {
      // const parser = new DOMParser();
      // const doc = parser.parseFromString(html, 'text/html');
      // return doc.body.innerText;
    } catch {
      // ignore the error
      return null;
    }
    return null;
  };
}
