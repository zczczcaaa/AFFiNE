import type { Connection } from '../connection';

export type SpaceType = 'workspace' | 'userspace';
export type StorageType = 'blob' | 'doc' | 'sync';

export interface StorageOptions {
  peer: string;
  type: SpaceType;
  id: string;
}

export abstract class Storage<Opts extends StorageOptions = StorageOptions> {
  abstract readonly storageType: StorageType;
  abstract readonly connection: Connection;

  get peer() {
    return this.options.peer;
  }

  get spaceType() {
    return this.options.type;
  }

  get spaceId() {
    return this.options.id;
  }

  constructor(public readonly options: Opts) {}

  async connect() {
    await this.connection.connect();
  }

  async disconnect() {
    await this.connection.disconnect();
  }
}
