import type { CreateBillingSessionResponse } from "@repo/contracts";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import Stripe from "stripe";

import { AccountService } from "../account/account.service";
import { PrismaService } from "../prisma/prisma.service";

type StripeSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

type BillingMode = "live" | "mock";

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountService: AccountService
  ) {}

  async createCheckoutSession(
    userId: string
  ): Promise<CreateBillingSessionResponse> {
    if (this.isMockBillingEnabled()) {
      return this.createMockCheckoutSession(userId);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User account was not found.");
    }

    const stripe = this.getStripeClient();
    const customerId =
      user.stripeCustomerId ?? (await this.createStripeCustomer(userId, user.email, user.name));
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      line_items: [
        {
          price: this.getStripePriceId(),
          quantity: 1,
        },
      ],
      success_url: `${this.getAppPublicUrl()}/?billing=success`,
      cancel_url: `${this.getAppPublicUrl()}/?billing=cancelled`,
      metadata: {
        userId,
      },
      subscription_data: {
        metadata: {
          userId,
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new ServiceUnavailableException(
        "Stripe checkout session URL was not returned."
      );
    }

    return { url: session.url };
  }

  async createPortalSession(
    userId: string
  ): Promise<CreateBillingSessionResponse> {
    if (this.isMockBillingEnabled()) {
      return this.createMockPortalSession(userId);
    }

    const customerId = await this.accountService.getUserStripeCustomerId(userId);

    if (!customerId) {
      throw new BadRequestException(
        "Stripe customer portal is not available for this account yet."
      );
    }

    const stripe = this.getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${this.getAppPublicUrl()}/?billing=portal`,
    });

    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    if (this.isMockBillingEnabled()) {
      this.logger.log("Ignoring Stripe webhook because billing mock mode is enabled.");
      return;
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        "Stripe webhook secret is not configured."
      );
    }

    if (!signature?.trim()) {
      throw new BadRequestException("Missing Stripe signature header.");
    }

    const stripe = this.getStripeClient();
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );

    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await this.syncSubscriptionFromStripe(
          event.data.object as Stripe.Subscription
        );
        break;
      default:
        this.logger.log(`Ignoring Stripe event ${event.type}`);
        break;
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    if (typeof session.customer !== "string") {
      return;
    }

    const userId =
      typeof session.client_reference_id === "string"
        ? session.client_reference_id
        : session.metadata?.userId;

    if (!userId) {
      return;
    }

    await this.accountService.setUserStripeCustomerId(userId, session.customer);
  }

  private async syncSubscriptionFromStripe(subscription: Stripe.Subscription) {
    const customerId =
      typeof subscription.customer === "string" ? subscription.customer : null;
    const metadataUserId = subscription.metadata?.userId?.trim() || null;
    const linkedUser =
      (customerId
        ? await this.accountService.findUserByStripeCustomerId(customerId)
        : null) ??
      (metadataUserId ? { id: metadataUserId } : null);

    if (!linkedUser) {
      this.logger.warn(
        `Stripe subscription ${subscription.id} could not be matched to a user.`
      );
      return;
    }

    if (customerId) {
      await this.accountService.setUserStripeCustomerId(linkedUser.id, customerId);
    }

    const priceId = subscription.items.data[0]?.price.id ?? null;
    const currentPeriodStart =
      subscription.items.data[0]?.current_period_start ?? null;
    const currentPeriodEnd = subscription.items.data[0]?.current_period_end ?? null;

    await this.prisma.subscription.upsert({
      where: {
        userId: linkedUser.id,
      },
      create: {
        userId: linkedUser.id,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status: this.toSubscriptionStatus(subscription.status),
        currentPeriodStart: this.toDate(currentPeriodStart),
        currentPeriodEnd: this.toDate(currentPeriodEnd),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      update: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status: this.toSubscriptionStatus(subscription.status),
        currentPeriodStart: this.toDate(currentPeriodStart),
        currentPeriodEnd: this.toDate(currentPeriodEnd),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  private async createStripeCustomer(
    userId: string,
    email: string,
    name: string | null
  ) {
    const stripe = this.getStripeClient();
    const customer = await stripe.customers.create({
      email,
      name: name ?? undefined,
      metadata: {
        userId,
      },
    });

    await this.accountService.setUserStripeCustomerId(userId, customer.id);

    return customer.id;
  }

  private async createMockCheckoutSession(
    userId: string
  ): Promise<CreateBillingSessionResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User account was not found.");
    }

    const now = new Date();
    const nextPeriodEnd = new Date(now);
    nextPeriodEnd.setUTCMonth(nextPeriodEnd.getUTCMonth() + 1);

    await this.accountService.setUserStripeCustomerId(
      userId,
      this.getMockStripeCustomerId(userId)
    );
    await this.prisma.subscription.upsert({
      where: {
        userId,
      },
      create: {
        userId,
        stripeSubscriptionId: this.getMockStripeSubscriptionId(userId),
        stripePriceId: "mock_price_monthly",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: nextPeriodEnd,
        cancelAtPeriodEnd: false,
      },
      update: {
        stripeSubscriptionId: this.getMockStripeSubscriptionId(userId),
        stripePriceId: "mock_price_monthly",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: nextPeriodEnd,
        cancelAtPeriodEnd: false,
      },
    });

    return {
      url: `${this.getAppPublicUrl()}/?billing=mock-checkout`,
    };
  }

  private async createMockPortalSession(
    userId: string
  ): Promise<CreateBillingSessionResponse> {
    const customerId = await this.accountService.getUserStripeCustomerId(userId);

    if (!customerId) {
      throw new BadRequestException(
        "Mock billing portal is not available until mock checkout has been created."
      );
    }

    return {
      url: `${this.getAppPublicUrl()}/?billing=mock-portal`,
    };
  }

  private getMockStripeCustomerId(userId: string) {
    return `mock_cus_${userId}`;
  }

  private getMockStripeSubscriptionId(userId: string) {
    return `mock_sub_${userId}`;
  }

  private isMockBillingEnabled() {
    return this.getBillingMode() === "mock";
  }

  private getBillingMode(): BillingMode {
    const explicitMode = process.env.BILLING_MODE?.trim().toLowerCase();

    if (explicitMode === "mock" || explicitMode === "live") {
      return explicitMode;
    }

    const hasLiveStripeConfig = Boolean(
      process.env.STRIPE_SECRET_KEY?.trim() &&
        process.env.STRIPE_PRICE_ID_MONTHLY?.trim()
    );

    return hasLiveStripeConfig ? "live" : "mock";
  }

  private getStripeClient() {
    const apiKey = process.env.STRIPE_SECRET_KEY?.trim();

    if (!apiKey) {
      throw new ServiceUnavailableException(
        "Stripe secret key is not configured."
      );
    }

    return new Stripe(apiKey);
  }

  private getStripePriceId() {
    const priceId = process.env.STRIPE_PRICE_ID_MONTHLY?.trim();

    if (!priceId) {
      throw new ServiceUnavailableException(
        "Stripe monthly price ID is not configured."
      );
    }

    return priceId;
  }

  private getAppPublicUrl() {
    const value = process.env.APP_PUBLIC_URL?.trim();

    if (!value) {
      throw new ServiceUnavailableException(
        "APP_PUBLIC_URL is not configured."
      );
    }

    return value.replace(/\/+$/, "");
  }

  private toSubscriptionStatus(value: string): StripeSubscriptionStatus {
    switch (value) {
      case "active":
      case "trialing":
      case "past_due":
      case "canceled":
      case "unpaid":
      case "incomplete":
      case "incomplete_expired":
      case "paused":
        return value;
      default:
        throw new BadRequestException(
          `Unsupported Stripe subscription status "${value}".`
        );
    }
  }

  private toDate(unixSeconds: number | null | undefined) {
    if (!unixSeconds) {
      return null;
    }

    return new Date(unixSeconds * 1000);
  }
}
