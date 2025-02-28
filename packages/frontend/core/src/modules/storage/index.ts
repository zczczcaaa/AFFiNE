export {
  GlobalCache,
  GlobalSessionState,
  GlobalState,
} from './providers/global';
export { NbstoreProvider } from './providers/nbstore';
export {
  GlobalCacheService,
  GlobalSessionStateService,
  GlobalStateService,
} from './services/global';
export { NbstoreService } from './services/nbstore';

import { type Framework } from '@toeverything/infra';

import { DesktopApiService } from '../desktop-api';
import { ElectronGlobalCache, ElectronGlobalState } from './impls/electron';
import {
  LocalStorageGlobalCache,
  LocalStorageGlobalState,
  SessionStorageGlobalSessionState,
} from './impls/storage';
import {
  GlobalCache,
  GlobalSessionState,
  GlobalState,
} from './providers/global';
import { NbstoreProvider } from './providers/nbstore';
import {
  GlobalCacheService,
  GlobalSessionStateService,
  GlobalStateService,
} from './services/global';
import { NbstoreService } from './services/nbstore';

export const configureStorageModule = (framework: Framework) => {
  framework.service(GlobalStateService, [GlobalState]);
  framework.service(GlobalCacheService, [GlobalCache]);
  framework.service(GlobalSessionStateService, [GlobalSessionState]);
  framework.service(NbstoreService, [NbstoreProvider]);
};

export function configureLocalStorageStateStorageImpls(framework: Framework) {
  framework.impl(GlobalCache, LocalStorageGlobalCache);
  framework.impl(GlobalState, LocalStorageGlobalState);
}

export function configureElectronStateStorageImpls(framework: Framework) {
  framework.impl(GlobalCache, ElectronGlobalCache, [DesktopApiService]);
  framework.impl(GlobalState, ElectronGlobalState, [DesktopApiService]);
}

export function configureCommonGlobalStorageImpls(framework: Framework) {
  framework.impl(GlobalSessionState, SessionStorageGlobalSessionState);
}
