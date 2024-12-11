import type { BlobStorage, DocStorage, SpaceStorage } from '../storage';
import { BlobSyncEngine } from './blob';
import { DocSyncEngine } from './doc';

export class SyncEngine {
  private readonly doc: DocSyncEngine | null;
  private readonly blob: BlobSyncEngine | null;

  constructor(
    readonly local: SpaceStorage,
    readonly peers: SpaceStorage[]
  ) {
    const doc = local.tryGet('doc');
    const blob = local.tryGet('blob');
    const sync = local.tryGet('sync');

    this.doc =
      doc && sync
        ? new DocSyncEngine(
            doc,
            sync,
            peers
              .map(peer => peer.tryGet('doc'))
              .filter((v): v is DocStorage => !!v)
          )
        : null;
    this.blob = blob
      ? new BlobSyncEngine(
          blob,
          peers
            .map(peer => peer.tryGet('blob'))
            .filter((v): v is BlobStorage => !!v)
        )
      : null;
  }

  start() {
    this.doc?.start();
    this.blob?.start();
  }

  stop() {
    this.doc?.stop();
    this.blob?.stop();
  }
}
