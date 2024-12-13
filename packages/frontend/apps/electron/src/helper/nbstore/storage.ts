import {
  parseUniversalId,
  SpaceStorage,
  type SpaceType,
  type StorageType,
} from '@affine/nbstore';
import { Subject } from 'rxjs';
import { applyUpdate, Doc as YDoc } from 'yjs';

import { logger } from '../logger';
import { SqliteBlobStorage } from './blob';
import { NativeDBConnection } from './db';
import { SqliteDocStorage } from './doc';
import { SqliteSyncStorage } from './sync';

export class SqliteSpaceStorage extends SpaceStorage {
  get connection() {
    const docStore = this.get('doc');

    if (!docStore) {
      throw new Error('doc store not found');
    }

    const connection = docStore.connection;

    if (!(connection instanceof NativeDBConnection)) {
      throw new Error('doc store connection is not a Sqlite connection');
    }

    return connection;
  }

  async getDBPath() {
    return this.connection.getDBPath();
  }

  async getWorkspaceName() {
    const docStore = this.tryGet('doc');

    if (!docStore) {
      return null;
    }

    const doc = await docStore.getDoc(docStore.spaceId);
    if (!doc) {
      return null;
    }

    const ydoc = new YDoc();
    applyUpdate(ydoc, doc.bin);
    return ydoc.getMap('meta').get('name') as string;
  }

  async checkpoint() {
    await this.connection.inner.checkpoint();
  }
}

const STORE_CACHE = new Map<string, SqliteSpaceStorage>();
export interface ConnectionStatus {
  peer: string;
  spaceType: SpaceType;
  spaceId: string;
  storage: StorageType;
  status: string;
  error?: Error;
}
const CONNECTION$ = new Subject<ConnectionStatus>();

process.on('beforeExit', () => {
  CONNECTION$.complete();
  STORE_CACHE.forEach(store => {
    store.destroy().catch(err => {
      logger.error('[nbstore] destroy store failed', err);
    });
  });
});

export function onConnectionChanged(fn: (payload: ConnectionStatus) => void) {
  return CONNECTION$.subscribe({ next: fn });
}

export function getStorage(universalId: string) {
  return STORE_CACHE.get(universalId);
}

export async function ensureStorage(universalId: string) {
  const { peer, type, id } = parseUniversalId(universalId);
  let store = STORE_CACHE.get(universalId);

  if (!store) {
    const opts = {
      peer,
      type,
      id,
    };

    store = new SqliteSpaceStorage([
      new SqliteDocStorage(opts),
      new SqliteBlobStorage(opts),
      new SqliteSyncStorage(opts),
    ]);

    store.on('connection', ({ storage, status, error }) => {
      CONNECTION$.next({
        peer,
        spaceType: type,
        spaceId: id,
        storage,
        status,
        error,
      });
      logger.info(
        `[nbstore] status changed: ${status}, spaceType: ${type}, spaceId: ${id}, storage: ${storage}`
      );
      if (error) {
        logger.error(`[nbstore] connection error: ${error}`);
      }
    });

    await store.connect();

    STORE_CACHE.set(universalId, store);
  }

  return store;
}
