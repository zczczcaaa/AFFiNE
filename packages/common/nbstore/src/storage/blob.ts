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

  abstract get(key: string): Promise<BlobRecord | null>;
  abstract set(blob: BlobRecord): Promise<void>;
  abstract delete(key: string, permanently: boolean): Promise<void>;
  abstract release(): Promise<void>;
  abstract list(): Promise<ListedBlobRecord[]>;
}
