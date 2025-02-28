import type { License } from '@affine/graphql';
import {
  backoffRetry,
  catchErrorInto,
  effect,
  exhaustMapWithTrailing,
  fromPromise,
  LiveData,
  onComplete,
  onStart,
  Service,
} from '@toeverything/infra';
import { EMPTY, mergeMap } from 'rxjs';

import type { WorkspaceService } from '../../workspace';
import { isBackendError, isNetworkError } from '../error';
import type { SelfhostLicenseStore } from '../stores/selfhost-license';

export class SelfhostLicenseService extends Service {
  constructor(
    private readonly store: SelfhostLicenseStore,
    private readonly workspaceService: WorkspaceService
  ) {
    super();
  }
  license$ = new LiveData<License | null>(null);
  isRevalidating$ = new LiveData(false);
  error$ = new LiveData<any | null>(null);

  revalidate = effect(
    exhaustMapWithTrailing(() => {
      return fromPromise(async signal => {
        const currentWorkspaceId = this.workspaceService.workspace.id;
        if (!currentWorkspaceId) {
          return undefined; // no subscription if no user
        }
        return await this.store.getLicense(currentWorkspaceId, signal);
      }).pipe(
        backoffRetry({
          when: isNetworkError,
          count: Infinity,
        }),
        backoffRetry({
          when: isBackendError,
        }),
        mergeMap(data => {
          if (data) {
            this.license$.next(data);
          }

          return EMPTY;
        }),
        catchErrorInto(this.error$),
        onStart(() => this.isRevalidating$.next(true)),
        onComplete(() => this.isRevalidating$.next(false))
      );
    })
  );

  async activateLicense(workspaceId: string, licenseKey: string) {
    return await this.store.activate(workspaceId, licenseKey);
  }

  async deactivateLicense(workspaceId: string) {
    return await this.store.deactivate(workspaceId);
  }

  clear() {
    this.license$.next(null);
    this.error$.next(null);
  }
}
