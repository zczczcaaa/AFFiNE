import type { DocClock, DocClocks } from './doc';
import { Storage, type StorageOptions } from './storage';

export interface SyncStorageOptions extends StorageOptions {}

export abstract class SyncStorage<
  Opts extends SyncStorageOptions = SyncStorageOptions,
> extends Storage<Opts> {
  override readonly storageType = 'sync';

  abstract getPeerRemoteClock(
    peer: string,
    docId: string
  ): Promise<DocClock | null>;
  abstract getPeerRemoteClocks(peer: string): Promise<DocClocks>;
  abstract setPeerRemoteClock(peer: string, clock: DocClock): Promise<void>;
  abstract getPeerPulledRemoteClock(
    peer: string,
    docId: string
  ): Promise<DocClock | null>;
  abstract getPeerPulledRemoteClocks(peer: string): Promise<DocClocks>;
  abstract setPeerPulledRemoteClock(
    peer: string,
    clock: DocClock
  ): Promise<void>;
  abstract getPeerPushedClock(
    peer: string,
    docId: string
  ): Promise<DocClock | null>;
  abstract getPeerPushedClocks(peer: string): Promise<DocClocks>;
  abstract setPeerPushedClock(peer: string, clock: DocClock): Promise<void>;
  abstract clearClocks(): Promise<void>;
}
