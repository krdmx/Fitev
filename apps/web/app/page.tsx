import Link from "next/link";

import { ApplicationForm } from "@/components/application-form";
import { StatusCard } from "@/components/status-card";

const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://api.localhost";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Self-hosted stack</p>
          <h1>Frontend, backend and automation in one monorepo.</h1>
          <p className="lede">
            This workspace bundles Next.js, Nest.js, PostgreSQL, n8n and Caddy
            into one reproducible Docker-driven setup.
          </p>
        </div>
        <div className="hero-grid">
          <div className="pill">app.localhost</div>
          <div className="pill">api.localhost</div>
          <div className="pill">n8n.localhost</div>
          <Link className="pill pill-link" href="/applications">
            View applications
          </Link>
          <Link className="pill pill-link" href="/profile">
            Edit profile
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-title">Pipeline trigger</p>
            <h2>Generate a new application ticket</h2>
          </div>
          <code>{`${publicApiUrl}/api/v1/applications`}</code>
        </div>
        <ApplicationForm />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-title">API handshake</p>
            <h2>Frontend status check</h2>
          </div>
          <code>{publicApiUrl}</code>
        </div>
        <StatusCard />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-title">Applications</p>
            <h2>Browse created tickets</h2>
          </div>
          <code>{`${publicApiUrl}/api/v1/applications`}</code>
        </div>
        <p className="inline-note">
          Open the applications page to review every ticket and inspect one
          application in detail.
        </p>
        <p className="submission-links">
          <Link className="text-link" href="/applications">
            Open applications list
          </Link>
        </p>
      </section>
    </main>
  );
}
