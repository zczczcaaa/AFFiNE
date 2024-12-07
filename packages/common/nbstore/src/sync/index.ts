import type { BlobStorage, DocStorage, SpaceStorage } from '../storage';
import { BlobSyncEngine } from './blob';
import { DocSyncEngine } from './doc';

export class SyncEngine {
  constructor(
    readonly local: SpaceStorage,
    readonly peers: SpaceStorage[]
  ) {}

  async run(signal?: AbortSignal) {
    const doc = this.local.tryGet('doc');
    const blob = this.local.tryGet('blob');
    const sync = this.local.tryGet('sync');

    await Promise.allSettled([
      (async () => {
        if (doc && sync) {
          const peerDocs = this.peers
            .map(peer => peer.tryGet('doc'))
            .filter((v): v is DocStorage => !!v);

          const engine = new DocSyncEngine(doc, sync, peerDocs);
          await engine.run(signal);
        }
      })(),
      (async () => {
        if (blob) {
          const peerBlobs = this.peers
            .map(peer => peer.tryGet('blob'))
            .filter((v): v is BlobStorage => !!v);

          const engine = new BlobSyncEngine(blob, peerBlobs);
          await engine.run(signal);
        }
      })(),
    ]);
  }
}
