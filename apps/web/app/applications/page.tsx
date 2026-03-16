import Link from "next/link";

import { ApplicationsList } from "@/components/applications-list";

const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://api.localhost";

export default function ApplicationsPage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Applications</p>
          <h1>Review every application ticket from one place.</h1>
          <p className="lede">
            This page keeps the frontend wired directly to the API so you can
            verify list loading, navigation, and manual status refreshes.
          </p>
        </div>
        <div className="hero-grid">
          <Link className="pill pill-link" href="/">
            Back to pipeline
          </Link>
          <Link className="pill pill-link" href="/profile">
            Edit profile
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-title">Application index</p>
            <h2>All application tickets</h2>
          </div>
          <code>{`${publicApiUrl}/api/v1/applications`}</code>
        </div>
        <ApplicationsList />
      </section>
    </main>
  );
}
