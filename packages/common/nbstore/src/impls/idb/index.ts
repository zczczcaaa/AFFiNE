import type { StorageConstructor } from '..';
import { IndexedDBBlobStorage } from './blob';
import { IndexedDBDocStorage } from './doc';
import { IndexedDBSyncStorage } from './sync';
import { IndexedDBV1BlobStorage, IndexedDBV1DocStorage } from './v1';

export * from './blob';
export * from './doc';
export * from './sync';

export const idbStorages = [
  IndexedDBDocStorage,
  IndexedDBBlobStorage,
  IndexedDBSyncStorage,
] satisfies StorageConstructor[];

export const idbv1Storages = [
  IndexedDBV1DocStorage,
  IndexedDBV1BlobStorage,
] satisfies StorageConstructor[];
