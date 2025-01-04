import type { Slot } from '@blocksuite/global/utils';
import type { BlobEngine, DocEngine } from '@blocksuite/sync';
import type * as Y from 'yjs';

import type { BlockModel } from '../schema/base.js';
import type { Schema } from '../schema/schema.js';
import type { IdGenerator } from '../utils/id-generator.js';
import type { AwarenessStore } from '../yjs/awareness.js';
import type { BlockSuiteDoc } from '../yjs/doc.js';
import type { YBlock } from './doc/block/types.js';
import type { Blocks } from './doc/doc.js';
import type { Query } from './doc/query.js';

export type Tag = {
  id: string;
  value: string;
  color: string;
};
export type DocsPropertiesMeta = {
  tags?: {
    options: Tag[];
  };
};
export interface DocMeta {
  id: string;
  title: string;
  tags: string[];
  createDate: number;
  updatedDate?: number;
  favorite?: boolean;
}

export type GetBlocksOptions = {
  query?: Query;
  readonly?: boolean;
};
export type CreateBlocksOptions = GetBlocksOptions & {
  id?: string;
};

export interface WorkspaceMeta {
  get docMetas(): DocMeta[];

  addDocMeta(props: DocMeta, index?: number): void;
  getDocMeta(id: string): DocMeta | undefined;
  setDocMeta(id: string, props: Partial<DocMeta>): void;
  removeDocMeta(id: string): void;

  get properties(): DocsPropertiesMeta;
  setProperties(meta: DocsPropertiesMeta): void;

  get avatar(): string | undefined;
  setAvatar(avatar: string): void;

  get name(): string | undefined;
  setName(name: string): void;

  commonFieldsUpdated: Slot;

  hasVersion: boolean;
  writeVersion(workspace: Workspace): void;
  get docs(): unknown[] | undefined;
  initialize(): void;

  docMetaAdded: Slot<string>;
  docMetaRemoved: Slot<string>;
  docMetaUpdated: Slot;
}

export interface Workspace {
  readonly id: string;
  readonly meta: WorkspaceMeta;
  readonly idGenerator: IdGenerator;
  readonly docSync: DocEngine;
  readonly blobSync: BlobEngine;
  readonly awarenessStore: AwarenessStore;

  get schema(): Schema;
  get doc(): BlockSuiteDoc;
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

export interface Doc {
  readonly id: string;
  get meta(): DocMeta | undefined;
  get schema(): Schema;

  remove(): void;
  load(initFn?: () => void): void;
  get ready(): boolean;
  dispose(): void;

  slots: {
    historyUpdated: Slot;
    yBlockUpdated: Slot<
      | {
          type: 'add';
          id: string;
        }
      | {
          type: 'delete';
          id: string;
        }
    >;
  };

  get history(): Y.UndoManager;
  get canRedo(): boolean;
  get canUndo(): boolean;
  undo(): void;
  redo(): void;
  resetHistory(): void;
  transact(fn: () => void, shouldTransact?: boolean): void;
  withoutTransact(fn: () => void): void;

  captureSync(): void;
  clear(): void;
  getBlocks(options?: GetBlocksOptions): Blocks;
  clearQuery(query: Query, readonly?: boolean): void;

  get loaded(): boolean;
  get readonly(): boolean;
  get awarenessStore(): AwarenessStore;

  get workspace(): Workspace;

  get rootDoc(): BlockSuiteDoc;
  get spaceDoc(): Y.Doc;
  get yBlocks(): Y.Map<YBlock>;
}

export interface StackItem {
  meta: Map<'selection-state', unknown>;
}

export type YBlocks = Y.Map<YBlock>;

/** JSON-serializable properties of a block */
export type BlockSysProps = {
  id: string;
  flavour: string;
  children?: BlockModel[];
};
export type BlockProps = BlockSysProps & Record<string, unknown>;

declare global {
  namespace BlockSuite {
    interface BlockModels {}

    type Flavour = string & keyof BlockModels;

    type ModelProps<Model> = Partial<
      Model extends BlockModel<infer U> ? U : never
    >;
  }
}
