"use client";

import type {
  GetBaseCvResponse,
  GetFullNameResponse,
  GetWorkTasksResponse,
  UpdateBaseCvRequest,
  UpdateFullNameRequest,
  UpdateWorkTasksRequest,
} from "@repo/contracts";
import { useEffect, useState, type ChangeEvent } from "react";

import { api, getErrorMessage } from "@/lib/api";
import styles from "./profile-editor.module.css";

type FieldState =
  | { kind: "loading" }
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function ProfileEditor({
  initialFullName,
  initialFullNameErrorMessage,
  initialBaseCv,
  initialBaseCvErrorMessage,
  initialWorkTasks,
  initialWorkTasksErrorMessage,
}: {
  initialFullName?: string;
  initialFullNameErrorMessage?: string | null;
  initialBaseCv?: string;
  initialBaseCvErrorMessage?: string | null;
  initialWorkTasks?: string;
  initialWorkTasksErrorMessage?: string | null;
}) {
  const hasInitialFullName =
    initialFullName !== undefined || initialFullNameErrorMessage !== undefined;
  const hasInitialBaseCv =
    initialBaseCv !== undefined || initialBaseCvErrorMessage !== undefined;
  const hasInitialWorkTasks =
    initialWorkTasks !== undefined ||
    initialWorkTasksErrorMessage !== undefined;
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [baseCv, setBaseCv] = useState(initialBaseCv ?? "");
  const [workTasks, setWorkTasks] = useState(initialWorkTasks ?? "");
  const [fullNameState, setFullNameState] = useState<FieldState>(() => {
    if (initialFullNameErrorMessage) {
      return { kind: "error", message: initialFullNameErrorMessage };
    }

    return hasInitialFullName ? { kind: "idle" } : { kind: "loading" };
  });
  const [baseCvState, setBaseCvState] = useState<FieldState>(() => {
    if (initialBaseCvErrorMessage) {
      return { kind: "error", message: initialBaseCvErrorMessage };
    }

    return hasInitialBaseCv ? { kind: "idle" } : { kind: "loading" };
  });
  const [workTasksState, setWorkTasksState] = useState<FieldState>(() => {
    if (initialWorkTasksErrorMessage) {
      return { kind: "error", message: initialWorkTasksErrorMessage };
    }

    return hasInitialWorkTasks ? { kind: "idle" } : { kind: "loading" };
  });

  useEffect(() => {
    let active = true;

    async function loadFullName() {
      if (hasInitialFullName) {
        return;
      }

      try {
        const { data: payload } = await api.get<GetFullNameResponse>(
          "/api/v1/applications/fullName",
          {
            fetchOptions: {
              cache: "no-store",
            },
          }
        );

        if (active) {
          setFullName(payload.fullName);
          setFullNameState({ kind: "idle" });
        }
      } catch (error) {
        if (active) {
          setFullNameState({ kind: "error", message: getErrorMessage(error) });
        }
      }
    }

    async function loadBaseCv() {
      if (hasInitialBaseCv) {
        return;
      }

      try {
        const { data: payload } = await api.get<GetBaseCvResponse>(
          "/api/v1/applications/baseCv",
          {
            fetchOptions: {
              cache: "no-store",
            },
          }
        );

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
      if (hasInitialWorkTasks) {
        return;
      }

      try {
        const { data: payload } = await api.get<GetWorkTasksResponse>(
          "/api/v1/applications/workTasks",
          {
            fetchOptions: {
              cache: "no-store",
            },
          }
        );

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

    void loadFullName();
    void loadBaseCv();
    void loadWorkTasks();

    return () => {
      active = false;
    };
  }, [hasInitialBaseCv, hasInitialFullName, hasInitialWorkTasks]);

  function handleFullNameChange(event: ChangeEvent<HTMLInputElement>) {
    setFullName(event.target.value);
    setFullNameState({ kind: "idle" });
  }

  function handleBaseCvChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setBaseCv(event.target.value);
    setBaseCvState({ kind: "idle" });
  }

  function handleWorkTasksChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setWorkTasks(event.target.value);
    setWorkTasksState({ kind: "idle" });
  }

  async function saveFullName() {
    setFullNameState({ kind: "saving" });

    try {
      const { data: payload } = await api.put<GetFullNameResponse>(
        "/api/v1/applications/fullName",
        {
          fullName,
        } satisfies UpdateFullNameRequest
      );
      setFullName(payload.fullName);
      setFullNameState({ kind: "success", message: "Full name saved." });
    } catch (error) {
      setFullNameState({ kind: "error", message: getErrorMessage(error) });
    }
  }

  async function saveBaseCv() {
    setBaseCvState({ kind: "saving" });

    try {
      const { data: payload } = await api.put<GetBaseCvResponse>(
        "/api/v1/applications/baseCv",
        {
          baseCv,
        } satisfies UpdateBaseCvRequest
      );
      setBaseCv(payload.baseCv);
      setBaseCvState({ kind: "success", message: "Base CV saved." });
    } catch (error) {
      setBaseCvState({ kind: "error", message: getErrorMessage(error) });
    }
  }

  async function saveWorkTasks() {
    setWorkTasksState({ kind: "saving" });

    try {
      const { data: payload } = await api.put<GetWorkTasksResponse>(
        "/api/v1/applications/workTasks",
        {
          workTasks,
        } satisfies UpdateWorkTasksRequest
      );
      setWorkTasks(payload.workTasks);
      setWorkTasksState({ kind: "success", message: "Work tasks saved." });
    } catch (error) {
      setWorkTasksState({ kind: "error", message: getErrorMessage(error) });
    }
  }

  return (
    <div className={styles.profileGrid}>
      <section className={styles.profilePanel}>
        <div className={styles.panelContent}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.sectionLabel}>Profile field</p>
              <h2 className={styles.title}>Full Name</h2>
            </div>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => void saveFullName()}
              disabled={
                fullNameState.kind === "loading" ||
                fullNameState.kind === "saving"
              }
            >
              {fullNameState.kind === "saving" ? "Saving..." : "Save Full Name"}
            </button>
          </div>
          <input
            className={styles.textInput}
            value={fullName}
            onChange={handleFullNameChange}
            placeholder="Maxim Krendel"
            autoComplete="name"
            disabled={fullNameState.kind === "loading"}
          />
          <FieldStatus
            state={fullNameState}
            loadingMessage="Loading full name..."
          />
        </div>
      </section>

      <section className={styles.profilePanel}>
        <div className={styles.panelContent}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.sectionLabel}>Profile field</p>
              <h2 className={styles.title}>Base CV</h2>
            </div>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => void saveBaseCv()}
              disabled={
                baseCvState.kind === "loading" || baseCvState.kind === "saving"
              }
            >
              {baseCvState.kind === "saving" ? "Saving..." : "Save Base CV"}
            </button>
          </div>
          <textarea
            className={styles.textArea}
            value={baseCv}
            onChange={handleBaseCvChange}
            placeholder="Paste the base CV text here."
            disabled={baseCvState.kind === "loading"}
          />
          <FieldStatus state={baseCvState} loadingMessage="Loading base CV..." />
        </div>
      </section>

      <section className={styles.profilePanel}>
        <div className={styles.panelContent}>
          <div className={styles.panelHead}>
            <div>
              <p className={styles.sectionLabel}>Profile field</p>
              <h2 className={styles.title}>Work Tasks</h2>
            </div>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={() => void saveWorkTasks()}
              disabled={
                workTasksState.kind === "loading" ||
                workTasksState.kind === "saving"
              }
            >
              {workTasksState.kind === "saving" ? "Saving..." : "Save Work Tasks"}
            </button>
          </div>
          <textarea
            className={styles.textArea}
            value={workTasks}
            onChange={handleWorkTasksChange}
            placeholder="Paste the work tasks context here."
            disabled={workTasksState.kind === "loading"}
          />
          <FieldStatus
            state={workTasksState}
            loadingMessage="Loading work tasks..."
          />
        </div>
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
    return <p className={styles.note}>{loadingMessage}</p>;
  }

  if (state.kind === "error") {
    return <p className={`${styles.note} ${styles.noteError}`}>{state.message}</p>;
  }

  if (state.kind === "success") {
    return (
      <p className={`${styles.note} ${styles.noteSuccess}`}>{state.message}</p>
    );
  }

  return <p className={styles.note}>Ready to save.</p>;
}
