import { MANUALLY_STOP } from '@toeverything/infra';
import { OpConsumer } from '@toeverything/infra/op';
import { Observable } from 'rxjs';

import { type StorageConstructor } from '../impls';
import { SpaceStorage } from '../storage';
import type { AwarenessRecord } from '../storage/awareness';
import { Sync } from '../sync';
import type { PeerStorageOptions } from '../sync/types';
import type { StoreInitOptions, WorkerManagerOps, WorkerOps } from './ops';

export type { WorkerManagerOps };

class StoreConsumer {
  private readonly storages: PeerStorageOptions<SpaceStorage>;
  private readonly sync: Sync;

  get ensureLocal() {
    if (!this.storages) {
      throw new Error('Not initialized');
    }
    return this.storages.local;
  }

  get ensureSync() {
    if (!this.sync) {
      throw new Error('Sync not initialized');
    }
    return this.sync;
  }

  get docStorage() {
    return this.ensureLocal.get('doc');
  }

  get docSync() {
    return this.ensureSync.doc;
  }

  get blobStorage() {
    return this.ensureLocal.get('blob');
  }

  get blobSync() {
    return this.ensureSync.blob;
  }

  get syncStorage() {
    return this.ensureLocal.get('sync');
  }

  get awarenessStorage() {
    return this.ensureLocal.get('awareness');
  }

  get awarenessSync() {
    return this.ensureSync.awareness;
  }

  constructor(
    private readonly availableStorageImplementations: StorageConstructor[],
    init: StoreInitOptions
  ) {
    this.storages = {
      local: new SpaceStorage(
        Object.fromEntries(
          Object.entries(init.local).map(([type, opt]) => {
            if (opt === undefined) {
              return [type, undefined];
            }
            const Storage = this.availableStorageImplementations.find(
              impl => impl.identifier === opt.name
            );
            if (!Storage) {
              throw new Error(`Storage implementation ${opt.name} not found`);
            }
            return [type, new Storage(opt.opts as any)];
          })
        )
      ),
      remotes: Object.fromEntries(
        Object.entries(init.remotes).map(([peer, opts]) => {
          return [
            peer,
            new SpaceStorage(
              Object.fromEntries(
                Object.entries(opts).map(([type, opt]) => {
                  if (opt === undefined) {
                    return [type, undefined];
                  }
                  const Storage = this.availableStorageImplementations.find(
                    impl => impl.identifier === opt.name
                  );
                  if (!Storage) {
                    throw new Error(
                      `Storage implementation ${opt.name} not found`
                    );
                  }
                  return [type, new Storage(opt.opts as any)];
                })
              )
            ),
          ];
        })
      ),
    };
    this.sync = new Sync(this.storages);
    this.storages.local.connect();
    for (const remote of Object.values(this.storages.remotes)) {
      remote.connect();
    }
    this.sync.start();
  }

  bindConsumer(consumer: OpConsumer<WorkerOps>) {
    this.registerHandlers(consumer);
  }

  async destroy() {
    this.sync?.stop();
    this.storages?.local.disconnect();
    await this.storages?.local.destroy();
    for (const remote of Object.values(this.storages?.remotes ?? {})) {
      remote.disconnect();
      await remote.destroy();
    }
  }

  private registerHandlers(consumer: OpConsumer<WorkerOps>) {
    const collectJobs = new Map<
      string,
      (awareness: AwarenessRecord | null) => void
    >();
    let collectId = 0;
    consumer.registerAll({
      'docStorage.getDoc': (docId: string) => this.docStorage.getDoc(docId),
      'docStorage.getDocDiff': ({ docId, state }) =>
        this.docStorage.getDocDiff(docId, state),
      'docStorage.pushDocUpdate': ({ update, origin }) =>
        this.docStorage.pushDocUpdate(update, origin),
      'docStorage.getDocTimestamps': after =>
        this.docStorage.getDocTimestamps(after ?? undefined),
      'docStorage.getDocTimestamp': docId =>
        this.docStorage.getDocTimestamp(docId),
      'docStorage.deleteDoc': (docId: string) =>
        this.docStorage.deleteDoc(docId),
      'docStorage.subscribeDocUpdate': () =>
        new Observable(subscriber => {
          return this.docStorage.subscribeDocUpdate((update, origin) => {
            subscriber.next({ update, origin });
          });
        }),
      'docStorage.waitForConnected': () =>
        new Observable(subscriber => {
          const abortController = new AbortController();
          this.docStorage.connection
            .waitForConnected(abortController.signal)
            .then(() => {
              subscriber.next(true);
              subscriber.complete();
            })
            .catch((error: any) => {
              subscriber.error(error);
            });
          return () => abortController.abort(MANUALLY_STOP);
        }),
      'blobStorage.getBlob': key => this.blobStorage.get(key),
      'blobStorage.setBlob': blob => this.blobStorage.set(blob),
      'blobStorage.deleteBlob': ({ key, permanently }) =>
        this.blobStorage.delete(key, permanently),
      'blobStorage.releaseBlobs': () => this.blobStorage.release(),
      'blobStorage.listBlobs': () => this.blobStorage.list(),
      'syncStorage.clearClocks': () => this.syncStorage.clearClocks(),
      'syncStorage.getPeerPulledRemoteClock': ({ peer, docId }) =>
        this.syncStorage.getPeerPulledRemoteClock(peer, docId),
      'syncStorage.getPeerPulledRemoteClocks': ({ peer }) =>
        this.syncStorage.getPeerPulledRemoteClocks(peer),
      'syncStorage.setPeerPulledRemoteClock': ({ peer, clock }) =>
        this.syncStorage.setPeerPulledRemoteClock(peer, clock),
      'syncStorage.getPeerRemoteClock': ({ peer, docId }) =>
        this.syncStorage.getPeerRemoteClock(peer, docId),
      'syncStorage.getPeerRemoteClocks': ({ peer }) =>
        this.syncStorage.getPeerRemoteClocks(peer),
      'syncStorage.setPeerRemoteClock': ({ peer, clock }) =>
        this.syncStorage.setPeerRemoteClock(peer, clock),
      'syncStorage.getPeerPushedClock': ({ peer, docId }) =>
        this.syncStorage.getPeerPushedClock(peer, docId),
      'syncStorage.getPeerPushedClocks': ({ peer }) =>
        this.syncStorage.getPeerPushedClocks(peer),
      'syncStorage.setPeerPushedClock': ({ peer, clock }) =>
        this.syncStorage.setPeerPushedClock(peer, clock),
      'awarenessStorage.update': ({ awareness, origin }) =>
        this.awarenessStorage.update(awareness, origin),
      'awarenessStorage.subscribeUpdate': docId =>
        new Observable(subscriber => {
          return this.awarenessStorage.subscribeUpdate(
            docId,
            (update, origin) => {
              subscriber.next({
                type: 'awareness-update',
                awareness: update,
                origin,
              });
            },
            () => {
              const currentCollectId = collectId++;
              const promise = new Promise<AwarenessRecord | null>(resolve => {
                collectJobs.set(currentCollectId.toString(), awareness => {
                  resolve(awareness);
                  collectJobs.delete(currentCollectId.toString());
                });
              });
              return promise;
            }
          );
        }),
      'awarenessStorage.collect': ({ collectId, awareness }) =>
        collectJobs.get(collectId)?.(awareness),
      'docSync.state': () => this.docSync.state$,
      'docSync.docState': docId =>
        new Observable(subscriber => {
          const subscription = this.docSync
            .docState$(docId)
            .subscribe(state => {
              subscriber.next(state);
            });
          return () => subscription.unsubscribe();
        }),
      'docSync.addPriority': ({ docId, priority }) =>
        new Observable(() => {
          const undo = this.docSync.addPriority(docId, priority);
          return () => undo();
        }),
      'docSync.resetSync': () => this.docSync.resetSync(),
      'blobSync.downloadBlob': key => this.blobSync.downloadBlob(key),
      'blobSync.uploadBlob': blob => this.blobSync.uploadBlob(blob),
      'blobSync.fullDownload': (_, { signal }) =>
        this.blobSync.fullDownload(signal),
      'blobSync.fullUpload': (_, { signal }) =>
        this.blobSync.fullUpload(signal),
      'blobSync.state': () => this.blobSync.state$,
      'blobSync.setMaxBlobSize': size => this.blobSync.setMaxBlobSize(size),
      'blobSync.onReachedMaxBlobSize': () =>
        new Observable(subscriber => {
          const undo = this.blobSync.onReachedMaxBlobSize(byteSize => {
            subscriber.next(byteSize);
          });
          return () => undo();
        }),
      'awarenessSync.update': ({ awareness, origin }) =>
        this.awarenessSync.update(awareness, origin),
      'awarenessSync.subscribeUpdate': docId =>
        new Observable(subscriber => {
          return this.awarenessSync.subscribeUpdate(
            docId,
            (update, origin) => {
              subscriber.next({
                type: 'awareness-update',
                awareness: update,
                origin,
              });
            },
            () => {
              const currentCollectId = collectId++;
              const promise = new Promise<AwarenessRecord | null>(resolve => {
                collectJobs.set(currentCollectId.toString(), awareness => {
                  resolve(awareness);
                  collectJobs.delete(currentCollectId.toString());
                });
              });
              subscriber.next({
                type: 'awareness-collect',
                collectId: currentCollectId.toString(),
              });
              return promise;
            }
          );
        }),
      'awarenessSync.collect': ({ collectId, awareness }) =>
        collectJobs.get(collectId)?.(awareness),
    });
  }
}

export class StoreManagerConsumer {
  private readonly storeDisposers = new Map<string, () => void>();
  private readonly storePool = new Map<
    string,
    { store: StoreConsumer; refCount: number }
  >();

  constructor(
    private readonly availableStorageImplementations: StorageConstructor[]
  ) {}

  bindConsumer(consumer: OpConsumer<WorkerManagerOps>) {
    this.registerHandlers(consumer);
  }

  private registerHandlers(consumer: OpConsumer<WorkerManagerOps>) {
    consumer.registerAll({
      open: ({ port, key, closeKey, options }) => {
        console.debug('open store', key, closeKey);
        let storeRef = this.storePool.get(key);

        if (!storeRef) {
          const store = new StoreConsumer(
            this.availableStorageImplementations,
            options
          );
          storeRef = { store, refCount: 0 };
        }
        storeRef.refCount++;

        const workerConsumer = new OpConsumer<WorkerOps>(port);
        storeRef.store.bindConsumer(workerConsumer);

        this.storeDisposers.set(closeKey, () => {
          storeRef.refCount--;
          if (storeRef.refCount === 0) {
            storeRef.store.destroy().catch(error => {
              console.error(error);
            });
            this.storePool.delete(key);
          }
        });
        this.storePool.set(key, storeRef);
        return closeKey;
      },
      close: key => {
        console.debug('close store', key);
        const workerDisposer = this.storeDisposers.get(key);
        if (!workerDisposer) {
          throw new Error('Worker not found');
        }
        workerDisposer();
        this.storeDisposers.delete(key);
      },
    });
  }
}
