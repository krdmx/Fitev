import type { GetApplicationsResponse } from "@repo/contracts";
import { connection } from "next/server";

import { ApplicationForm } from "@/components/application-form";
import { HomeInsights } from "@/components/home-insights";
import { SiteHeader } from "@/components/site-header";
import { getErrorMessage } from "@/lib/api-response";
import { serverApi } from "@/lib/server-api";
import styles from "./page.module.css";

export default async function HomePage() {
  await connection();

  let applicationsPayload: GetApplicationsResponse | null = null;
  let applicationsErrorMessage: string | null = null;

  try {
    const response = await serverApi.get<GetApplicationsResponse>(
      "/api/v1/applications"
    );
    applicationsPayload = response.data;
  } catch (error) {
    applicationsErrorMessage = getErrorMessage(error);
  }

  return (
    <main className={styles.pageShell}>
      <SiteHeader />

      <section className={styles.dashboardGrid}>
        <section className={styles.heroPanel}>
          <ApplicationForm />
        </section>

        <HomeInsights
          payload={applicationsPayload}
          errorMessage={applicationsErrorMessage}
        />
      </section>
    </main>
  );
}
