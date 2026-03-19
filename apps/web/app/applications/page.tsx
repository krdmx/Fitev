import type { GetApplicationsResponse } from "@repo/contracts";
import { connection } from "next/server";

import { ApplicationsList } from "@/components/applications-list";
import { SiteHeader } from "@/components/site-header";
import { buildApiUrl } from "@/lib/api-config";
import { getErrorMessage } from "@/lib/api-response";
import { serverApi } from "@/lib/server-api";
import styles from "./page.module.css";

export default async function ApplicationsPage() {
  await connection();

  let payload: GetApplicationsResponse | null = null;
  let errorMessage: string | null = null;

  try {
    const response = await serverApi.get<GetApplicationsResponse>(
      "/api/v1/applications"
    );
    payload = response.data;
  } catch (error) {
    errorMessage = getErrorMessage(error);
  }

  return (
    <main className={styles.pageShell}>
      <SiteHeader />

      <section className={styles.introPanel}>
        <div className={styles.introCopy}>
          <p className={styles.eyebrow}>Ticket Index</p>
          <h1 className={styles.title}>
            Review every application workspace from one place.
          </h1>
          <p className={styles.lede}>
            Open any ticket to edit markdown, inspect the preview, export PDF,
            or remove the ticket entirely.
          </p>
        </div>
        <code className={styles.endpoint}>
          {buildApiUrl("/api/v1/applications")}
        </code>
      </section>

      <section className={styles.listPanel}>
        <ApplicationsList
          initialPayload={payload ?? undefined}
          initialErrorMessage={errorMessage}
        />
      </section>
    </main>
  );
}
