"use client";

import type { GetApplicationsResponse } from "@repo/contracts";
import { RefreshCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AlertPopup } from "@/components/alert-popup";
import { ApplicationStatusBadge } from "@/components/application-status-badge";
import { api, getErrorMessage } from "@/lib/api";
import { formatTicketTitle } from "@/lib/application-ticket";
import styles from "./applications-list.module.css";
import { useRouter } from "next/navigation";

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

export function ApplicationsList({
  initialPayload,
  initialErrorMessage,
}: {
  initialPayload?: GetApplicationsResponse;
  initialErrorMessage?: string | null;
}) {
  const hasServerSeed =
    initialPayload !== undefined || initialErrorMessage !== undefined;
  const [payload, setPayload] = useState<GetApplicationsResponse | null>(
    initialPayload ?? null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialErrorMessage ?? null
  );
  const [isLoading, setIsLoading] = useState(!hasServerSeed);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [deletingTicketIds, setDeletingTicketIds] = useState<string[]>([]);
  const [pendingDeleteTicketIds, setPendingDeleteTicketIds] = useState<
    string[]
  >([]);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const router = useRouter();

  useEffect(() => {
    let active = true;

    if (refreshKey === 0 && hasServerSeed) {
      return () => {
        active = false;
      };
    }

    async function loadApplications() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const { data: nextPayload } = await api.get<GetApplicationsResponse>(
          "/api/v1/applications",
          {
            fetchOptions: {
              cache: "no-store",
            },
          }
        );

        if (active) {
          const availableTicketIds = new Set(
            nextPayload.applications.map((ticket) => ticket.ticketId)
          );

          setPayload(nextPayload);
          setSelectedTicketIds((current) =>
            current.filter((ticketId) => availableTicketIds.has(ticketId))
          );
          setDeletingTicketIds((current) =>
            current.filter((ticketId) => availableTicketIds.has(ticketId))
          );
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
  }, [hasServerSeed, refreshKey]);

  function handleRefresh() {
    setRefreshKey((current) => current + 1);
  }

  const applications = payload?.applications ?? [];
  const deletingTicketSet = new Set(deletingTicketIds);
  const selectedTicketSet = new Set(selectedTicketIds);
  const selectableTicketIds = applications
    .filter((ticket) => !deletingTicketSet.has(ticket.ticketId))
    .map((ticket) => ticket.ticketId);
  const selectedSelectableCount = selectableTicketIds.filter((ticketId) =>
    selectedTicketSet.has(ticketId)
  ).length;
  const isAllSelectableTicketsSelected =
    selectableTicketIds.length > 0 &&
    selectedSelectableCount === selectableTicketIds.length;
  const isDeletingTickets = deletingTicketIds.length > 0;
  const isDeletePopupOpen = pendingDeleteTicketIds.length > 0;
  const deletePopupTitle =
    pendingDeleteTicketIds.length === 1
      ? `Delete ticket ${pendingDeleteTicketIds[0]}?`
      : `Delete ${pendingDeleteTicketIds.length} tickets?`;
  const deletePopupDescription =
    pendingDeleteTicketIds.length === 1
      ? "This permanently removes the ticket and its saved CV and cover letter markdown documents."
      : "This permanently removes the selected tickets and their saved CV and cover letter markdown documents.";
  const deletePopupConfirmLabel =
    pendingDeleteTicketIds.length === 1 ? "Delete ticket" : "Delete tickets";

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }

    selectAllRef.current.indeterminate =
      selectedSelectableCount > 0 &&
      selectedSelectableCount < selectableTicketIds.length;
  }, [selectedSelectableCount, selectableTicketIds.length]);

  function handleToggleSelection(ticketId: string) {
    setSelectedTicketIds((current) =>
      current.includes(ticketId)
        ? current.filter((currentTicketId) => currentTicketId !== ticketId)
        : [...current, ticketId]
    );
  }

  function handleToggleAllTickets() {
    if (selectableTicketIds.length === 0) {
      return;
    }

    setSelectedTicketIds((current) => {
      if (isAllSelectableTicketsSelected) {
        return current.filter(
          (ticketId) => !selectableTicketIds.includes(ticketId)
        );
      }

      return Array.from(new Set([...current, ...selectableTicketIds]));
    });
  }

  async function deleteTickets(ticketIds: string[]) {
    if (!payload) {
      return;
    }

    const ticketIdSet = new Set(ticketIds);

    setDeletingTicketIds((current) =>
      Array.from(new Set([...current, ...ticketIds]))
    );
    setErrorMessage(null);

    const results = await Promise.allSettled(
      ticketIds.map((ticketId) =>
        api.delete(`/api/v1/applications/${ticketId}`)
      )
    );

    const deletedTicketIds = results.flatMap((result, index) =>
      result.status === "fulfilled" ? [ticketIds[index]] : []
    );
    const failedDeletions = results.flatMap((result, index) =>
      result.status === "rejected"
        ? [
            {
              ticketId: ticketIds[index],
              message: getErrorMessage(result.reason),
            },
          ]
        : []
    );

    if (deletedTicketIds.length > 0) {
      const deletedTicketSet = new Set(deletedTicketIds);

      setPayload((current) =>
        current
          ? {
              applications: current.applications.filter(
                (ticket) => !deletedTicketSet.has(ticket.ticketId)
              ),
            }
          : current
      );
      setSelectedTicketIds((current) =>
        current.filter((ticketId) => !deletedTicketSet.has(ticketId))
      );
    }

    if (failedDeletions.length > 0) {
      if (deletedTicketIds.length > 0) {
        setErrorMessage(
          `Deleted ${deletedTicketIds.length} of ${ticketIds.length} tickets. Failed: ${failedDeletions
            .map(({ ticketId, message }) => `${ticketId} (${message})`)
            .join(", ")}`
        );
      } else if (failedDeletions.length === 1) {
        const failedDeletion = failedDeletions[0];

        setErrorMessage(
          failedDeletion
            ? `Could not delete ${failedDeletion.ticketId}: ${failedDeletion.message}`
            : "Could not delete the selected ticket."
        );
      } else {
        setErrorMessage(
          `Could not delete ${failedDeletions.length} tickets. Failed: ${failedDeletions
            .map(({ ticketId, message }) => `${ticketId} (${message})`)
            .join(", ")}`
        );
      }
    }

    setDeletingTicketIds((current) =>
      current.filter((ticketId) => !ticketIdSet.has(ticketId))
    );
  }

  function handleDelete(ticketIds: string[]) {
    if (ticketIds.length === 0) {
      return;
    }

    setPendingDeleteTicketIds(ticketIds);
  }

  function handleDeleteCancel() {
    if (isDeletingTickets) {
      return;
    }

    setPendingDeleteTicketIds([]);
  }

  async function handleDeleteConfirm() {
    if (pendingDeleteTicketIds.length === 0) {
      return;
    }

    await deleteTickets(pendingDeleteTicketIds);
    setPendingDeleteTicketIds([]);
  }

  if (!payload && isLoading) {
    return (
      <div className={`${styles.statePanel} ${styles.loadingState}`}>
        <div className={styles.stateContent}>
          <p className={styles.eyebrow}>Tickets</p>
          <h2 className={styles.stateTitle}>Loading application tickets...</h2>
        </div>
      </div>
    );
  }

  if (!payload && errorMessage) {
    return (
      <div
        className={`${styles.statePanel} ${styles.errorState}`}
        aria-live="polite"
      >
        <div className={styles.stateContent}>
          <p className={styles.eyebrow}>Tickets</p>
          <h2 className={styles.stateTitle}>
            Could not load the application list.
          </h2>
          <p className={styles.stateMessage}>{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (!payload) {
    return null;
  }

  return (
    <div className={styles.listStack}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarCopy}>
          <p className={styles.note}>
            Delete removes both the ticket and any stored markdown result.
          </p>
          <p className={styles.note}>
            Select several rows to remove multiple tickets at once.
          </p>
        </div>

        <div className={styles.bulkActions}>
          <span className={styles.selectionCount} aria-live="polite">
            {selectedTicketIds.length === 0
              ? "No tickets selected"
              : `${selectedTicketIds.length} selected`}
          </span>
          <button
            className={styles.dangerButton}
            type="button"
            onClick={() => void handleDelete(selectedTicketIds)}
            disabled={selectedTicketIds.length === 0 || isDeletingTickets}
          >
            <Trash2 size={16} />
            <span>
              {isDeletingTickets && selectedTicketIds.length > 1
                ? "Deleting..."
                : "Delete selected"}
            </span>
          </button>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={handleRefresh}
            disabled={isLoading || isDeletingTickets}
          >
            <RefreshCcw size={16} />
            <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {errorMessage ? (
        <p className={`${styles.note} ${styles.noteError}`} aria-live="polite">
          {errorMessage}
        </p>
      ) : null}

      {payload.applications.length === 0 ? (
        <div className={styles.emptyPanel}>
          <p className={styles.eyebrow}>Tickets</p>
          <h2 className={styles.emptyTitle}>No tickets yet.</h2>
          <p className={styles.emptyText}>
            Create a new application from the dashboard to populate this list.
          </p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxCell}>
                  <input
                    ref={selectAllRef}
                    className={styles.checkbox}
                    type="checkbox"
                    checked={isAllSelectableTicketsSelected}
                    onChange={handleToggleAllTickets}
                    disabled={
                      selectableTicketIds.length === 0 || isDeletingTickets
                    }
                    aria-label={
                      isAllSelectableTicketsSelected
                        ? "Deselect all tickets"
                        : "Select all tickets"
                    }
                  />
                </th>
                <th>Ticket</th>
                <th>Status</th>
                <th>Role brief</th>
                <th>Updated</th>
                <th>Last error</th>
                <th className={styles.actionsHead}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payload.applications.map((ticket) => {
                const isDeleting = deletingTicketSet.has(ticket.ticketId);
                const isSelected = selectedTicketSet.has(ticket.ticketId);

                return (
                  <tr
                    key={ticket.ticketId}
                    className={isDeleting ? styles.deletingRow : undefined}
                  >
                    <td className={styles.checkboxCell}>
                      <input
                        className={styles.checkbox}
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelection(ticket.ticketId)}
                        disabled={isDeletingTickets}
                        aria-label={`Select ticket ${ticket.ticketId}`}
                      />
                    </td>
                    <td>
                      <div className={styles.primaryCell}>
                        <strong
                          onClick={() => {
                            router.push(`/applications/${ticket.ticketId}`);
                          }}
                        >
                          {ticket.companyName}
                        </strong>
                        <p className={styles.createdAt}>
                          Created {new Date(ticket.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </td>
                    <td className={styles.statusCell}>
                      <ApplicationStatusBadge status={ticket.status} />
                    </td>
                    <td className={styles.copyCell}>
                      {truncateText(ticket.vacancyDescription, 180)}
                    </td>
                    <td className={styles.dateCell}>
                      {new Date(ticket.updatedAt).toLocaleString()}
                    </td>
                    <td
                      className={`${styles.errorCell} ${
                        ticket.lastError ? styles.errorCellActive : ""
                      }`}
                    >
                      {ticket.lastError ?? "none"}
                    </td>
                    <td>
                      <button
                        className={styles.dangerButton}
                        type="button"
                        onClick={() => void handleDelete([ticket.ticketId])}
                        disabled={isDeletingTickets}
                      >
                        <Trash2 size={16} />
                        <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AlertPopup
        open={isDeletePopupOpen}
        title={deletePopupTitle}
        description={deletePopupDescription}
        confirmLabel={
          isDeletingTickets ? "Deleting..." : deletePopupConfirmLabel
        }
        cancelLabel="Cancel"
        isBusy={isDeletingTickets}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
