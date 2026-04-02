import { ServiceUnavailableException } from "@nestjs/common";

const FREE_LIMIT_ENV = "FREE_PLAN_MONTHLY_GENERATION_LIMIT";
const PAID_LIMIT_ENV = "PAID_PLAN_MONTHLY_GENERATION_LIMIT";
const LOCAL_QUOTA_BYPASS_EMAILS_ENV = "LOCAL_QUOTA_BYPASS_EMAILS";

function parsePositiveIntegerEnv(name: string): number {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new ServiceUnavailableException(
      `Environment variable "${name}" is required.`
    );
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ServiceUnavailableException(
      `Environment variable "${name}" must be a positive integer.`
    );
  }

  return parsed;
}

export function getFreePlanMonthlyGenerationLimit(): number {
  return parsePositiveIntegerEnv(FREE_LIMIT_ENV);
}

export function getPaidPlanMonthlyGenerationLimit(): number {
  return parsePositiveIntegerEnv(PAID_LIMIT_ENV);
}

function getAppMode() {
  return (
    process.env.APP_MODE ??
    process.env.NODE_ENV ??
    "development"
  ).trim().toLowerCase();
}

export function isLocalQuotaBypassedEmail(
  email: string | null | undefined
): boolean {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || getAppMode() === "production") {
    return false;
  }

  return (process.env[LOCAL_QUOTA_BYPASS_EMAILS_ENV] ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalizedEmail);
}

export function validateQuotaConfiguration() {
  getFreePlanMonthlyGenerationLimit();
  getPaidPlanMonthlyGenerationLimit();
}
