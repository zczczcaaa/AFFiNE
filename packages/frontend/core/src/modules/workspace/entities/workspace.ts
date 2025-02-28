import type { Workspace as WorkspaceInterface } from '@blocksuite/affine/store';
import { Entity, LiveData } from '@toeverything/infra';
import { Observable } from 'rxjs';
import type { Awareness } from 'y-protocols/awareness.js';

import { WorkspaceImpl } from '../impls/workspace';
import type { WorkspaceScope } from '../scopes/workspace';
import { WorkspaceEngineService } from '../services/engine';

export class Workspace extends Entity {
  constructor(public readonly scope: WorkspaceScope) {
    super();
  }

  readonly id = this.scope.props.openOptions.metadata.id;

  readonly openOptions = this.scope.props.openOptions;

  readonly meta = this.scope.props.openOptions.metadata;

  readonly flavour = this.meta.flavour;

  _docCollection: WorkspaceInterface | null = null;

  get docCollection() {
    if (!this._docCollection) {
      this._docCollection = new WorkspaceImpl({
        id: this.openOptions.metadata.id,
        blobSource: {
          get: async key => {
            const record = await this.engine.blob.get(key);
            return record
              ? new Blob([record.data], { type: record.mime })
              : null;
          },
          delete: async () => {
            return;
          },
          list: async () => {
            return [];
          },
          set: async (id, blob) => {
            await this.engine.blob.set({
              key: id,
              data: new Uint8Array(await blob.arrayBuffer()),
              mime: blob.type,
            });
            return id;
          },
          name: 'blob',
          readonly: false,
        },
        onLoadDoc: doc => this.engine.doc.connectDoc(doc),
        onLoadAwareness: awareness =>
          this.engine.awareness.connectAwareness(awareness),
      });
    }
    return this._docCollection;
  }

  get awareness() {
    return this.docCollection.awarenessStore.awareness as Awareness;
  }

  get rootYDoc() {
    return this.docCollection.doc;
  }

  get canGracefulStop() {
    // TODO
    return true;
  }

  get engine() {
    return this.framework.get(WorkspaceEngineService).engine;
  }

  name$ = LiveData.from<string | undefined>(
    new Observable(subscriber => {
      subscriber.next(this.docCollection.meta.name);
      return this.docCollection.meta.commonFieldsUpdated.on(() => {
        subscriber.next(this.docCollection.meta.name);
      }).dispose;
    }),
    undefined
  );

  avatar$ = LiveData.from<string | undefined>(
    new Observable(subscriber => {
      subscriber.next(this.docCollection.meta.avatar);
      return this.docCollection.meta.commonFieldsUpdated.on(() => {
        subscriber.next(this.docCollection.meta.avatar);
      }).dispose;
    }),
    undefined
  );

  override dispose(): void {
    this.docCollection.dispose();
  }
}
