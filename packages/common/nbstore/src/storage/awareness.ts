import { Storage, type StorageOptions } from './storage';

export interface AwarenessStorageOptions extends StorageOptions {}

export type AwarenessRecord = {
  docId: string;
  bin: Uint8Array;
};

export abstract class AwarenessStorage<
  Options extends AwarenessStorageOptions = AwarenessStorageOptions,
> extends Storage<Options> {
  override readonly storageType = 'awareness';

  /**
   * Update the awareness record.
   *
   * @param origin - Internal identifier to recognize the source in the "update" event. Will not be stored or transferred.
   */
  abstract update(record: AwarenessRecord, origin?: string): Promise<void>;

  abstract subscribeUpdate(
    id: string,
    onUpdate: (update: AwarenessRecord, origin?: string) => void,
    onCollect: () => AwarenessRecord
  ): () => void;
}
