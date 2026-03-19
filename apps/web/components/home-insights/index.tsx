import type { GetApplicationsResponse } from "@repo/contracts";
import { Clock3, FilePenLine, FolderOpenDot } from "lucide-react";
import Link from "next/link";

import { ApplicationStatusBadge } from "@/components/application-status-badge";
import { formatTicketTitle } from "@/lib/application-ticket";
import styles from "./home-insights.module.css";

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

export function HomeInsights({
  payload,
  errorMessage,
}: {
  payload: GetApplicationsResponse | null;
  errorMessage: string | null;
}) {
  const tickets = payload?.applications ?? [];
  const recentTickets = tickets.slice(0, 4);
  const stats = {
    total: tickets.length,
    completed: tickets.filter((ticket) => ticket.status === "completed").length,
    processing: tickets.filter((ticket) => ticket.status === "processing")
      .length,
  };

  return (
    <div className={styles.insightsColumn}>
      <section className={styles.sidebarPanel}>
        <div className={styles.panelContent}>
          <div className={styles.headingRow}>
            <div>
              <p className={styles.eyebrow}>Recent Tickets</p>
              <h2 className={styles.title}>Latest workspace activity</h2>
            </div>
            <Link className={styles.sectionLink} href="/applications">
              See all
            </Link>
          </div>

          {errorMessage ? (
            <p className={`${styles.note} ${styles.noteError}`}>
              {errorMessage}
            </p>
          ) : null}

          {recentTickets.length === 0 ? (
            <div className={styles.emptyState}>
              <FolderOpenDot size={18} />
              <p>No tickets yet. Create one to populate this sidebar.</p>
            </div>
          ) : (
            <div className={styles.recentTicketList}>
              {recentTickets.map((ticket) => (
                <Link
                  key={ticket.ticketId}
                  className={styles.recentTicket}
                  href={`/applications/${ticket.ticketId}`}
                >
                  <div className={styles.recentTicketHead}>
                    <span className={styles.miniIcon}>
                      <FilePenLine size={14} />
                    </span>
                    <div>
                      <h3 className={styles.recentTicketTitle}>
                        {ticket.companyName}
                      </h3>
                    </div>
                  </div>
                  <ApplicationStatusBadge status={ticket.status} />
                  <p className={styles.recentTicketCopy}>
                    {truncateText(ticket.vacancyDescription, 110)}
                  </p>
                  <div className={styles.recentTicketMeta}>
                    <Clock3 size={14} />
                    <span>{new Date(ticket.updatedAt).toLocaleString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={styles.metricsPanel}>
        <div className={styles.panelContent}>
          <div className={styles.headingRow}>
            <div>
              <p className={styles.eyebrow}>Pipeline Metrics</p>
              <h2 className={styles.title}>Ticket health snapshot</h2>
            </div>
          </div>

          <div className={styles.metricGrid}>
            <div className={styles.metricCell}>
              <span className={styles.metricLabel}>Total</span>
              <strong className={styles.metricValue}>{stats.total}</strong>
            </div>
            <div className={styles.metricCell}>
              <span className={styles.metricLabel}>Completed</span>
              <strong className={styles.metricValue}>{stats.completed}</strong>
            </div>
            <div className={styles.metricCell}>
              <span className={styles.metricLabel}>Processing</span>
              <strong className={styles.metricValue}>{stats.processing}</strong>
            </div>
          </div>

          <p className={styles.note}>
            Generated markdown stays editable in the ticket workspace, and the
            PDF export is built directly from the current preview.
          </p>
        </div>
      </section>
    </div>
  );
}
