import type { GetApplicationsResponse } from "@repo/contracts";
import { connection } from "next/server";

import { ApplicationsList } from "@/components/applications-list";
import { SiteHeader } from "@/components/site-header";
import { getErrorMessage } from "@/lib/api-response";
import { getAuthenticatedServerApi } from "@/lib/server-api";
import styles from "./page.module.css";

export default async function ApplicationsPage() {
  await connection();

  let payload: GetApplicationsResponse | null = null;
  let errorMessage: string | null = null;

  try {
    const api = await getAuthenticatedServerApi();
    const response = await api.get<GetApplicationsResponse>(
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
            Review every workspace from one place.
          </h1>
        </div>
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
