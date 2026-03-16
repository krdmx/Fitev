"use client";

import type { GetApplicationTicketResponse } from "@repo/contracts";
import { useEffect, useState } from "react";

import { ApplicationStatusBadge } from "@/components/application-status-badge";
import { getErrorMessage, requestJson } from "@/lib/api";

function FilePreview({
  label,
  fileName,
  mimeType,
  dataUrl,
}: {
  label: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
}) {
  return (
    <div className="ticket-file">
      <div className="ticket-file-head">
        <div>
          <p className="status-label">{label}</p>
          <h3>{fileName}</h3>
        </div>
        <a href={dataUrl} target="_blank" rel="noreferrer">
          Open file
        </a>
      </div>
      <object
        className="ticket-file-preview"
        data={dataUrl}
        type={mimeType}
        aria-label={`${label} preview`}
      >
        <a href={dataUrl} target="_blank" rel="noreferrer">
          Open {fileName}
        </a>
      </object>
    </div>
  );
}

export function TicketResultCard({ ticketId }: { ticketId: string }) {
  const [payload, setPayload] = useState<GetApplicationTicketResponse | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadTicket() {
      setIsLoading(true);
      setErrorMessage(null);
      setPayload((current) =>
        current?.ticketId === ticketId ? current : null
      );

      try {
        const nextPayload = await requestJson<GetApplicationTicketResponse>(
          `/api/v1/applications/${ticketId}`,
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

    void loadTicket();

    return () => {
      active = false;
    };
  }, [refreshKey, ticketId]);

  function handleRefresh() {
    setRefreshKey((current) => current + 1);
  }

  return (
    <div className="application-stack">
      <div className="section-actions">
        <p className="inline-note">
          Refresh this view after the workflow posts its result back to the API.
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
          Could not refresh ticket: {errorMessage}
        </p>
      ) : null}

      {!payload && isLoading ? (
        <div className="status-card status-card-loading">
          <p className="status-label">Ticket {ticketId}</p>
          <h3>Loading application ticket...</h3>
        </div>
      ) : null}

      {!payload && errorMessage ? (
        <div className="status-card status-card-error" aria-live="polite">
          <p className="status-label">Ticket {ticketId}</p>
          <h3>Could not load the application ticket.</h3>
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {payload ? (
        <div className="status-card ticket-card">
          <div className="status-row">
            <div>
              <p className="status-label">Ticket</p>
              <h3>{payload.ticketId}</h3>
            </div>
            <ApplicationStatusBadge status={payload.status} />
          </div>

          <dl className="status-grid">
            <div>
              <dt>Full name</dt>
              <dd>{payload.fullName}</dd>
            </div>
            <div>
              <dt>Created at</dt>
              <dd>{new Date(payload.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Updated at</dt>
              <dd>{new Date(payload.updatedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Last error</dt>
              <dd>{payload.lastError ?? "none"}</dd>
            </div>
          </dl>

          <div className="ticket-block">
            <p className="status-label">Vacancy description</p>
            <p>{payload.vacancyDescription}</p>
          </div>

          {payload.result ? (
            <>
              <div className="ticket-block">
                <p className="status-label">Personal note</p>
                <p>{payload.result.personalNote}</p>
              </div>

              <div className="ticket-files">
                <FilePreview
                  label="Generated CV"
                  fileName={payload.result.cv.fileName}
                  mimeType={payload.result.cv.mimeType}
                  dataUrl={payload.result.cv.dataUrl}
                />
                <FilePreview
                  label="Generated cover letter"
                  fileName={payload.result.coverLetter.fileName}
                  mimeType={payload.result.coverLetter.mimeType}
                  dataUrl={payload.result.coverLetter.dataUrl}
                />
              </div>
            </>
          ) : (
            <div className="ticket-block">
              <p className="status-label">Result</p>
              <p>No generated files have been saved for this ticket yet.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
