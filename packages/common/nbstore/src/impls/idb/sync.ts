import { share } from '../../connection';
import { type DocClock, type DocClocks, SyncStorage } from '../../storage';
import { IDBConnection } from './db';
export class IndexedDBSyncStorage extends SyncStorage {
  readonly connection = share(new IDBConnection(this.options));

  get db() {
    return this.connection.inner;
  }

  override async getPeerClocks(peer: string) {
    const trx = this.db.transaction('peerClocks', 'readonly');

    const records = await trx.store.index('peer').getAll(peer);

    return records.reduce((clocks, { docId, clock }) => {
      clocks[docId] = clock;
      return clocks;
    }, {} as DocClocks);
  }

  override async setPeerClock(peer: string, clock: DocClock) {
    const trx = this.db.transaction('peerClocks', 'readwrite');
    const record = await trx.store.get([peer, clock.docId]);

    if (!record || record.clock < clock.timestamp) {
      await trx.store.put({
        peer,
        docId: clock.docId,
        clock: clock.timestamp,
        pushedClock: record?.pushedClock ?? new Date(0),
      });
    }
  }

  override async getPeerPushedClocks(peer: string) {
    const trx = this.db.transaction('peerClocks', 'readonly');

    const records = await trx.store.index('peer').getAll(peer);

    return records.reduce((clocks, { docId, pushedClock }) => {
      clocks[docId] = pushedClock;
      return clocks;
    }, {} as DocClocks);
  }

  override async setPeerPushedClock(peer: string, clock: DocClock) {
    const trx = this.db.transaction('peerClocks', 'readwrite');
    const record = await trx.store.get([peer, clock.docId]);

    if (!record || record.pushedClock < clock.timestamp) {
      await trx.store.put({
        peer,
        docId: clock.docId,
        clock: record?.clock ?? new Date(0),
        pushedClock: clock.timestamp,
      });
    }
  }

  override async clearClocks() {
    const trx = this.db.transaction('peerClocks', 'readwrite');

    await trx.store.clear();
  }
}
