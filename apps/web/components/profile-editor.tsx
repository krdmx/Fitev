"use client";

import type {
  GetBaseCvResponse,
  GetWorkTasksResponse,
  UpdateBaseCvRequest,
  UpdateWorkTasksRequest,
} from "@repo/contracts";
import { useEffect, useState, type ChangeEvent } from "react";

type FieldState =
  | { kind: "loading" }
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://api.localhost";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown error";
}

async function getResponseMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(payload.message)) {
      return payload.message.join(", ");
    }

    if (typeof payload.message === "string" && payload.message) {
      return payload.message;
    }

    if (typeof payload.error === "string" && payload.error) {
      return payload.error;
    }
  }

  const text = (await response.text()).trim();

  if (text) {
    return text;
  }

  return `Request failed with HTTP ${response.status}`;
}

export function ProfileEditor() {
  const [baseCv, setBaseCv] = useState("");
  const [workTasks, setWorkTasks] = useState("");
  const [baseCvState, setBaseCvState] = useState<FieldState>({
    kind: "loading",
  });
  const [workTasksState, setWorkTasksState] = useState<FieldState>({
    kind: "loading",
  });

  useEffect(() => {
    let active = true;

    async function loadBaseCv() {
      try {
        const response = await fetch(`${apiUrl}/api/v1/applications/baseCv`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(await getResponseMessage(response));
        }

        const payload = (await response.json()) as GetBaseCvResponse;

        if (active) {
          setBaseCv(payload.baseCv);
          setBaseCvState({ kind: "idle" });
        }
      } catch (error) {
        if (active) {
          setBaseCvState({ kind: "error", message: getErrorMessage(error) });
        }
      }
    }

    async function loadWorkTasks() {
      try {
        const response = await fetch(`${apiUrl}/api/v1/applications/workTasks`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(await getResponseMessage(response));
        }

        const payload = (await response.json()) as GetWorkTasksResponse;

        if (active) {
          setWorkTasks(payload.workTasks);
          setWorkTasksState({ kind: "idle" });
        }
      } catch (error) {
        if (active) {
          setWorkTasksState({ kind: "error", message: getErrorMessage(error) });
        }
      }
    }

    void loadBaseCv();
    void loadWorkTasks();

    return () => {
      active = false;
    };
  }, []);

  function handleBaseCvChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setBaseCv(event.target.value);
    setBaseCvState({ kind: "idle" });
  }

  function handleWorkTasksChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setWorkTasks(event.target.value);
    setWorkTasksState({ kind: "idle" });
  }

  async function saveBaseCv() {
    setBaseCvState({ kind: "saving" });

    try {
      const response = await fetch(`${apiUrl}/api/v1/applications/baseCv`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          baseCv,
        } satisfies UpdateBaseCvRequest),
      });

      if (!response.ok) {
        throw new Error(await getResponseMessage(response));
      }

      const payload = (await response.json()) as GetBaseCvResponse;
      setBaseCv(payload.baseCv);
      setBaseCvState({ kind: "success", message: "Base CV saved." });
    } catch (error) {
      setBaseCvState({ kind: "error", message: getErrorMessage(error) });
    }
  }

  async function saveWorkTasks() {
    setWorkTasksState({ kind: "saving" });

    try {
      const response = await fetch(`${apiUrl}/api/v1/applications/workTasks`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          workTasks,
        } satisfies UpdateWorkTasksRequest),
      });

      if (!response.ok) {
        throw new Error(await getResponseMessage(response));
      }

      const payload = (await response.json()) as GetWorkTasksResponse;
      setWorkTasks(payload.workTasks);
      setWorkTasksState({ kind: "success", message: "Work tasks saved." });
    } catch (error) {
      setWorkTasksState({ kind: "error", message: getErrorMessage(error) });
    }
  }

  return (
    <div className="profile-grid">
      <section className="profile-card">
        <div className="profile-card-head">
          <div>
            <p className="section-title">Profile field</p>
            <h2>Base CV</h2>
          </div>
          <button
            className="submit-button"
            type="button"
            onClick={() => void saveBaseCv()}
            disabled={baseCvState.kind === "loading" || baseCvState.kind === "saving"}
          >
            {baseCvState.kind === "saving" ? "Saving..." : "Save Base CV"}
          </button>
        </div>
        <textarea
          className="profile-textarea"
          value={baseCv}
          onChange={handleBaseCvChange}
          placeholder="Paste the base CV text here."
          disabled={baseCvState.kind === "loading"}
        />
        <FieldStatus state={baseCvState} loadingMessage="Loading base CV..." />
      </section>

      <section className="profile-card">
        <div className="profile-card-head">
          <div>
            <p className="section-title">Profile field</p>
            <h2>Work Tasks</h2>
          </div>
          <button
            className="submit-button"
            type="button"
            onClick={() => void saveWorkTasks()}
            disabled={
              workTasksState.kind === "loading" || workTasksState.kind === "saving"
            }
          >
            {workTasksState.kind === "saving" ? "Saving..." : "Save Work Tasks"}
          </button>
        </div>
        <textarea
          className="profile-textarea"
          value={workTasks}
          onChange={handleWorkTasksChange}
          placeholder="Paste the work tasks context here."
          disabled={workTasksState.kind === "loading"}
        />
        <FieldStatus
          state={workTasksState}
          loadingMessage="Loading work tasks..."
        />
      </section>
    </div>
  );
}

interface FieldStatusProps {
  state: FieldState;
  loadingMessage: string;
}

function FieldStatus({ state, loadingMessage }: FieldStatusProps) {
  if (state.kind === "loading") {
    return <p className="inline-note">{loadingMessage}</p>;
  }

  if (state.kind === "error") {
    return <p className="inline-note inline-note-error">{state.message}</p>;
  }

  if (state.kind === "success") {
    return <p className="inline-note inline-note-success">{state.message}</p>;
  }

  return <p className="inline-note">Ready to save.</p>;
}
