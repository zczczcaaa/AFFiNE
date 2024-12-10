import { type CreateCheckoutSessionInput } from '@affine/graphql';
import { Service } from '@toeverything/infra';

import { SubscriptionPrices } from '../entities/subscription-prices';
import { WorkspaceSubscription } from '../entities/workspace-subscription';
import type { SubscriptionStore } from '../stores/subscription';

export class WorkspaceSubscriptionService extends Service {
  subscription = this.framework.createEntity(WorkspaceSubscription);
  prices = this.framework.createEntity(SubscriptionPrices);

  constructor(private readonly store: SubscriptionStore) {
    super();
  }

  async createCheckoutSession(input: CreateCheckoutSessionInput) {
    return await this.store.createCheckoutSession(input);
  }
}
