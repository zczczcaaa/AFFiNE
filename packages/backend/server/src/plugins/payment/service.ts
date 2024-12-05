import { Injectable, Logger } from '@nestjs/common';
import type { User, UserStripeCustomer } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { z } from 'zod';

import { CurrentUser } from '../../core/auth';
import { FeatureManagementService } from '../../core/features';
import { UserService } from '../../core/user';
import {
  ActionForbidden,
  CantUpdateOnetimePaymentSubscription,
  Config,
  CustomerPortalCreateFailed,
  InternalServerError,
  InvalidCheckoutParameters,
  InvalidSubscriptionParameters,
  OnEvent,
  SameSubscriptionRecurring,
  SubscriptionExpired,
  SubscriptionHasBeenCanceled,
  SubscriptionHasNotBeenCanceled,
  SubscriptionNotExists,
  SubscriptionPlanNotFound,
  UnsupportedSubscriptionPlan,
  UserNotFound,
} from '../../fundamentals';
import {
  CheckoutParams,
  Invoice,
  Subscription,
  SubscriptionManager,
  UserSubscriptionCheckoutArgs,
  UserSubscriptionIdentity,
  UserSubscriptionManager,
  WorkspaceSubscriptionCheckoutArgs,
  WorkspaceSubscriptionIdentity,
  WorkspaceSubscriptionManager,
} from './manager';
import { ScheduleManager } from './schedule';
import {
  encodeLookupKey,
  KnownStripeInvoice,
  KnownStripePrice,
  KnownStripeSubscription,
  LookupKey,
  retriveLookupKeyFromStripePrice,
  retriveLookupKeyFromStripeSubscription,
  SubscriptionPlan,
  SubscriptionRecurring,
  SubscriptionStatus,
} from './types';

export const CheckoutExtraArgs = z.union([
  UserSubscriptionCheckoutArgs,
  WorkspaceSubscriptionCheckoutArgs,
]);

export const SubscriptionIdentity = z.union([
  UserSubscriptionIdentity,
  WorkspaceSubscriptionIdentity,
]);

export { CheckoutParams };

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly scheduleManager = new ScheduleManager(this.stripe);

  constructor(
    private readonly config: Config,
    private readonly stripe: Stripe,
    private readonly db: PrismaClient,
    private readonly feature: FeatureManagementService,
    private readonly user: UserService,
    private readonly userManager: UserSubscriptionManager,
    private readonly workspaceManager: WorkspaceSubscriptionManager
  ) {}

  private select(plan: SubscriptionPlan): SubscriptionManager {
    switch (plan) {
      case SubscriptionPlan.Team:
        return this.workspaceManager;
      case SubscriptionPlan.Pro:
      case SubscriptionPlan.AI:
        return this.userManager;
      default:
        throw new UnsupportedSubscriptionPlan({ plan });
    }
  }

  async listPrices(user?: CurrentUser): Promise<KnownStripePrice[]> {
    const prices = await this.listStripePrices();

    const customer = user
      ? await this.getOrCreateCustomer({
          userId: user.id,
          userEmail: user.email,
        })
      : undefined;

    return [
      ...(await this.userManager.filterPrices(prices, customer)),
      ...this.workspaceManager.filterPrices(prices, customer),
    ];
  }

  async checkout(
    params: z.infer<typeof CheckoutParams>,
    args: z.infer<typeof CheckoutExtraArgs>
  ) {
    const { plan, recurring, variant } = params;

    if (
      this.config.deploy &&
      this.config.affine.canary &&
      !this.feature.isStaff(args.user.email)
    ) {
      throw new ActionForbidden();
    }

    const price = await this.getPrice({
      plan,
      recurring,
      variant: variant ?? null,
    });

    if (!price) {
      throw new SubscriptionPlanNotFound({
        plan,
        recurring,
      });
    }

    const manager = this.select(plan);
    const result = CheckoutExtraArgs.safeParse(args);

    if (!result.success) {
      throw new InvalidCheckoutParameters();
    }

    return manager.checkout(price, params, args);
  }

  async cancelSubscription(
    identity: z.infer<typeof SubscriptionIdentity>,
    idempotencyKey?: string
  ): Promise<Subscription> {
    this.assertSubscriptionIdentity(identity);

    const manager = this.select(identity.plan);
    const subscription = await manager.getSubscription(identity);

    if (!subscription) {
      throw new SubscriptionNotExists({ plan: identity.plan });
    }

    if (!subscription.stripeSubscriptionId) {
      throw new CantUpdateOnetimePaymentSubscription(
        'Onetime payment subscription cannot be canceled.'
      );
    }

    if (subscription.canceledAt) {
      throw new SubscriptionHasBeenCanceled();
    }

    // update the subscription in db optimistically
    const newSubscription = manager.cancelSubscription(subscription);

    // should release the schedule first
    if (subscription.stripeScheduleId) {
      const manager = await this.scheduleManager.fromSchedule(
        subscription.stripeScheduleId
      );
      await manager.cancel(idempotencyKey);
    } else {
      // let customer contact support if they want to cancel immediately
      // see https://stripe.com/docs/billing/subscriptions/cancel
      await this.stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        { cancel_at_period_end: true },
        { idempotencyKey }
      );
    }

    return newSubscription;
  }

  async resumeSubscription(
    identity: z.infer<typeof SubscriptionIdentity>,
    idempotencyKey?: string
  ): Promise<Subscription> {
    this.assertSubscriptionIdentity(identity);

    const manager = this.select(identity.plan);

    const subscription = await manager.getSubscription(identity);

    if (!subscription) {
      throw new SubscriptionNotExists({ plan: identity.plan });
    }

    if (!subscription.canceledAt) {
      throw new SubscriptionHasNotBeenCanceled();
    }

    if (!subscription.stripeSubscriptionId || !subscription.end) {
      throw new CantUpdateOnetimePaymentSubscription(
        'Onetime payment subscription cannot be resumed.'
      );
    }

    if (subscription.end < new Date()) {
      throw new SubscriptionExpired();
    }

    // update the subscription in db optimistically
    const newSubscription = await manager.resumeSubscription(subscription);

    if (subscription.stripeScheduleId) {
      const manager = await this.scheduleManager.fromSchedule(
        subscription.stripeScheduleId
      );
      await manager.resume(idempotencyKey);
    } else {
      await this.stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        { cancel_at_period_end: false },
        { idempotencyKey }
      );
    }

    return newSubscription;
  }

  async updateSubscriptionRecurring(
    identity: z.infer<typeof SubscriptionIdentity>,
    recurring: SubscriptionRecurring,
    idempotencyKey?: string
  ): Promise<Subscription> {
    this.assertSubscriptionIdentity(identity);

    const manager = this.select(identity.plan);
    const subscription = await manager.getSubscription(identity);

    if (!subscription) {
      throw new SubscriptionNotExists({ plan: identity.plan });
    }

    if (!subscription.stripeSubscriptionId) {
      throw new CantUpdateOnetimePaymentSubscription();
    }

    if (subscription.canceledAt) {
      throw new SubscriptionHasBeenCanceled();
    }

    if (subscription.recurring === recurring) {
      throw new SameSubscriptionRecurring({ recurring });
    }

    const price = await this.getPrice({
      plan: identity.plan,
      recurring,
      variant: null,
    });

    if (!price) {
      throw new SubscriptionPlanNotFound({
        plan: identity.plan,
        recurring,
      });
    }

    // update the subscription in db optimistically
    const newSubscription = manager.updateSubscriptionRecurring(
      subscription,
      recurring
    );

    const scheduleManager = await this.scheduleManager.fromSubscription(
      subscription.stripeSubscriptionId
    );

    await scheduleManager.update(price.price.id, idempotencyKey);

    return newSubscription;
  }

  async createCustomerPortal(id: string) {
    const user = await this.db.userStripeCustomer.findUnique({
      where: {
        userId: id,
      },
    });

    if (!user) {
      throw new UserNotFound();
    }

    try {
      const portal = await this.stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
      });

      return portal.url;
    } catch (e) {
      this.logger.error('Failed to create customer portal.', e);
      throw new CustomerPortalCreateFailed();
    }
  }

  async saveStripeInvoice(stripeInvoice: Stripe.Invoice): Promise<Invoice> {
    const knownInvoice = await this.parseStripeInvoice(stripeInvoice);

    if (!knownInvoice) {
      throw new InternalServerError('Failed to parse stripe invoice.');
    }

    return this.select(knownInvoice.lookupKey.plan).saveInvoice(knownInvoice);
  }

  async saveStripeSubscription(subscription: Stripe.Subscription) {
    const knownSubscription = await this.parseStripeSubscription(subscription);

    if (!knownSubscription) {
      throw new InternalServerError('Failed to parse stripe subscription.');
    }

    const isPlanActive =
      subscription.status === SubscriptionStatus.Active ||
      subscription.status === SubscriptionStatus.Trialing;

    const manager = this.select(knownSubscription.lookupKey.plan);

    if (!isPlanActive) {
      await manager.deleteStripeSubscription(knownSubscription);
    } else {
      await manager.saveStripeSubscription(knownSubscription);
    }
  }

  async deleteStripeSubscription(subscription: Stripe.Subscription) {
    const knownSubscription = await this.parseStripeSubscription(subscription);

    if (!knownSubscription) {
      throw new InternalServerError('Failed to parse stripe subscription.');
    }

    const manager = this.select(knownSubscription.lookupKey.plan);
    await manager.deleteStripeSubscription(knownSubscription);
  }

  async getOrCreateCustomer({
    userId,
    userEmail,
  }: {
    userId: string;
    userEmail: string;
  }): Promise<UserStripeCustomer> {
    let customer = await this.db.userStripeCustomer.findUnique({
      where: {
        userId,
      },
    });

    if (!customer) {
      const stripeCustomersList = await this.stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      let stripeCustomer: Stripe.Customer | undefined;
      if (stripeCustomersList.data.length) {
        stripeCustomer = stripeCustomersList.data[0];
      } else {
        stripeCustomer = await this.stripe.customers.create({
          email: userEmail,
        });
      }

      customer = await this.db.userStripeCustomer.create({
        data: {
          userId,
          stripeCustomerId: stripeCustomer.id,
        },
      });
    }

    return customer;
  }

  @OnEvent('user.updated')
  async onUserUpdated(user: User) {
    const customer = await this.db.userStripeCustomer.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (customer) {
      const stripeCustomer = await this.stripe.customers.retrieve(
        customer.stripeCustomerId
      );
      if (!stripeCustomer.deleted && stripeCustomer.email !== user.email) {
        await this.stripe.customers.update(customer.stripeCustomerId, {
          email: user.email,
        });
      }
    }
  }

  private async retrieveUserFromCustomer(
    customer: string | Stripe.Customer | Stripe.DeletedCustomer
  ) {
    const userStripeCustomer = await this.db.userStripeCustomer.findUnique({
      where: {
        stripeCustomerId: typeof customer === 'string' ? customer : customer.id,
      },
    });

    if (userStripeCustomer) {
      return userStripeCustomer.userId;
    }

    if (typeof customer === 'string') {
      customer = await this.stripe.customers.retrieve(customer);
    }

    if (customer.deleted || !customer.email || !customer.id) {
      return null;
    }

    const user = await this.user.findUserByEmail(customer.email);

    if (!user) {
      return null;
    }

    await this.db.userStripeCustomer.create({
      data: {
        userId: user.id,
        stripeCustomerId: customer.id,
      },
    });

    return user.id;
  }

  private async listStripePrices(): Promise<KnownStripePrice[]> {
    const prices = await this.stripe.prices.list({
      active: true,
      limit: 100,
    });

    return prices.data
      .map(price => this.parseStripePrice(price))
      .filter(Boolean) as KnownStripePrice[];
  }

  private async getPrice(
    lookupKey: LookupKey
  ): Promise<KnownStripePrice | null> {
    const prices = await this.stripe.prices.list({
      lookup_keys: [encodeLookupKey(lookupKey)],
      limit: 1,
    });

    const price = prices.data[0];

    return price
      ? {
          lookupKey,
          price,
        }
      : null;
  }

  private async parseStripeInvoice(
    invoice: Stripe.Invoice
  ): Promise<KnownStripeInvoice | null> {
    // we can't do anything if we can't recognize the customer
    if (!invoice.customer_email) {
      return null;
    }

    const price = invoice.lines.data[0]?.price;

    // there should be at least one line item in the invoice
    if (!price) {
      return null;
    }

    const lookupKey = retriveLookupKeyFromStripePrice(price);

    // The whole subscription system depends on the lookup_keys bound with prices.
    // if the price comes with no lookup_key, we should just ignore it.
    if (!lookupKey) {
      return null;
    }

    const user = await this.user.findUserByEmail(invoice.customer_email);

    // TODO(@forehalo): the email may actually not appear to be AFFiNE user
    // There is coming feature that allow anonymous user with only email provided to buy selfhost licenses
    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      stripeInvoice: invoice,
      lookupKey,
      metadata: invoice.subscription_details?.metadata ?? {},
    };
  }

  private async parseStripeSubscription(
    subscription: Stripe.Subscription
  ): Promise<KnownStripeSubscription | null> {
    const lookupKey = retriveLookupKeyFromStripeSubscription(subscription);

    if (!lookupKey) {
      return null;
    }

    const userId = await this.retrieveUserFromCustomer(subscription.customer);

    if (!userId) {
      return null;
    }

    return {
      userId,
      lookupKey,
      stripeSubscription: subscription,
      quantity: subscription.items.data[0]?.quantity ?? 1,
      metadata: subscription.metadata,
    };
  }

  private parseStripePrice(price: Stripe.Price): KnownStripePrice | null {
    const lookupKey = retriveLookupKeyFromStripePrice(price);

    return lookupKey
      ? {
          lookupKey,
          price,
        }
      : null;
  }

  private assertSubscriptionIdentity(
    args: z.infer<typeof SubscriptionIdentity>
  ) {
    const result = SubscriptionIdentity.safeParse(args);

    if (!result.success) {
      throw new InvalidSubscriptionParameters();
    }
  }
}
