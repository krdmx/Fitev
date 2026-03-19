import type { ApplicationTicketStatus } from "@repo/contracts";
import styles from "./application-status-badge.module.css";

function getStatusClassName(status: ApplicationTicketStatus) {
  if (status === "completed") {
    return styles.statusOk;
  }

  if (status === "failed") {
    return styles.statusDegraded;
  }

  return styles.statusPending;
}

export function ApplicationStatusBadge({
  status,
}: {
  readonly status: ApplicationTicketStatus;
}) {
  return (
    <span className={`${styles.statusBadge} ${getStatusClassName(status)}`}>
      {status}
    </span>
  );
}
