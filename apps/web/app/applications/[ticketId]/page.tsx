import Link from "next/link";

import { TicketResultCard } from "@/components/ticket-result-card";

const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://api.localhost";

type ApplicationTicketPageProps = {
  params: Promise<{
    ticketId: string;
  }>;
};

export default async function ApplicationTicketPage({
  params,
}: ApplicationTicketPageProps) {
  const { ticketId } = await params;

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Application ticket</p>
          <h1>Inspect one application and its generated result.</h1>
          <p className="lede">
            Use this page to check the latest backend status, manual refreshes,
            and uploaded result files for ticket <code>{ticketId}</code>.
          </p>
        </div>
        <div className="hero-grid">
          <Link className="pill pill-link" href="/applications">
            All applications
          </Link>
          <Link className="pill pill-link" href="/">
            Back to pipeline
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-title">Application detail</p>
            <h2>Ticket {ticketId}</h2>
          </div>
          <code>{`${publicApiUrl}/api/v1/applications/${ticketId}`}</code>
        </div>
        <TicketResultCard ticketId={ticketId} />
      </section>
    </main>
  );
}
