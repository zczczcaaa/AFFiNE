import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

import { AutoReconnectConnection } from '../../../connection';

export interface DocDBSchema extends DBSchema {
  workspace: {
    key: string;
    value: {
      id: string;
      updates: {
        timestamp: number;
        update: Uint8Array;
      }[];
    };
  };
}

export class DocIDBConnection extends AutoReconnectConnection<
  IDBPDatabase<DocDBSchema>
> {
  override get shareId() {
    return 'idb(old):affine-local';
  }

  override async doConnect() {
    return openDB<DocDBSchema>('affine-local', 1, {
      upgrade: db => {
        db.createObjectStore('workspace', { keyPath: 'id' });
      },
    });
  }

  override doDisconnect(conn: IDBPDatabase<DocDBSchema>) {
    conn.close();
  }
}

export interface BlobDBSchema extends DBSchema {
  blob: {
    key: string;
    value: ArrayBuffer;
  };
}

export interface BlobIDBConnectionOptions {
  id: string;
}

export class BlobIDBConnection extends AutoReconnectConnection<
  IDBPDatabase<BlobDBSchema>
> {
  constructor(private readonly options: BlobIDBConnectionOptions) {
    super();
  }

  override get shareId() {
    return `idb(old-blob):${this.options.id}`;
  }

  override async doConnect() {
    return openDB<BlobDBSchema>(`${this.options.id}_blob`, 1, {
      upgrade: db => {
        db.createObjectStore('blob');
      },
    });
  }

  override doDisconnect(conn: IDBPDatabase<BlobDBSchema>) {
    conn.close();
  }
}
