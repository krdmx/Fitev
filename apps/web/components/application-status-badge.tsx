import type { ApplicationTicketStatus } from "@repo/contracts";

function getStatusClassName(status: ApplicationTicketStatus) {
  if (status === "completed") {
    return "badge-ok";
  }

  if (status === "failed") {
    return "badge-degraded";
  }

  return "badge-pending";
}

export function ApplicationStatusBadge({
  status,
}: {
  status: ApplicationTicketStatus;
}) {
  return <span className={`badge ${getStatusClassName(status)}`}>{status}</span>;
}
