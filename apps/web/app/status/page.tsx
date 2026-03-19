import type { ApiStatusResponse } from "@repo/contracts";
import { connection } from "next/server";

import { SiteHeader } from "@/components/site-header";
import { StatusCard } from "@/components/status-card";
import { buildApiUrl } from "@/lib/api-config";
import { getErrorMessage } from "@/lib/api-response";
import { serverApi } from "@/lib/server-api";
import styles from "./page.module.css";

export default async function StatusPage() {
  await connection();

  let payload: ApiStatusResponse | null = null;
  let errorMessage: string | null = null;

  try {
    const response = await serverApi.get<ApiStatusResponse>("/api/v1/status");
    payload = response.data;
  } catch (error) {
    errorMessage = getErrorMessage(error);
  }

  return (
    <main className={styles.pageShell}>
      <SiteHeader />

      <section className={styles.introPanel}>
        <div className={styles.introCopy}>
          <p className={styles.eyebrow}>System Status</p>
          <h1 className={styles.title}>
            Check backend health and database connectivity in one place.
          </h1>
          <p className={styles.lede}>
            This page mirrors the live status endpoint used by the app.
          </p>
        </div>
        <code className={styles.endpoint}>{buildApiUrl("/api/v1/status")}</code>
      </section>

      <section className={styles.statusPanel}>
        <StatusCard payload={payload} errorMessage={errorMessage} />
      </section>
    </main>
  );
}
