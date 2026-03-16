import Link from "next/link";

import { ProfileEditor } from "@/components/profile-editor";

export default function ProfilePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Profile editor</p>
          <h1>Manage the base context used by the application pipeline.</h1>
          <p className="lede">
            Update the stored `baseCv` and `workTasks` texts in Postgres before
            you launch a new application ticket.
          </p>
        </div>
        <div className="hero-grid">
          <Link className="pill pill-link" href="/">
            Back to pipeline
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-title">Stored profile</p>
            <h2>Edit base CV and work tasks</h2>
          </div>
          <code>/profile</code>
        </div>
        <ProfileEditor />
      </section>
    </main>
  );
}
