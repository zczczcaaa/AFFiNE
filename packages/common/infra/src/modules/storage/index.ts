export {
  GlobalCache,
  GlobalSessionState,
  GlobalState,
} from './providers/global';
export {
  GlobalCacheService,
  GlobalSessionStateService,
  GlobalStateService,
} from './services/global';

import type { Framework } from '../../framework';
import { MemoryMemento } from '../../storage';
import {
  GlobalCache,
  GlobalSessionState,
  GlobalState,
} from './providers/global';
import {
  GlobalCacheService,
  GlobalSessionStateService,
  GlobalStateService,
} from './services/global';

export const configureGlobalStorageModule = (framework: Framework) => {
  framework.service(GlobalStateService, [GlobalState]);
  framework.service(GlobalCacheService, [GlobalCache]);
  framework.service(GlobalSessionStateService, [GlobalSessionState]);
};

export const configureTestingGlobalStorage = (framework: Framework) => {
  framework.impl(GlobalCache, MemoryMemento);
  framework.impl(GlobalState, MemoryMemento);
  framework.impl(GlobalSessionState, MemoryMemento);
};
