"use client";

import type { GetApplicationsResponse } from "@repo/contracts";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ApplicationStatusBadge } from "@/components/application-status-badge";
import { getErrorMessage, requestJson } from "@/lib/api";

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

export function ApplicationsList() {
  const [payload, setPayload] = useState<GetApplicationsResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadApplications() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextPayload = await requestJson<GetApplicationsResponse>(
          "/api/v1/applications",
          {
            cache: "no-store",
          }
        );

        if (active) {
          setPayload(nextPayload);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadApplications();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  function handleRefresh() {
    setRefreshKey((current) => current + 1);
  }

  return (
    <div className="application-stack">
      <div className="section-actions">
        <p className="inline-note">
          Review the latest tickets and open a detail page to inspect one
          application.
        </p>
        <button
          className="secondary-button"
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {errorMessage && payload ? (
        <p className="inline-note inline-note-error" aria-live="polite">
          Could not refresh the list: {errorMessage}
        </p>
      ) : null}

      {!payload && isLoading ? (
        <div className="status-card status-card-loading">
          <p className="status-label">Applications</p>
          <h3>Loading application tickets...</h3>
        </div>
      ) : null}

      {!payload && errorMessage ? (
        <div className="status-card status-card-error" aria-live="polite">
          <p className="status-label">Applications</p>
          <h3>Could not load the application list.</h3>
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {payload && payload.applications.length === 0 ? (
        <div className="status-card">
          <p className="status-label">Applications</p>
          <h3>No tickets yet.</h3>
          <p>Create a new application from the pipeline page to populate this list.</p>
        </div>
      ) : null}

      {payload && payload.applications.length > 0 ? (
        <div className="ticket-list">
          {payload.applications.map((ticket) => (
            <article
              key={ticket.ticketId}
              className="status-card ticket-card ticket-summary-card"
            >
              <div className="status-row">
                <div>
                  <p className="status-label">Ticket</p>
                  <h3>{ticket.ticketId}</h3>
                </div>
                <ApplicationStatusBadge status={ticket.status} />
              </div>

              <dl className="status-grid">
                <div>
                  <dt>Full name</dt>
                  <dd>{ticket.fullName}</dd>
                </div>
                <div>
                  <dt>Created at</dt>
                  <dd>{new Date(ticket.createdAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Updated at</dt>
                  <dd>{new Date(ticket.updatedAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Last error</dt>
                  <dd>{ticket.lastError ?? "none"}</dd>
                </div>
              </dl>

              <div className="ticket-block">
                <p className="status-label">Vacancy description</p>
                <p>{truncateText(ticket.vacancyDescription, 280)}</p>
              </div>

              <div className="ticket-actions">
                <p className="inline-note">
                  Open the detail page to inspect status updates and generated
                  files.
                </p>
                <Link className="text-link" href={`/applications/${ticket.ticketId}`}>
                  Open ticket
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
