import type { BlobStorage, DocStorage, SpaceStorage } from '../storage';
import { BlobSync } from './blob';
import { DocSync } from './doc';

export class Sync {
  private readonly doc: DocSync | null;
  private readonly blob: BlobSync | null;

  constructor(
    readonly local: SpaceStorage,
    readonly peers: SpaceStorage[]
  ) {
    const doc = local.tryGet('doc');
    const blob = local.tryGet('blob');
    const sync = local.tryGet('sync');

    this.doc =
      doc && sync
        ? new DocSync(
            doc,
            sync,
            peers
              .map(peer => peer.tryGet('doc'))
              .filter((v): v is DocStorage => !!v)
          )
        : null;
    this.blob = blob
      ? new BlobSync(
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
