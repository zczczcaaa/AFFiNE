import type { BlobRecord, BlobStorage } from '../storage';
import type { BlobSyncEngine } from '../sync/blob';

export class BlobFrontend {
  constructor(
    readonly storage: BlobStorage,
    readonly sync?: BlobSyncEngine
  ) {}

  get(blobId: string) {
    return this.sync
      ? this.sync.downloadBlob(blobId)
      : this.storage.get(blobId);
  }

  set(blob: BlobRecord) {
    return this.sync ? this.sync.uploadBlob(blob) : this.storage.set(blob);
  }

  addPriority(id: string, priority: number) {
    return this.sync?.addPriority(id, priority);
  }
}
