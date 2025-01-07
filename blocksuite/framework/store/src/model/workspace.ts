import type { Slot } from '@blocksuite/global/utils';
import type { BlobEngine } from '@blocksuite/sync';
import type * as Y from 'yjs';

import type { Schema } from '../schema/schema.js';
import type { IdGenerator } from '../utils/id-generator.js';
import type { AwarenessStore } from '../yjs/awareness.js';
import type { Blocks } from './blocks/blocks.js';
import type { CreateBlocksOptions, Doc, GetBlocksOptions } from './doc.js';
import type { WorkspaceMeta } from './workspace-meta.js';

export interface Workspace {
  readonly id: string;
  readonly meta: WorkspaceMeta;
  readonly idGenerator: IdGenerator;
  readonly blobSync: BlobEngine;
  readonly awarenessStore: AwarenessStore;

  get schema(): Schema;
  get doc(): Y.Doc;
  get docs(): Map<string, Doc>;

  slots: {
    docListUpdated: Slot;
    docCreated: Slot<string>;
    docRemoved: Slot<string>;
  };

  createDoc(options?: CreateBlocksOptions): Blocks;
  getDoc(docId: string, options?: GetBlocksOptions): Blocks | null;
  removeDoc(docId: string): void;

  dispose(): void;
}
