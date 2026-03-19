import type { ApiStatusResponse } from "@repo/contracts";
import { DatabaseZap, ServerCog } from "lucide-react";

import styles from "./status-card.module.css";

export function StatusCard({
  payload,
  errorMessage,
}: {
  payload: ApiStatusResponse | null;
  errorMessage: string | null;
}) {
  if (errorMessage || !payload) {
    return (
      <div className={`${styles.statusPanel} ${styles.errorState}`}>
        <div className={styles.panelContent}>
          <p className={styles.eyebrow}>Service Status</p>
          <h2 className={styles.title}>Backend is not reachable.</h2>
          <p className={styles.message}>
            {errorMessage ?? "No status payload was returned."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.statusPanel}>
      <div className={styles.panelContent}>
        <div className={styles.headingRow}>
          <div>
            <p className={styles.eyebrow}>Service Status</p>
            <h2 className={styles.title}>{payload.service}</h2>
          </div>
          <span
            className={`${styles.serviceBadge} ${
              payload.status === "ok" ? styles.serviceHealthy : styles.serviceDegraded
            }`}
          >
            {payload.status}
          </span>
        </div>

        <div className={styles.miniGrid}>
          <div className={styles.miniCard}>
            <ServerCog size={18} />
            <span>Environment</span>
            <strong>{payload.environment}</strong>
          </div>
          <div className={styles.miniCard}>
            <DatabaseZap size={18} />
            <span>Database</span>
            <strong>{payload.database}</strong>
          </div>
        </div>

        <dl className={styles.factsGrid}>
          <div>
            <dt>Version</dt>
            <dd>{payload.version}</dd>
          </div>
          <div>
            <dt>Timestamp</dt>
            <dd>{new Date(payload.timestamp).toLocaleString()}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
