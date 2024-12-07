import { Storage, type StorageOptions } from './storage';

export interface BlobStorageOptions extends StorageOptions {}

export interface BlobRecord {
  key: string;
  data: Uint8Array;
  mime: string;
  createdAt: Date;
}

export interface ListedBlobRecord {
  key: string;
  mime: string;
  size: number;
  createdAt: Date;
}

export abstract class BlobStorage<
  Options extends BlobStorageOptions = BlobStorageOptions,
> extends Storage<Options> {
  override readonly storageType = 'blob';

  abstract get(key: string, signal?: AbortSignal): Promise<BlobRecord | null>;
  abstract set(blob: BlobRecord, signal?: AbortSignal): Promise<void>;
  abstract delete(
    key: string,
    permanently: boolean,
    signal?: AbortSignal
  ): Promise<void>;
  abstract release(signal?: AbortSignal): Promise<void>;
  abstract list(signal?: AbortSignal): Promise<ListedBlobRecord[]>;
}
