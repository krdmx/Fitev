import type { GetAccountResponse } from "@repo/contracts";
import Link from "next/link";

import { AppLogo } from "@/assets";
import { getAuthenticatedServerApi } from "@/lib/server-api";
import { SiteHeaderActions } from "./site-header-actions";
import { SiteHeaderNav, type SiteNavigationItem } from "./site-header-nav";
import styles from "./site-header.module.css";

const navigationItems: SiteNavigationItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: "dashboard",
  },
  {
    href: "/applications",
    label: "Tickets",
    icon: "tickets",
  },
  {
    href: "/applications/board",
    label: "Board",
    icon: "board",
  },
  {
    href: "/profile",
    label: "Profile",
    icon: "profile",
  },
  {
    href: "/status",
    label: "Status",
    icon: "status",
  },
];

function formatUsageSummary(account: GetAccountResponse) {
  if (account.plan === "exclusive") {
    return "Unlimited access";
  }

  if (account.quotaBypassed) {
    return "Unlimited locally";
  }

  return `${account.usedThisMonth}/${account.monthlyLimit} this month`;
}

function formatPlanLabel(account: GetAccountResponse) {
  if (account.plan === "exclusive") {
    return "Exclusive plan";
  }

  return account.plan === "paid" ? "Paid monthly" : "Free plan";
}

export async function SiteHeader() {
  const api = await getAuthenticatedServerApi();
  const response = await api.get<GetAccountResponse>("/api/v1/account");
  const account = response.data;

  return (
    <header className={styles.headerShell}>
      <Link className={styles.brandMark} href="/">
        <span className={styles.brandIcon}>
          <AppLogo className={styles.brandIconGraphic} height={30} width={30} />
        </span>
        <span className={styles.brandCopy}>
          <strong className={styles.brandTitle}>Fitev</strong>
        </span>
      </Link>

      <SiteHeaderNav navigationItems={navigationItems} />

      <div className={styles.headerMeta}>
        <span
          className={`${styles.metaChip} ${formatPlanLabel(account).includes("Exclusive") && styles.exclusive}`}
        >
          {formatPlanLabel(account)}
        </span>
        <span className={styles.metaChip}>{formatUsageSummary(account)}</span>
        <SiteHeaderActions
          plan={account.plan}
          hasCustomerPortal={account.hasCustomerPortal}
        />
      </div>
    </header>
  );
}
