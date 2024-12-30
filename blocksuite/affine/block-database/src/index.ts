import type { DatabaseBlockModel } from '@blocksuite/affine-model';

export * from './adapters';
export type { DatabaseOptionsConfig } from './config';
export * from './data-source';
export * from './database-block';
export * from './database-service';
export * from './database-spec';
export * from './detail-panel/block-renderer';
export * from './detail-panel/note-renderer';
export * from './properties';
export * from './properties/rich-text/cell-renderer';
export * from './properties/utils';
export * from './utils/block-utils';

declare global {
  namespace BlockSuite {
    interface BlockModels {
      'affine:database': DatabaseBlockModel;
    }
  }
}
