import type {
  AccountPlan,
  GetAccountResponse,
  QuotaExceededErrorResponse,
  SubscriptionStatus,
  SyncGoogleUserRequest,
  SyncGoogleUserResponse,
} from "@repo/contracts";
import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";

import type { Prisma } from "../generated/prisma";
import {
  getFreePlanMonthlyGenerationLimit,
  getPaidPlanMonthlyGenerationLimit,
  isLocalQuotaBypassedEmail,
} from "../config/quota-config";
import { PrismaService } from "../prisma/prisma.service";
import { QuotaExceededException } from "./quota-exceeded.exception";

type PrismaDbClient = PrismaService | Prisma.TransactionClient;
type ProfileFieldName = "fullName" | "baseCv" | "workTasks";
type SubscriptionRecord = {
  status: string;
  currentPeriodEnd: Date | null;
};
type UserEntitlementRecord = {
  email: string;
  hasExclusivePlan: boolean;
};

function getMonthWindow(referenceDate = new Date()) {
  const start = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1)
  );
  const end = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 1)
  );

  return { start, end };
}

function toContractSubscriptionStatus(
  value: string | null | undefined
): SubscriptionStatus {
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
      return "inactive";
  }
}

function hasPaidEntitlement(
  subscription: SubscriptionRecord | null | undefined,
  referenceDate = new Date()
) {
  if (!subscription) {
    return false;
  }

  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return false;
  }

  if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < referenceDate) {
    return false;
  }

  return true;
}

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async syncGoogleUser(
    input: SyncGoogleUserRequest
  ): Promise<SyncGoogleUserResponse> {
    const googleSub = this.requireTrimmedText(input.googleSub, "googleSub");
    const email = this.requireTrimmedText(input.email, "email").toLowerCase();
    const name = this.normalizeOptionalText(input.name);
    const image = this.normalizeOptionalText(input.image);

    const user = await this.prisma.$transaction(async (tx) => {
      const existingByGoogleSub = await tx.user.findUnique({
        where: { googleSub },
      });
      const existingByEmail =
        existingByGoogleSub ??
        (await tx.user.findUnique({
          where: { email },
        }));

      const nextUser = existingByEmail
        ? await tx.user.update({
            where: { id: existingByEmail.id },
            data: {
              googleSub,
              email,
              name,
              image,
            },
          })
        : await tx.user.create({
            data: {
              googleSub,
              email,
              name,
              image,
            },
          });

      await this.ensureUserProfile(nextUser.id, tx, name);

      return nextUser;
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    };
  }

  async getAccount(userId: string): Promise<GetAccountResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          select: {
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User account was not found.");
    }

    const snapshot = await this.getQuotaSnapshot(
      this.prisma,
      userId,
      user.subscription,
      {
        email: user.email,
        hasExclusivePlan: user.hasExclusivePlan,
      }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
      plan: snapshot.plan,
      subscriptionStatus: snapshot.subscriptionStatus,
      usedThisMonth: snapshot.usedThisMonth,
      monthlyLimit: snapshot.monthlyLimit,
      remainingThisMonth: snapshot.remainingThisMonth,
      currentPeriodStart: snapshot.currentPeriodStart,
      currentPeriodEnd: snapshot.currentPeriodEnd,
      canCreateApplications:
        snapshot.hasExclusivePlan ||
        snapshot.quotaBypassed ||
        snapshot.remainingThisMonth > 0,
      quotaBypassed: snapshot.quotaBypassed,
      hasCustomerPortal: Boolean(user.stripeCustomerId),
    };
  }

  async getProfileField(
    userId: string,
    fieldName: ProfileFieldName
  ): Promise<string> {
    const profile = await this.ensureUserProfile(userId);
    return profile[fieldName];
  }

  async getRequiredProfileField(
    userId: string,
    fieldName: ProfileFieldName
  ): Promise<string> {
    const value = await this.getProfileField(userId, fieldName);
    const normalized = value.trim();

    if (!normalized) {
      throw new ServiceUnavailableException(
        `Application profile field "${fieldName}" is not configured.`
      );
    }

    return normalized;
  }

  async updateProfileField(
    userId: string,
    fieldName: ProfileFieldName,
    value: unknown
  ): Promise<string> {
    const normalized = this.requireTrimmedText(value, fieldName);
    const profile = await this.prisma.userProfile.upsert({
      where: {
        userId,
      },
      create: {
        userId,
        [fieldName]: normalized,
      },
      update: {
        [fieldName]: normalized,
      },
    });

    return profile[fieldName];
  }

  async consumeGenerationQuota(userId: string, db?: PrismaDbClient) {
    const client = db ?? this.prisma;
    const subscription = await client.subscription.findUnique({
      where: { userId },
      select: {
        status: true,
        currentPeriodEnd: true,
      },
    });
    const snapshot = await this.getQuotaSnapshot(client, userId, subscription);

    if (snapshot.hasExclusivePlan || snapshot.quotaBypassed) {
      return;
    }

    const bucket = await client.usageBucket.upsert({
      where: {
        userId_monthStart: {
          userId,
          monthStart: new Date(snapshot.currentPeriodStart),
        },
      },
      create: {
        userId,
        monthStart: new Date(snapshot.currentPeriodStart),
        generatedCount: 0,
      },
      update: {},
    });
    const updated = await client.usageBucket.updateMany({
      where: {
        id: bucket.id,
        generatedCount: {
          lt: snapshot.monthlyLimit,
        },
      },
      data: {
        generatedCount: {
          increment: 1,
        },
      },
    });

    if (updated.count === 0) {
      const freshSnapshot = await this.getQuotaSnapshot(client, userId, subscription);
      throw new QuotaExceededException(
        this.toQuotaExceededErrorResponse(freshSnapshot)
      );
    }
  }

  async getUserStripeCustomerId(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeCustomerId: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User account was not found.");
    }

    return user.stripeCustomerId;
  }

  async setUserStripeCustomerId(userId: string, stripeCustomerId: string) {
    const normalizedCustomerId = this.requireTrimmedText(
      stripeCustomerId,
      "stripeCustomerId"
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: normalizedCustomerId,
      },
    });
  }

  async findUserByStripeCustomerId(stripeCustomerId: string) {
    return this.prisma.user.findUnique({
      where: {
        stripeCustomerId,
      },
      select: {
        id: true,
      },
    });
  }

  private async getQuotaSnapshot(
    db: PrismaDbClient,
    userId: string,
    existingSubscription?: SubscriptionRecord | null,
    existingUser?: UserEntitlementRecord | null
  ) {
    const user =
      existingUser ??
      (await db.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          hasExclusivePlan: true,
        },
      }));

    if (!user) {
      throw new NotFoundException("User account was not found.");
    }

    const subscription =
      existingSubscription ??
      (await db.subscription.findUnique({
        where: { userId },
        select: {
          status: true,
          currentPeriodEnd: true,
        },
      }));
    const quotaBypassed = isLocalQuotaBypassedEmail(user.email);
    const { start, end } = getMonthWindow();
    const bucket = await db.usageBucket.findUnique({
      where: {
        userId_monthStart: {
          userId,
          monthStart: start,
        },
      },
      select: {
        generatedCount: true,
      },
    });
    const hasPaidPlan = hasPaidEntitlement(subscription);
    const plan: AccountPlan = user.hasExclusivePlan
      ? "exclusive"
      : hasPaidPlan
        ? "paid"
        : "free";
    const subscriptionStatus = toContractSubscriptionStatus(subscription?.status);
    const monthlyLimit =
      hasPaidPlan
        ? getPaidPlanMonthlyGenerationLimit()
        : getFreePlanMonthlyGenerationLimit();
    const usedThisMonth = bucket?.generatedCount ?? 0;

    return {
      plan,
      hasExclusivePlan: user.hasExclusivePlan,
      subscriptionStatus,
      usedThisMonth,
      monthlyLimit,
      remainingThisMonth: Math.max(0, monthlyLimit - usedThisMonth),
      currentPeriodStart: start.toISOString(),
      currentPeriodEnd: end.toISOString(),
      quotaBypassed,
    };
  }

  private toQuotaExceededErrorResponse(
    snapshot: Awaited<ReturnType<AccountService["getQuotaSnapshot"]>>
  ): QuotaExceededErrorResponse {
    return {
      code: "quota_exceeded",
      message:
        snapshot.plan === "free"
          ? "Your free monthly generation limit has been reached."
          : "Your monthly generation limit has been reached.",
      plan: snapshot.plan,
      subscriptionStatus: snapshot.subscriptionStatus,
      usedThisMonth: snapshot.usedThisMonth,
      monthlyLimit: snapshot.monthlyLimit,
      remainingThisMonth: snapshot.remainingThisMonth,
      currentPeriodStart: snapshot.currentPeriodStart,
      currentPeriodEnd: snapshot.currentPeriodEnd,
    };
  }

  private async ensureUserProfile(
    userId: string,
    db: PrismaDbClient = this.prisma,
    fallbackFullName?: string | null
  ) {
    await db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true },
    });

    const profile = await db.userProfile.upsert({
      where: {
        userId,
      },
      create: {
        userId,
        fullName: fallbackFullName?.trim() || "",
      },
      update: {},
    });

    if (fallbackFullName?.trim() && !profile.fullName.trim()) {
      return db.userProfile.update({
        where: { userId },
        data: {
          fullName: fallbackFullName.trim(),
        },
      });
    }

    return profile;
  }

  private requireTrimmedText(value: unknown, fieldName: string): string {
    if (typeof value !== "string") {
      throw new ServiceUnavailableException(`${fieldName} must be a string.`);
    }

    const normalized = value.trim();

    if (!normalized) {
      throw new ServiceUnavailableException(`${fieldName} is required.`);
    }

    return normalized;
  }

  private normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== "string") {
      return null;
    }

    const normalized = value.trim();
    return normalized ? normalized : null;
  }
}
