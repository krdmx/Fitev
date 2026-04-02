import type { GetApplicationBoardResponse } from "@repo/contracts";
import { connection } from "next/server";

import { ApplicationsBoard } from "@/components/applications-board";
import { SiteHeader } from "@/components/site-header";
import { getErrorMessage } from "@/lib/api-response";
import { getAuthenticatedServerApi } from "@/lib/server-api";
import styles from "./page.module.css";

type ApplicationsBoardPageProps = {
  searchParams: Promise<{
    ticketId?: string | string[];
  }>;
};

export default async function ApplicationsBoardPage({
  searchParams,
}: ApplicationsBoardPageProps) {
  await connection();
  const { ticketId } = await searchParams;
  const initialSelectedTicketId = Array.isArray(ticketId)
    ? ticketId[0]?.trim() || null
    : ticketId?.trim() || null;

  let payload: GetApplicationBoardResponse | null = null;
  let errorMessage: string | null = null;

  try {
    const api = await getAuthenticatedServerApi();
    const response = await api.get<GetApplicationBoardResponse>(
      "/api/v1/applications/board"
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
          <p className={styles.eyebrow}>Application Board</p>
          <h1 className={styles.title}>
            Track every hiring stage on one drag-and-drop board.
          </h1>
        </div>
      </section>

      <section className={styles.boardPanel}>
        <ApplicationsBoard
          initialPayload={payload ?? undefined}
          initialErrorMessage={errorMessage}
          initialSelectedTicketId={initialSelectedTicketId ?? undefined}
        />
      </section>
    </main>
  );
}
