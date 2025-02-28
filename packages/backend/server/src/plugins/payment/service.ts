import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import type { User, UserStripeCustomer } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { z } from 'zod';

import {
  ActionForbidden,
  CantUpdateOnetimePaymentSubscription,
  Config,
  CustomerPortalCreateFailed,
  InternalServerError,
  InvalidCheckoutParameters,
  InvalidLicenseSessionId,
  InvalidSubscriptionParameters,
  LicenseRevealed,
  Mutex,
  OnEvent,
  SameSubscriptionRecurring,
  SubscriptionExpired,
  SubscriptionHasBeenCanceled,
  SubscriptionHasNotBeenCanceled,
  SubscriptionNotExists,
  SubscriptionPlanNotFound,
  UnsupportedSubscriptionPlan,
  UserNotFound,
} from '../../base';
import { CurrentUser } from '../../core/auth';
import { FeatureService } from '../../core/features';
import { Models } from '../../models';
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
import {
  SelfhostTeamCheckoutArgs,
  SelfhostTeamSubscriptionIdentity,
  SelfhostTeamSubscriptionManager,
} from './manager/selfhost';
import { ScheduleManager } from './schedule';
import {
  decodeLookupKey,
  DEFAULT_PRICES,
  KnownStripeInvoice,
  KnownStripePrice,
  KnownStripeSubscription,
  retriveLookupKeyFromStripePrice,
  retriveLookupKeyFromStripeSubscription,
  SubscriptionPlan,
  SubscriptionRecurring,
  SubscriptionStatus,
  SubscriptionVariant,
} from './types';

export const CheckoutExtraArgs = z.union([
  UserSubscriptionCheckoutArgs,
  WorkspaceSubscriptionCheckoutArgs,
  SelfhostTeamCheckoutArgs,
]);

export const SubscriptionIdentity = z.union([
  UserSubscriptionIdentity,
  WorkspaceSubscriptionIdentity,
  SelfhostTeamSubscriptionIdentity,
]);

export { CheckoutParams };

@Injectable()
export class SubscriptionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly scheduleManager = new ScheduleManager(this.stripe);

  constructor(
    private readonly config: Config,
    private readonly stripe: Stripe,
    private readonly db: PrismaClient,
    private readonly feature: FeatureService,
    private readonly models: Models,
    private readonly userManager: UserSubscriptionManager,
    private readonly workspaceManager: WorkspaceSubscriptionManager,
    private readonly selfhostManager: SelfhostTeamSubscriptionManager,
    private readonly mutex: Mutex
  ) {}

  async onApplicationBootstrap() {
    await this.initStripeProducts();
  }

  private select(plan: SubscriptionPlan): SubscriptionManager {
    switch (plan) {
      case SubscriptionPlan.Team:
        return this.workspaceManager;
      case SubscriptionPlan.Pro:
      case SubscriptionPlan.AI:
        return this.userManager;
      case SubscriptionPlan.SelfHostedTeam:
        return this.selfhostManager;
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
      args.user &&
      !this.feature.isStaff(args.user.email)
    ) {
      throw new ActionForbidden();
    }

    const manager = this.select(plan);
    const result = CheckoutExtraArgs.safeParse(args);

    if (!result.success) {
      throw new InvalidCheckoutParameters();
    }

    return manager.checkout(
      {
        plan,
        recurring,
        variant: variant ?? null,
      },
      params,
      args
    );
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

    const price = await manager.getPrice({
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

  async updateSubscriptionQuantity(
    identity: z.infer<typeof SubscriptionIdentity>,
    count: number
  ) {
    this.assertSubscriptionIdentity(identity);

    const subscription = await this.select(identity.plan).getSubscription(
      identity
    );

    if (!subscription) {
      throw new SubscriptionNotExists({ plan: identity.plan });
    }

    if (!subscription.stripeSubscriptionId) {
      throw new CantUpdateOnetimePaymentSubscription();
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

  async generateLicenseKey(stripeCheckoutSessionId: string) {
    if (!stripeCheckoutSessionId) {
      throw new InvalidLicenseSessionId();
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe.checkout.sessions.retrieve(
        stripeCheckoutSessionId
      );
    } catch {
      throw new InvalidLicenseSessionId();
    }

    // session should be complete and have a subscription
    if (session.status !== 'complete' || !session.subscription) {
      throw new InvalidLicenseSessionId();
    }

    const subscription =
      typeof session.subscription === 'string'
        ? await this.stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;

    const knownSubscription = await this.parseStripeSubscription(subscription);

    // invalid subscription triple
    if (
      !knownSubscription ||
      knownSubscription.lookupKey.plan !== SubscriptionPlan.SelfHostedTeam
    ) {
      throw new InvalidLicenseSessionId();
    }

    let subInDB = await this.db.subscription.findUnique({
      where: {
        stripeSubscriptionId: subscription.id,
      },
    });

    // subscription not found in db
    if (!subInDB) {
      subInDB =
        await this.selfhostManager.saveStripeSubscription(knownSubscription);
    }

    const license = await this.db.license.findUnique({
      where: {
        key: subInDB.targetId,
      },
    });

    // subscription and license are created in a transaction
    // there is no way a sub exist but the license is not created
    if (!license) {
      throw new Error(
        'unaccessible path. if you see this error, there must be a bug in the codebase.'
      );
    }

    if (!license.revealedAt) {
      await this.db.license.update({
        where: {
          key: license.key,
        },
        data: {
          revealedAt: new Date(),
        },
      });

      return license.key;
    }

    throw new LicenseRevealed();
  }

  async createCustomerPortal(userId: string) {
    const user = await this.db.userStripeCustomer.findUnique({
      where: {
        userId: userId,
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
  ): Promise<{ id?: string; email: string } | null> {
    const userStripeCustomer = await this.db.userStripeCustomer.findUnique({
      where: {
        stripeCustomerId: typeof customer === 'string' ? customer : customer.id,
      },
      select: {
        user: true,
      },
    });

    if (userStripeCustomer) {
      return userStripeCustomer.user;
    }

    if (typeof customer === 'string') {
      customer = await this.stripe.customers.retrieve(customer);
    }

    if (customer.deleted || !customer.email || !customer.id) {
      return null;
    }

    const user = await this.models.user.getPublicUserByEmail(customer.email);

    if (!user) {
      return {
        id: undefined,
        email: customer.email,
      };
    }

    return user;
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

    const user = await this.models.user.getPublicUserByEmail(
      invoice.customer_email
    );

    return {
      userId: user?.id,
      userEmail: invoice.customer_email,
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

    const user = await this.retrieveUserFromCustomer(subscription.customer);

    // stripe customer got deleted or customer email is null
    // it's an invalid status
    // maybe we need to check stripe dashboard
    if (!user) {
      return null;
    }

    return {
      userId: user.id,
      userEmail: user.email,
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

  private async initStripeProducts() {
    // only init stripe products in dev mode or canary deployment
    if (
      (this.config.deploy && !this.config.affine.canary) ||
      !this.config.node.dev
    ) {
      return;
    }

    await using lock = await this.mutex.acquire('init stripe prices');

    if (!lock) {
      return;
    }

    const keys = new Set<string>();
    try {
      await this.stripe.prices
        .list({
          active: true,
          limit: 100,
        })
        .autoPagingEach(item => {
          if (item.lookup_key) {
            keys.add(item.lookup_key);
          }
        });
    } catch {
      this.logger.warn('Failed to list stripe prices, skip auto init.');
      return;
    }

    for (const [key, setting] of DEFAULT_PRICES) {
      if (keys.has(key)) {
        continue;
      }

      const lookupKey = decodeLookupKey(key);

      try {
        await this.stripe.prices.create({
          product_data: {
            name: setting.product,
          },
          billing_scheme: 'per_unit',
          unit_amount: setting.price,
          currency: 'usd',
          lookup_key: key,
          tax_behavior: 'inclusive',
          recurring:
            lookupKey.recurring === SubscriptionRecurring.Lifetime ||
            lookupKey.variant === SubscriptionVariant.Onetime
              ? undefined
              : {
                  interval:
                    lookupKey.recurring === SubscriptionRecurring.Monthly
                      ? 'month'
                      : 'year',
                  interval_count: 1,
                  usage_type: 'licensed',
                },
        });
      } catch (e) {
        this.logger.error('Failed to create stripe price.', e);
      }
    }
  }
}
