import { Injectable } from '@nestjs/common';
import { PrismaClient, UserStripeCustomer } from '@prisma/client';
import { omit, pick } from 'lodash-es';
import Stripe from 'stripe';
import { z } from 'zod';

import {
  EventEmitter,
  type EventPayload,
  OnEvent,
  SubscriptionAlreadyExists,
  URLHelper,
} from '../../../fundamentals';
import {
  KnownStripeInvoice,
  KnownStripePrice,
  KnownStripeSubscription,
  retriveLookupKeyFromStripeSubscription,
  SubscriptionPlan,
  SubscriptionRecurring,
  SubscriptionStatus,
} from '../types';
import {
  CheckoutParams,
  Invoice,
  Subscription,
  SubscriptionManager,
} from './common';

export const WorkspaceSubscriptionIdentity = z.object({
  plan: z.literal(SubscriptionPlan.Team),
  workspaceId: z.string(),
});

export const WorkspaceSubscriptionCheckoutArgs = z.object({
  plan: z.literal(SubscriptionPlan.Team),
  workspaceId: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
  }),
});

@Injectable()
export class WorkspaceSubscriptionManager extends SubscriptionManager {
  constructor(
    stripe: Stripe,
    db: PrismaClient,
    private readonly url: URLHelper,
    private readonly event: EventEmitter
  ) {
    super(stripe, db);
  }

  filterPrices(
    prices: KnownStripePrice[],
    _customer?: UserStripeCustomer
  ): KnownStripePrice[] {
    return prices.filter(
      price => price.lookupKey.plan === SubscriptionPlan.Team
    );
  }

  async checkout(
    { price }: KnownStripePrice,
    params: z.infer<typeof CheckoutParams>,
    args: z.infer<typeof WorkspaceSubscriptionCheckoutArgs>
  ) {
    const subscription = await this.getSubscription({
      plan: SubscriptionPlan.Team,
      workspaceId: args.workspaceId,
    });

    if (subscription) {
      throw new SubscriptionAlreadyExists({ plan: SubscriptionPlan.Team });
    }

    const customer = await this.getOrCreateCustomer(args.user.id);

    const discounts = await (async () => {
      if (params.coupon) {
        const couponId = await this.getCouponFromPromotionCode(
          params.coupon,
          customer
        );
        if (couponId) {
          return { discounts: [{ coupon: couponId }] };
        }
      }

      return { allow_promotion_codes: true };
    })();

    const count = await this.db.workspaceUserPermission.count({
      where: {
        workspaceId: args.workspaceId,
        // @TODO(darksky): replace with [status: WorkspaceUserPermissionStatus.Accepted]
        accepted: true,
      },
    });

    return this.stripe.checkout.sessions.create({
      line_items: [
        {
          price: price.id,
          quantity: count,
        },
      ],
      tax_id_collection: {
        enabled: true,
      },

      ...discounts,
      mode: 'subscription',
      success_url: this.url.link(params.successCallbackLink),
      customer: customer.stripeCustomerId,
      subscription_data: {
        trial_period_days: 15,
        metadata: {
          workspaceId: args.workspaceId,
        },
      },
    });
  }

  async saveStripeSubscription(subscription: KnownStripeSubscription) {
    const { lookupKey, quantity, stripeSubscription } = subscription;

    const workspaceId = stripeSubscription.metadata.workspaceId;

    if (!workspaceId) {
      throw new Error(
        'Workspace ID is required in workspace subscription metadata'
      );
    }

    this.event.emit('workspace.subscription.activated', {
      workspaceId,
      plan: lookupKey.plan,
      recurring: lookupKey.recurring,
      quantity,
    });

    const subscriptionData = this.transformSubscription(subscription);

    return this.db.subscription.upsert({
      where: {
        stripeSubscriptionId: stripeSubscription.id,
      },
      update: {
        quantity,
        ...pick(subscriptionData, [
          'status',
          'stripeScheduleId',
          'nextBillAt',
          'canceledAt',
        ]),
      },
      create: {
        targetId: workspaceId,
        quantity,
        ...subscriptionData,
      },
    });
  }

  async deleteStripeSubscription({
    lookupKey,
    stripeSubscription,
  }: KnownStripeSubscription) {
    const workspaceId = stripeSubscription.metadata.workspaceId;

    if (!workspaceId) {
      throw new Error(
        'Workspace ID is required in workspace subscription metadata'
      );
    }

    const deleted = await this.db.subscription.deleteMany({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (deleted.count > 0) {
      this.event.emit('workspace.subscription.canceled', {
        workspaceId,
        plan: lookupKey.plan,
        recurring: lookupKey.recurring,
      });
    }
  }

  getSubscription(identity: z.infer<typeof WorkspaceSubscriptionIdentity>) {
    return this.db.subscription.findFirst({
      where: {
        targetId: identity.workspaceId,
        status: {
          in: [SubscriptionStatus.Active, SubscriptionStatus.Trialing],
        },
      },
    });
  }

  async cancelSubscription(subscription: Subscription) {
    return await this.db.subscription.update({
      where: {
        // @ts-expect-error checked outside
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      },
      data: {
        canceledAt: new Date(),
        nextBillAt: null,
      },
    });
  }

  resumeSubscription(subscription: Subscription): Promise<Subscription> {
    return this.db.subscription.update({
      where: {
        // @ts-expect-error checked outside
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      },
      data: {
        canceledAt: null,
        nextBillAt: subscription.end,
      },
    });
  }

  updateSubscriptionRecurring(
    subscription: Subscription,
    recurring: SubscriptionRecurring
  ): Promise<Subscription> {
    return this.db.subscription.update({
      where: {
        // @ts-expect-error checked outside
        stripeSubscriptionId: subscription.stripeSubscriptionId,
      },
      data: { recurring },
    });
  }

  async saveInvoice(knownInvoice: KnownStripeInvoice): Promise<Invoice> {
    const { metadata, stripeInvoice } = knownInvoice;

    const workspaceId = metadata.workspaceId;

    if (!workspaceId) {
      throw new Error('Workspace ID is required in workspace invoice metadata');
    }

    const invoiceData = await this.transformInvoice(knownInvoice);

    return this.db.invoice.upsert({
      where: {
        stripeInvoiceId: stripeInvoice.id,
      },
      update: omit(invoiceData, 'stripeInvoiceId'),
      create: {
        targetId: workspaceId,
        ...invoiceData,
      },
    });
  }

  @OnEvent('workspace.members.updated')
  async onMembersUpdated({
    workspaceId,
    count,
  }: EventPayload<'workspace.members.updated'>) {
    const subscription = await this.getSubscription({
      plan: SubscriptionPlan.Team,
      workspaceId,
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return;
    }
    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );

    const lookupKey =
      retriveLookupKeyFromStripeSubscription(stripeSubscription);

    await this.stripe.subscriptions.update(stripeSubscription.id, {
      items: [
        {
          id: stripeSubscription.items.data[0].id,
          quantity: count,
        },
      ],
      payment_behavior: 'pending_if_incomplete',
      proration_behavior:
        lookupKey?.recurring === SubscriptionRecurring.Yearly
          ? 'always_invoice'
          : 'none',
    });

    if (subscription.stripeScheduleId) {
      const schedule = await this.scheduleManager.fromSchedule(
        subscription.stripeScheduleId
      );
      await schedule.updateQuantity(count);
    }
  }
}
