import { Container, type ServiceProvider } from '@blocksuite/global/di';

import type { Extension, StoreExtension } from '../extension';
import type { Blocks } from '../model';
import { StoreIdentifier } from './identifier';

export interface StoreOptions {
  blocks: Blocks;
  provider?: ServiceProvider;
  extensions?: (typeof Extension | typeof StoreExtension)[];
}

export class Store {
  private readonly _blocks: Blocks;
  private readonly _provider: ServiceProvider;

  get blocks() {
    return this._blocks;
  }

  get provider() {
    return this._provider;
  }

  get awareness() {
    return this._blocks.awarenessStore;
  }

  constructor(options: StoreOptions) {
    this._blocks = options.blocks;
    const container = new Container();
    container.addImpl(StoreIdentifier, () => this);

    const userExtensions = options.extensions ?? [];
    userExtensions.forEach(extension => {
      extension.setup(container);
    });

    this._provider = container.provider(undefined, options.provider);
  }
}
