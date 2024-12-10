import {
  type Framework,
  GlobalCache,
  GlobalSessionState,
  GlobalState,
} from '@toeverything/infra';

import { DesktopApiService } from '../desktop-api';
import { ElectronGlobalCache, ElectronGlobalState } from './impls/electron';
import {
  LocalStorageGlobalCache,
  LocalStorageGlobalState,
  SessionStorageGlobalSessionState,
} from './impls/storage';

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
