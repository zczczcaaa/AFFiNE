import {
  type Framework,
  WorkspaceDBService,
  WorkspaceScope,
  WorkspaceService,
} from '@toeverything/infra';

import { WorkspaceServerService } from '../cloud';
import { FavoriteList } from './entities/favorite-list';
import { FavoriteService } from './services/favorite';
import {
  CompatibleFavoriteItemsAdapter,
  MigrationFavoriteItemsAdapter,
} from './services/old/adapter';
import { FavoriteStore } from './stores/favorite';

export { FavoriteSupportType, isFavoriteSupportType } from './constant';
export type { FavoriteList } from './entities/favorite-list';
export { FavoriteService } from './services/favorite';
export {
  CompatibleFavoriteItemsAdapter,
  MigrationFavoriteItemsAdapter,
} from './services/old/adapter';

export function configureFavoriteModule(framework: Framework) {
  framework
    .scope(WorkspaceScope)
    .service(FavoriteService)
    .entity(FavoriteList, [FavoriteStore])
    .store(FavoriteStore, [
      WorkspaceDBService,
      WorkspaceService,
      WorkspaceServerService,
    ])
    .service(MigrationFavoriteItemsAdapter, [WorkspaceService])
    .service(CompatibleFavoriteItemsAdapter, [FavoriteService]);
}
