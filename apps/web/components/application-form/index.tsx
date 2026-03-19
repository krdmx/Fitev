"use client";

import type {
  CreateApplicationRequest,
  CreateApplicationResponse,
} from "@repo/contracts";
import { ArrowRight, FilePlus2 } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { api, getErrorMessage } from "@/lib/api";
import styles from "./application-form.module.css";

type SubmissionState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; payload: CreateApplicationResponse }
  | { kind: "error"; message: string };

export function ApplicationForm() {
  const [companyName, setCompanyName] = useState("");
  const [vacancyDescription, setVacancyDescription] = useState("");
  const [state, setState] = useState<SubmissionState>({ kind: "idle" });

  function resetState() {
    setState((current) =>
      current.kind === "idle" ? current : { kind: "idle" }
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextCompanyName = String(formData.get("companyName") ?? "").trim();
    const nextVacancyDescription = String(
      formData.get("vacancyDescription") ?? ""
    ).trim();

    setCompanyName(nextCompanyName);
    setVacancyDescription(nextVacancyDescription);

    if (!nextCompanyName || !nextVacancyDescription) {
      setState({
        kind: "error",
        message: "Company name and role brief are required.",
      });
      return;
    }

    setState({ kind: "submitting" });

    try {
      const { data: payload } = await api.post<CreateApplicationResponse>(
        "/api/v1/applications",
        {
          companyName: nextCompanyName,
          vacancyDescription: nextVacancyDescription,
        } satisfies CreateApplicationRequest
      );

      setState({ kind: "success", payload });
    } catch (error) {
      setState({ kind: "error", message: getErrorMessage(error) });
    }
  }

  return (
    <div className={styles.formStack}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>Ticket Composer</p>
        <h1 className={styles.title}>
          Turn each request into an editable markdown workspace.
        </h1>
        <p className={styles.lede}>
          Submit a company and role description, let the backend create a
          ticket, and then refine the generated CV and cover letter directly
          inside the preview workspace before exporting PDF.
        </p>
      </div>

      <form className={styles.composerForm} onSubmit={handleSubmit}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="companyName">
            Company name
          </label>
          <input
            className={styles.textInput}
            id="companyName"
            name="companyName"
            type="text"
            autoComplete="organization"
            placeholder="OpenAI"
            value={companyName}
            onChange={(event) => {
              resetState();
              setCompanyName(event.target.value);
            }}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="vacancyDescription">
            Role brief
          </label>
          <textarea
            className={styles.textArea}
            id="vacancyDescription"
            name="vacancyDescription"
            placeholder="Paste the job description or hiring brief here."
            value={vacancyDescription}
            onChange={(event) => {
              resetState();
              setVacancyDescription(event.target.value);
            }}
            required
          />
        </div>

        <div className={styles.formActions}>
          <p className={styles.formHint}>
            The API loads profile `fullName`, `baseCv`, and `workTasks` from
            Postgres. In `backend-devmode` it completes the ticket with markdown
            mock data; in live mode it forwards the request to n8n and waits for
            the JSON callback.
          </p>
          <button
            className={styles.primaryButton}
            type="submit"
            disabled={state.kind === "submitting"}
          >
            <FilePlus2 size={18} />
            <span>
              {state.kind === "submitting" ? "Creating..." : "Create Ticket"}
            </span>
          </button>
        </div>
      </form>

      {state.kind === "success" ? (
        <div
          className={`${styles.feedbackPanel} ${styles.feedbackSuccess}`}
          aria-live="polite"
        >
          <div className={styles.feedbackContent}>
            <div className={styles.feedbackHeader}>
              <div>
                <p className={styles.statusLabel}>Ticket created</p>
                <h3 className={styles.feedbackTitle}>
                  {state.payload.ticketId}
                </h3>
              </div>
              <span className={styles.statusPill}>{state.payload.status}</span>
            </div>
            <p className={styles.feedbackText}>
              Created at: {new Date(state.payload.createdAt).toLocaleString()}
            </p>
            <div className={styles.feedbackLinks}>
              <Link
                className={`${styles.textLink} ${styles.textLinkInline}`}
                href={`/applications/${state.payload.ticketId}`}
              >
                <span>Open ticket workspace</span>
                <ArrowRight size={16} />
              </Link>
              <Link className={styles.textLink} href="/applications">
                View all tickets
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div
          className={`${styles.feedbackPanel} ${styles.feedbackError}`}
          aria-live="polite"
        >
          <div className={styles.feedbackContent}>
            <p className={styles.statusLabel}>Submission failed</p>
            <h3 className={styles.feedbackTitle}>
              Backend rejected the ticket.
            </h3>
            <p className={styles.feedbackText}>{state.message}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
