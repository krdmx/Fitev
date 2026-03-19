"use client";

import { Activity, FolderKanban, House, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./site-header.module.css";

const navigationItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: House,
    matches: (pathname: string) => pathname === "/",
  },
  {
    href: "/applications",
    label: "Tickets",
    icon: FolderKanban,
    matches: (pathname: string) => pathname.startsWith("/applications"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: UserRound,
    matches: (pathname: string) => pathname.startsWith("/profile"),
  },
  {
    href: "/status",
    label: "Status",
    icon: Activity,
    matches: (pathname: string) => pathname.startsWith("/status"),
  },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className={styles.headerShell}>
      <Link className={styles.brandMark} href="/">
        <span className={styles.brandIcon}>P</span>
        <span className={styles.brandCopy}>
          <strong className={styles.brandTitle}>PEP</strong>
          <small className={styles.brandSubtitle}>Markdown Ticket Workspace</small>
        </span>
      </Link>

      <nav className={styles.siteNav} aria-label="Primary navigation">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.matches(pathname);

          return (
            <Link
              key={item.href}
              className={`${styles.navLink} ${
                isActive ? styles.navLinkActive : ""
              }`}
              href={item.href}
            >
              <Icon size={16} strokeWidth={2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.headerMeta}>
        <span className={styles.metaChip}>Next.js + NestJS</span>
        <span className={styles.metaChip}>Markdown -&gt; PDF</span>
      </div>
    </header>
  );
}
