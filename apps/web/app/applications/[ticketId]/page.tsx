import type {
  GetApplicationTicketResponse,
  GetBaseCvResponse,
  GetFullNameResponse,
} from "@repo/contracts";
import { connection } from "next/server";

import { TicketResultCard } from "@/components/ticket-result-card";
import { SiteHeader } from "@/components/site-header";
import { buildApiUrl } from "@/lib/api-config";
import { getErrorMessage } from "@/lib/api-response";
import { serverApi } from "@/lib/server-api";
import styles from "./page.module.css";

type ApplicationTicketPageProps = {
  params: Promise<{
    ticketId: string;
  }>;
};

export default async function ApplicationTicketPage({
  params,
}: ApplicationTicketPageProps) {
  const { ticketId } = await params;
  await connection();

  const [ticketResult, baseCvResult, fullNameResult] = await Promise.allSettled([
    serverApi.get<GetApplicationTicketResponse>(`/api/v1/applications/${ticketId}`),
    serverApi.get<GetBaseCvResponse>("/api/v1/applications/baseCv"),
    serverApi.get<GetFullNameResponse>("/api/v1/applications/fullName"),
  ]);
  const payload =
    ticketResult.status === "fulfilled" ? ticketResult.value.data : null;
  const errorMessage =
    ticketResult.status === "rejected"
      ? getErrorMessage(ticketResult.reason)
      : null;
  const baseCvPayload =
    baseCvResult.status === "fulfilled" ? baseCvResult.value.data : null;
  const baseCvErrorMessage =
    baseCvResult.status === "rejected"
      ? getErrorMessage(baseCvResult.reason)
      : null;
  const fullNamePayload =
    fullNameResult.status === "fulfilled" ? fullNameResult.value.data : null;
  const fullNameErrorMessage =
    fullNameResult.status === "rejected"
      ? getErrorMessage(fullNameResult.reason)
      : null;

  return (
    <main className={styles.pageShell}>
      <SiteHeader />

      <section className={styles.introPanel}>
        <div className={styles.introCopy}>
          <p className={styles.eyebrow}>Ticket Workspace</p>
          <h1 className={styles.title}>
            Edit markdown, review the preview, and export PDF.
          </h1>
          <p className={styles.lede}>
            This workspace is driven by the backend ticket result for{" "}
            <code>{ticketId}</code>.
          </p>
        </div>
        <code className={styles.endpoint}>
          {buildApiUrl(`/api/v1/applications/${ticketId}`)}
        </code>
      </section>

      <TicketResultCard
        ticketId={ticketId}
        initialPayload={payload ?? undefined}
        initialErrorMessage={errorMessage}
        initialBaseCv={baseCvPayload?.baseCv}
        initialBaseCvErrorMessage={baseCvErrorMessage}
        initialFullName={fullNamePayload?.fullName}
        initialFullNameErrorMessage={fullNameErrorMessage}
      />
    </main>
  );
}
