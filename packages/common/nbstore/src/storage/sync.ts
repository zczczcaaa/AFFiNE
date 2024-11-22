import type { DocClock, DocClocks } from './doc';
import { Storage, type StorageOptions } from './storage';

export interface SyncStorageOptions extends StorageOptions {}

export abstract class SyncStorage<
  Opts extends SyncStorageOptions = SyncStorageOptions,
> extends Storage<Opts> {
  override readonly storageType = 'sync';

  abstract getPeerClocks(peer: string): Promise<DocClocks>;
  abstract setPeerClock(peer: string, clock: DocClock): Promise<void>;
  abstract getPeerPushedClocks(peer: string): Promise<DocClocks>;
  abstract setPeerPushedClock(peer: string, clock: DocClock): Promise<void>;
  abstract clearClocks(): Promise<void>;
}
