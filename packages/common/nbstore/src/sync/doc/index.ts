import type { Observable } from 'rxjs';
import { combineLatest, map, of, ReplaySubject, share } from 'rxjs';

import type { DocStorage, SyncStorage } from '../../storage';
import { DummyDocStorage } from '../../storage/dummy/doc';
import { DummySyncStorage } from '../../storage/dummy/sync';
import { MANUALLY_STOP } from '../../utils/throw-if-aborted';
import type { PeerStorageOptions } from '../types';
import { DocSyncPeer } from './peer';

export interface DocSyncState {
  total: number;
  syncing: number;
  synced: boolean;
  retrying: boolean;
  errorMessage: string | null;
}

export interface DocSyncDocState {
  synced: boolean;
  syncing: boolean;
  retrying: boolean;
  errorMessage: string | null;
}

export interface DocSync {
  readonly state$: Observable<DocSyncState>;
  docState$(docId: string): Observable<DocSyncDocState>;
  addPriority(id: string, priority: number): () => void;
  resetSync(): Promise<void>;
}

export class DocSyncImpl implements DocSync {
  private readonly peers: DocSyncPeer[] = Object.entries(
    this.storages.remotes
  ).map(
    ([peerId, remote]) =>
      new DocSyncPeer(peerId, this.storages.local, this.sync, remote)
  );
  private abort: AbortController | null = null;

  state$ = combineLatest(this.peers.map(peer => peer.peerState$)).pipe(
    map(allPeers =>
      allPeers.length === 0
        ? {
            total: 0,
            syncing: 0,
            synced: true,
            retrying: false,
            errorMessage: null,
          }
        : {
            total: allPeers.reduce((acc, peer) => Math.max(acc, peer.total), 0),
            syncing: allPeers.reduce(
              (acc, peer) => Math.max(acc, peer.syncing),
              0
            ),
            synced: allPeers.every(peer => peer.synced),
            retrying: allPeers.some(peer => peer.retrying),
            errorMessage:
              allPeers.find(peer => peer.errorMessage)?.errorMessage ?? null,
          }
    ),
    share({
      connector: () => new ReplaySubject(1),
    })
  ) as Observable<DocSyncState>;

  constructor(
    readonly storages: PeerStorageOptions<DocStorage>,
    readonly sync: SyncStorage
  ) {}

  /**
   * for testing
   */
  static get dummy() {
    return new DocSyncImpl(
      {
        local: new DummyDocStorage(),
        remotes: {},
      },
      new DummySyncStorage()
    );
  }

  docState$(docId: string): Observable<DocSyncDocState> {
    if (this.peers.length === 0) {
      return of({
        errorMessage: null,
        retrying: false,
        syncing: false,
        synced: true,
      });
    }
    return combineLatest(this.peers.map(peer => peer.docState$(docId))).pipe(
      map(allPeers => {
        return {
          errorMessage:
            allPeers.find(peer => peer.errorMessage)?.errorMessage ?? null,
          retrying: allPeers.some(peer => peer.retrying),
          syncing: allPeers.some(peer => peer.syncing),
          synced: allPeers.every(peer => peer.synced),
        };
      })
    );
  }

  start() {
    if (this.abort) {
      this.abort.abort(MANUALLY_STOP);
    }
    const abort = new AbortController();
    this.abort = abort;
    Promise.allSettled(
      this.peers.map(peer => peer.mainLoop(abort.signal))
    ).catch(error => {
      console.error(error);
    });
  }

  stop() {
    this.abort?.abort(MANUALLY_STOP);
    this.abort = null;
  }

  addPriority(id: string, priority: number) {
    const undo = this.peers.map(peer => peer.addPriority(id, priority));
    return () => undo.forEach(fn => fn());
  }

  async resetSync() {
    const running = this.abort !== null;
    this.stop();
    await this.sync.clearClocks();
    if (running) {
      this.start();
    }
  }
}
