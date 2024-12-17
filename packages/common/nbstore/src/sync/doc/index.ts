import type { DocStorage, SyncStorage } from '../../storage';
import { DocSyncPeer } from './peer';

export class DocSync {
  private readonly peers: DocSyncPeer[];
  private abort: AbortController | null = null;

  constructor(
    readonly local: DocStorage,
    readonly sync: SyncStorage,
    readonly remotes: DocStorage[]
  ) {
    this.peers = remotes.map(remote => new DocSyncPeer(local, sync, remote));
  }

  start() {
    if (this.abort) {
      this.abort.abort();
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
    this.abort?.abort();
    this.abort = null;
  }

  addPriority(id: string, priority: number) {
    const undo = this.peers.map(peer => peer.addPriority(id, priority));
    return () => undo.forEach(fn => fn());
  }
}
