import type { SubscriptionQuery, SubscriptionRecurring } from '@affine/graphql';
import { SubscriptionPlan } from '@affine/graphql';
import type { WorkspaceService } from '@toeverything/infra';
import {
  backoffRetry,
  catchErrorInto,
  effect,
  Entity,
  exhaustMapWithTrailing,
  fromPromise,
  LiveData,
  onComplete,
  onStart,
} from '@toeverything/infra';
import { EMPTY, mergeMap } from 'rxjs';

import { isBackendError, isNetworkError } from '../error';
import type { ServerService } from '../services/server';
import type { SubscriptionStore } from '../stores/subscription';

export type SubscriptionType = NonNullable<
  SubscriptionQuery['currentUser']
>['subscriptions'][number];

export class WorkspaceSubscription extends Entity {
  subscription$ = new LiveData<SubscriptionType | null | undefined>(null);
  isRevalidating$ = new LiveData(false);
  error$ = new LiveData<any | null>(null);

  team$ = this.subscription$.map(
    subscription => subscription?.plan === SubscriptionPlan.Team
  );

  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly serverService: ServerService,
    private readonly store: SubscriptionStore
  ) {
    super();
  }

  async resumeSubscription(idempotencyKey: string, plan?: SubscriptionPlan) {
    await this.store.mutateResumeSubscription(idempotencyKey, plan);
    await this.waitForRevalidation();
  }

  async cancelSubscription(idempotencyKey: string, plan?: SubscriptionPlan) {
    await this.store.mutateCancelSubscription(idempotencyKey, plan);
    await this.waitForRevalidation();
  }

  async setSubscriptionRecurring(
    idempotencyKey: string,
    recurring: SubscriptionRecurring,
    plan?: SubscriptionPlan
  ) {
    await this.store.setSubscriptionRecurring(idempotencyKey, recurring, plan);
    await this.waitForRevalidation();
  }

  async waitForRevalidation(signal?: AbortSignal) {
    this.revalidate();
    await this.isRevalidating$.waitFor(
      isRevalidating => !isRevalidating,
      signal
    );
  }

  revalidate = effect(
    exhaustMapWithTrailing(() => {
      return fromPromise(async signal => {
        const currentWorkspaceId = this.workspaceService.workspace.id;
        if (!currentWorkspaceId) {
          return undefined; // no subscription if no user
        }
        const serverConfig =
          await this.serverService.server.features$.waitForNonNull(signal);

        if (!serverConfig.payment) {
          // No payment feature, no subscription
          return {
            workspaceId: currentWorkspaceId,
            subscription: null,
          };
        }
        const { workspaceId, subscription } =
          await this.store.fetchWorkspaceSubscriptions(
            currentWorkspaceId,
            signal
          );
        return {
          workspaceId: workspaceId,
          subscription: subscription,
        };
      }).pipe(
        backoffRetry({
          when: isNetworkError,
          count: Infinity,
        }),
        backoffRetry({
          when: isBackendError,
        }),
        mergeMap(data => {
          if (data && data.subscription && data.workspaceId) {
            this.store.setCachedWorkspaceSubscription(
              data.workspaceId,
              data.subscription
            );
            this.subscription$.next(data.subscription);
          } else {
            this.subscription$.next(undefined);
          }
          return EMPTY;
        }),
        catchErrorInto(this.error$),
        onStart(() => this.isRevalidating$.next(true)),
        onComplete(() => this.isRevalidating$.next(false))
      );
    })
  );

  reset() {
    this.subscription$.next(null);
    this.team$.next(false);
    this.isRevalidating$.next(false);
    this.error$.next(null);
  }

  override dispose(): void {
    this.revalidate.unsubscribe();
  }
}
