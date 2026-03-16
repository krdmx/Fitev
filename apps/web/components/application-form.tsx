"use client";

import type { CreateApplicationResponse } from "@repo/contracts";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { getErrorMessage, requestJson } from "@/lib/api";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; payload: CreateApplicationResponse }
  | { kind: "error"; message: string };

export function ApplicationForm() {
  const [fullName, setFullName] = useState("");
  const [vacancyDescription, setVacancyDescription] = useState("");
  const [state, setState] = useState<SubmissionState>({ kind: "idle" });

  function resetState() {
    setState((current) =>
      current.kind === "idle" ? current : { kind: "idle" }
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "submitting" });

    try {
      const payload = await requestJson<CreateApplicationResponse>(
        "/api/v1/applications",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            fullName,
            vacancyDescription,
          }),
        }
      );

      setState({ kind: "success", payload });
    } catch (error) {
      setState({ kind: "error", message: getErrorMessage(error) });
    }
  }

  return (
    <div className="application-stack">
      <form className="application-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Maxim Krendel"
            value={fullName}
            onChange={(event) => {
              resetState();
              setFullName(event.target.value);
            }}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="vacancyDescription">Vacancy description</label>
          <textarea
            id="vacancyDescription"
            name="vacancyDescription"
            placeholder="Paste the full job description here."
            value={vacancyDescription}
            onChange={(event) => {
              resetState();
              setVacancyDescription(event.target.value);
            }}
            required
          />
        </div>

        <div className="form-actions">
          <p className="form-hint">
            The API will create a processing ticket, load `baseCv` and
            `workTasks` from Postgres, and then trigger your n8n webhook.
          </p>
          <button
            className="submit-button"
            type="submit"
            disabled={state.kind === "submitting"}
          >
            {state.kind === "submitting" ? "Submitting..." : "Start pipeline"}
          </button>
        </div>
      </form>

      {state.kind === "success" ? (
        <div
          className="submission-card submission-card-success"
          aria-live="polite"
        >
          <p className="status-label">Ticket created</p>
          <h3>{state.payload.ticketId}</h3>
          <p>
            Status: <strong>{state.payload.status}</strong>
          </p>
          <p>
            Created at: {new Date(state.payload.createdAt).toLocaleString()}
          </p>
          <p className="submission-links">
            <Link
              className="text-link"
              href={`/applications/${state.payload.ticketId}`}
            >
              Open ticket details
            </Link>
            <Link className="text-link" href="/applications">
              View all applications
            </Link>
          </p>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div
          className="submission-card submission-card-error"
          aria-live="polite"
        >
          <p className="status-label">Submission failed</p>
          <h3>Backend rejected the request.</h3>
          <p>{state.message}</p>
        </div>
      ) : null}
    </div>
  );
}
