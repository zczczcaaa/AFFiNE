import { AutoReconnectConnection } from '../../connection';
import type {
  BlobRecord,
  DocClock,
  DocRecord,
  ListedBlobRecord,
} from '../../storage';
import { type SpaceType, universalId } from '../../utils/universal-id';

export interface SqliteNativeDBOptions {
  readonly flavour: string;
  readonly type: SpaceType;
  readonly id: string;
}

export type NativeDBApis = {
  connect(id: string): Promise<void>;
  disconnect(id: string): Promise<void>;
  pushUpdate(id: string, docId: string, update: Uint8Array): Promise<Date>;
  getDocSnapshot(id: string, docId: string): Promise<DocRecord | null>;
  setDocSnapshot(id: string, snapshot: DocRecord): Promise<boolean>;
  getDocUpdates(id: string, docId: string): Promise<DocRecord[]>;
  markUpdatesMerged(
    id: string,
    docId: string,
    updates: Date[]
  ): Promise<number>;
  deleteDoc(id: string, docId: string): Promise<void>;
  getDocClocks(
    id: string,
    after?: Date | undefined | null
  ): Promise<DocClock[]>;
  getDocClock(id: string, docId: string): Promise<DocClock | null>;
  getBlob(id: string, key: string): Promise<BlobRecord | null>;
  setBlob(id: string, blob: BlobRecord): Promise<void>;
  deleteBlob(id: string, key: string, permanently: boolean): Promise<void>;
  releaseBlobs(id: string): Promise<void>;
  listBlobs(id: string): Promise<ListedBlobRecord[]>;
  getPeerRemoteClocks(id: string, peer: string): Promise<DocClock[]>;
  getPeerRemoteClock(
    id: string,
    peer: string,
    docId: string
  ): Promise<DocClock | null>;
  setPeerRemoteClock(
    id: string,
    peer: string,
    docId: string,
    clock: Date
  ): Promise<void>;
  getPeerPulledRemoteClocks(id: string, peer: string): Promise<DocClock[]>;
  getPeerPulledRemoteClock(
    id: string,
    peer: string,
    docId: string
  ): Promise<DocClock | null>;
  setPeerPulledRemoteClock(
    id: string,
    peer: string,
    docId: string,
    clock: Date
  ): Promise<void>;
  getPeerPushedClocks(id: string, peer: string): Promise<DocClock[]>;
  getPeerPushedClock(
    id: string,
    peer: string,
    docId: string
  ): Promise<DocClock | null>;
  setPeerPushedClock(
    id: string,
    peer: string,
    docId: string,
    clock: Date
  ): Promise<void>;
  clearClocks(id: string): Promise<void>;
};

type NativeDBApisWrapper = NativeDBApis extends infer APIs
  ? {
      [K in keyof APIs]: APIs[K] extends (...args: any[]) => any
        ? Parameters<APIs[K]> extends [string, ...infer Rest]
          ? (...args: Rest) => ReturnType<APIs[K]>
          : never
        : never;
    }
  : never;

let apis: NativeDBApis | null = null;

export function bindNativeDBApis(a: NativeDBApis) {
  apis = a;
}

export class NativeDBConnection extends AutoReconnectConnection<void> {
  readonly apis: NativeDBApisWrapper;

  readonly flavour = this.options.flavour;
  readonly type = this.options.type;
  readonly id = this.options.id;

  constructor(private readonly options: SqliteNativeDBOptions) {
    super();

    if (!apis) {
      throw new Error('Not in native context.');
    }

    this.apis = this.warpApis(apis);
  }

  override get shareId(): string {
    return `sqlite:${this.flavour}:${this.type}:${this.id}`;
  }

  warpApis(originalApis: NativeDBApis): NativeDBApisWrapper {
    const id = universalId({
      peer: this.flavour,
      type: this.type,
      id: this.id,
    });
    return new Proxy(
      {},
      {
        get: (_target, key: keyof NativeDBApisWrapper) => {
          const v = originalApis[key];

          return async (...args: any[]) => {
            return v.call(
              originalApis,
              id,
              // @ts-expect-error I don't know why it complains ts(2556)
              ...args
            );
          };
        },
      }
    ) as unknown as NativeDBApisWrapper;
  }

  override async doConnect() {
    await this.apis.connect();
  }

  override doDisconnect() {
    this.apis.disconnect().catch(err => {
      console.error('NativeDBConnection close failed', err);
    });
  }
}
