import { createIdentifier } from '@toeverything/infra';

export interface NavigationGestureProvider {
  isEnabled: () => Promise<boolean>;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

export const NavigationGestureProvider =
  createIdentifier<NavigationGestureProvider>('NavigationGestureProvider');
