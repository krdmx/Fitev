"use client";

import type {
  ApplicationTicketResultResponse,
  ExportApplicationArchiveRequest,
  ExportApplicationPdfRequest,
  GetBaseCvResponse,
  GetApplicationTicketResponse,
  GetFullNameResponse,
  UpdateApplicationResultRequest,
} from "@repo/contracts";
import { isAxiosError } from "axios";
import { Download, Files, RefreshCcw, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";

import { AlertPopup } from "@/components/alert-popup";
import { ApplicationStatusBadge } from "@/components/application-status-badge";
import { buildMarkdownSheetExportHtml, MarkdownSheet } from "@/components/markdown-sheet";
import { api, getErrorMessage } from "@/lib/api";
import {
  formatArchiveFileName,
  formatPdfFileName,
  formatTicketTitle,
} from "@/lib/application-ticket";
import {
  buildResumeMarkdownForPreview,
  isLegacyFinalResumeMarkdown,
} from "@/lib/legacy-resume-export";
import styles from "./ticket-result-card.module.css";

type DocumentKey = "cvMarkdown" | "coverLetterMarkdown";

const documentMeta: Record<
  DocumentKey,
  {
    label: string;
    exportKind: "cv" | "coverLetter";
  }
> = {
  cvMarkdown: {
    label: "Generated CV",
    exportKind: "cv",
  },
  coverLetterMarkdown: {
    label: "Cover Letter",
    exportKind: "coverLetter",
  },
};

function countWords(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 0);
}

async function getBinaryRequestErrorMessage(error: unknown) {
  if (isAxiosError(error) && error.response?.data instanceof Blob) {
    const payload = (await error.response.data.text()).trim();

    if (payload) {
      try {
        const parsed = JSON.parse(payload) as {
          message?: string | string[];
          error?: string;
        };

        if (Array.isArray(parsed.message) && parsed.message.length > 0) {
          return parsed.message.join(", ");
        }

        if (typeof parsed.message === "string" && parsed.message.trim()) {
          return parsed.message.trim();
        }

        if (typeof parsed.error === "string" && parsed.error.trim()) {
          return parsed.error.trim();
        }
      } catch {
        return payload;
      }
    }
  }

  return getErrorMessage(error);
}

export function TicketResultCard({
  ticketId,
  initialPayload,
  initialErrorMessage,
  initialBaseCv,
  initialBaseCvErrorMessage,
  initialFullName,
  initialFullNameErrorMessage,
}: {
  ticketId: string;
  initialPayload?: GetApplicationTicketResponse;
  initialErrorMessage?: string | null;
  initialBaseCv?: string;
  initialBaseCvErrorMessage?: string | null;
  initialFullName?: string;
  initialFullNameErrorMessage?: string | null;
}) {
  const router = useRouter();
  const cvExportRef = useRef<HTMLElement | null>(null);
  const coverLetterExportRef = useRef<HTMLElement | null>(null);
  const hasServerSeed =
    initialPayload !== undefined || initialErrorMessage !== undefined;
  const hasBaseCvServerSeed =
    initialBaseCv !== undefined || initialBaseCvErrorMessage !== undefined;
  const hasFullNameServerSeed =
    initialFullName !== undefined || initialFullNameErrorMessage !== undefined;
  const [payload, setPayload] = useState<GetApplicationTicketResponse | null>(
    initialPayload ?? null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialErrorMessage ?? null
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!hasServerSeed);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isArchiveExporting, setIsArchiveExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeDocument, setActiveDocument] =
    useState<DocumentKey>("cvMarkdown");
  const [baseCv, setBaseCv] = useState(initialBaseCv ?? "");
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [baseCvErrorMessage, setBaseCvErrorMessage] = useState<string | null>(
    initialBaseCvErrorMessage ?? null
  );
  const [fullNameErrorMessage, setFullNameErrorMessage] = useState<string | null>(
    initialFullNameErrorMessage ?? null
  );
  const [drafts, setDrafts] = useState({
    cvMarkdown: initialPayload?.result?.cvMarkdown ?? "",
    coverLetterMarkdown: initialPayload?.result?.coverLetterMarkdown ?? "",
  });

  useEffect(() => {
    let active = true;

    if (refreshKey === 0 && hasServerSeed) {
      return () => {
        active = false;
      };
    }

    async function loadTicket() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const { data: nextPayload } =
          await api.get<GetApplicationTicketResponse>(
            `/api/v1/applications/${ticketId}`,
            {
              fetchOptions: {
                cache: "no-store",
              },
            }
          );

        if (active) {
          setPayload(nextPayload);
          setSaveMessage(null);

          if (nextPayload.result) {
            setDrafts({
              cvMarkdown: nextPayload.result.cvMarkdown,
              coverLetterMarkdown: nextPayload.result.coverLetterMarkdown,
            });
          }
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
  }, [hasServerSeed, refreshKey, ticketId]);

  useEffect(() => {
    let active = true;

    if (refreshKey === 0 && hasBaseCvServerSeed) {
      return () => {
        active = false;
      };
    }

    async function loadBaseCv() {
      try {
        const { data: nextPayload } = await api.get<GetBaseCvResponse>(
          "/api/v1/applications/baseCv",
          {
            fetchOptions: {
              cache: "no-store",
            },
          }
        );

        if (active) {
          setBaseCv(nextPayload.baseCv);
          setBaseCvErrorMessage(null);
        }
      } catch (error) {
        if (active) {
          setBaseCvErrorMessage(getErrorMessage(error));
        }
      }
    }

    void loadBaseCv();

    return () => {
      active = false;
    };
  }, [hasBaseCvServerSeed, refreshKey]);

  useEffect(() => {
    let active = true;

    if (refreshKey === 0 && hasFullNameServerSeed) {
      return () => {
        active = false;
      };
    }

    async function loadFullName() {
      try {
        const { data: nextPayload } = await api.get<GetFullNameResponse>(
          "/api/v1/applications/fullName",
          {
            fetchOptions: {
              cache: "no-store",
            },
          }
        );

        if (active) {
          setFullName(nextPayload.fullName);
          setFullNameErrorMessage(null);
        }
      } catch (error) {
        if (active) {
          setFullNameErrorMessage(getErrorMessage(error));
        }
      }
    }

    void loadFullName();

    return () => {
      active = false;
    };
  }, [hasFullNameServerSeed, refreshKey]);

  function handleRefresh() {
    setRefreshKey((current) => current + 1);
  }

  function updateDraft(nextValue: string) {
    setSaveMessage(null);
    setDrafts((current) => ({
      ...current,
      [activeDocument]: nextValue,
    }));
  }

  async function handleSave() {
    if (!payload?.result) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSaveMessage(null);

    try {
      const { data: updatedResult } =
        await api.put<ApplicationTicketResultResponse>(
          `/api/v1/applications/${ticketId}/result`,
          {
            cvMarkdown: drafts.cvMarkdown,
            coverLetterMarkdown: drafts.coverLetterMarkdown,
          } satisfies UpdateApplicationResultRequest
        );

      setPayload((current) =>
        current
          ? {
              ...current,
              updatedAt: updatedResult.updatedAt,
              result: updatedResult,
            }
          : current
      );
      setDrafts({
        cvMarkdown: updatedResult.cvMarkdown,
        coverLetterMarkdown: updatedResult.coverLetterMarkdown,
      });
      setSaveMessage("Markdown result saved.");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  function getExportRef(documentKey: DocumentKey) {
    return documentKey === "cvMarkdown" ? cvExportRef.current : coverLetterExportRef.current;
  }

  function getExportHtml(documentKey: DocumentKey) {
    const ref = getExportRef(documentKey);

    if (!ref) {
      return null;
    }

    return buildMarkdownSheetExportHtml(ref.outerHTML);
  }

  async function handleDownloadPdf() {
    const exportHtml = getExportHtml(activeDocument);

    if (!exportHtml) {
      return;
    }

    setIsExporting(true);
    setErrorMessage(null);
    setSaveMessage(null);

    try {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      const { label, exportKind } = documentMeta[activeDocument];
      const exportFileName = formatPdfFileName(fullName, exportKind);
      const { data } = await api.post<Blob>(
        `/api/v1/applications/${ticketId}/pdf`,
        {
          html: exportHtml,
          fileName: exportFileName,
        } satisfies ExportApplicationPdfRequest,
        {
          headers: {
            Accept: "application/pdf",
          },
          responseType: "blob",
        }
      );

      triggerBlobDownload(
        data instanceof Blob
          ? data
          : new Blob([data], { type: "application/pdf" }),
        exportFileName
      );

      setSaveMessage(`${label} exported to PDF.`);
    } catch (error) {
      setErrorMessage(await getBinaryRequestErrorMessage(error));
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDownloadArchive() {
    const cvHtml = getExportHtml("cvMarkdown");
    const coverLetterHtml = getExportHtml("coverLetterMarkdown");

    if (!cvHtml || !coverLetterHtml || !payload) {
      return;
    }

    const archiveFileName = formatArchiveFileName(payload.companyName);

    setIsArchiveExporting(true);
    setErrorMessage(null);
    setSaveMessage(null);

    try {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      const { data } = await api.post<Blob>(
        `/api/v1/applications/${ticketId}/archive`,
        {
          archiveName: archiveFileName,
          documents: [
            {
              html: cvHtml,
              fileName: formatPdfFileName(fullName, "cv"),
            },
            {
              html: coverLetterHtml,
              fileName: formatPdfFileName(fullName, "coverLetter"),
            },
          ],
        } satisfies ExportApplicationArchiveRequest,
        {
          headers: {
            Accept: "application/zip",
          },
          responseType: "blob",
        }
      );

      triggerBlobDownload(
        data instanceof Blob ? data : new Blob([data], { type: "application/zip" }),
        archiveFileName
      );

      setSaveMessage("CV and cover letter exported together.");
    } catch (error) {
      setErrorMessage(await getBinaryRequestErrorMessage(error));
    } finally {
      setIsArchiveExporting(false);
    }
  }

  function handleDeleteRequest() {
    setIsDeletePopupOpen(true);
  }

  function handleDeleteCancel() {
    if (isDeleting) {
      return;
    }

    setIsDeletePopupOpen(false);
  }

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await api.delete(`/api/v1/applications/${ticketId}`);
      setIsDeletePopupOpen(false);
      router.push("/applications");
      router.refresh();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setIsDeletePopupOpen(false);
      setIsDeleting(false);
    }
  }

  const currentMarkdown = drafts[activeDocument];
  const deferredMarkdown = useDeferredValue(currentMarkdown);
  const wordCount = countWords(currentMarkdown);
  const documentVariant =
    activeDocument === "cvMarkdown" ? "resume" : "coverLetter";
  const exportAwareMarkdown =
    isExporting || isArchiveExporting ? currentMarkdown : deferredMarkdown;
  const previewMarkdown =
    documentVariant === "resume"
      ? buildResumeMarkdownForPreview(exportAwareMarkdown, baseCv)
      : exportAwareMarkdown;
  const resumePreviewMarkdown = buildResumeMarkdownForPreview(
    drafts.cvMarkdown,
    baseCv
  );
  const resumeNeedsBaseCv =
    activeDocument === "cvMarkdown" &&
    !baseCv.trim() &&
    !isLegacyFinalResumeMarkdown(currentMarkdown);
  const hasUnsavedChanges =
    payload?.result?.cvMarkdown !== drafts.cvMarkdown ||
    payload?.result?.coverLetterMarkdown !== drafts.coverLetterMarkdown;
  const ticketTitle = payload
    ? formatTicketTitle(payload.ticketId, payload.companyName)
    : ticketId;
  const missingFullNameMessage =
    fullNameErrorMessage ??
    "Profile full name is unavailable, so cover letter preview and export filenames use fallbacks until it can be loaded.";

  if (!payload && isLoading) {
    return (
      <div className={`${styles.statePanel} ${styles.loadingState}`}>
        <div className={styles.panelContent}>
          <p className={styles.eyebrow}>Ticket {ticketId}</p>
          <h2 className={styles.title}>Loading markdown workspace...</h2>
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
        <div className={styles.panelContent}>
          <p className={styles.eyebrow}>Ticket {ticketId}</p>
          <h2 className={styles.title}>
            Could not load the application ticket.
          </h2>
          <p className={styles.bodyText}>{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (!payload) {
    return null;
  }

  return (
    <div className={styles.workspaceStack}>
      <section className={styles.summaryPanel}>
        <div className={styles.panelContent}>
          <div className={styles.cardHeadingRow}>
            <div>
              <p className={styles.eyebrow}>Ticket</p>
              <h2 className={styles.summaryTitle}>{ticketTitle}</h2>
            </div>
            <ApplicationStatusBadge status={payload.status} />
          </div>

          <dl className={styles.factsGrid}>
            <div>
              <dt>Created</dt>
              <dd>{new Date(payload.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{new Date(payload.updatedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Last error</dt>
              <dd>{payload.lastError ?? "none"}</dd>
            </div>
          </dl>

          <div className={styles.ticketBlock}>
            <p className={styles.statusLabel}>Company</p>
            <p className={styles.ticketBlockBody}>{payload.companyName}</p>
          </div>

          <div className={styles.ticketBlock}>
            <p className={styles.statusLabel}>Role brief</p>
            <p className={styles.ticketBlockBody}>
              {payload.vacancyDescription}
            </p>
          </div>

          {payload.result ? (
            <div className={styles.ticketBlock}>
              <p className={styles.statusLabel}>Personal note</p>
              <p className={styles.ticketBlockBody}>
                {payload.result.personalNote}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <div className={styles.sectionActions}>
        <p className={styles.note}>
          Refresh after the live workflow callback arrives, or keep editing the
          current markdown result below.
        </p>
        <div className={styles.actionRow}>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCcw size={16} />
            <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
          </button>
          <button
            className={styles.dangerButton}
            type="button"
            onClick={handleDeleteRequest}
            disabled={isDeleting}
          >
            <Trash2 size={16} />
            <span>{isDeleting ? "Deleting..." : "Delete Ticket"}</span>
          </button>
        </div>
      </div>

      {errorMessage ? (
        <p className={`${styles.note} ${styles.noteError}`} aria-live="polite">
          {errorMessage}
        </p>
      ) : null}

      {saveMessage ? (
        <p
          className={`${styles.note} ${styles.noteSuccess}`}
          aria-live="polite"
        >
          {saveMessage}
        </p>
      ) : null}

      {resumeNeedsBaseCv ? (
        <p className={`${styles.note} ${styles.noteError}`} aria-live="polite">
          {baseCvErrorMessage ??
            "Base CV is unavailable, so resume assembly falls back to raw markdown until it can be loaded."}
        </p>
      ) : null}

      {!fullName.trim() ? (
        <p className={`${styles.note} ${styles.noteError}`} aria-live="polite">
          {missingFullNameMessage}
        </p>
      ) : null}

      {!payload.result ? (
        <section className={styles.emptyPanel}>
          <p className={styles.eyebrow}>Result Pending</p>
          <h2 className={styles.emptyTitle}>
            No markdown result has been saved for this ticket yet.
          </h2>
          <p className={styles.emptyText}>
            Once the workflow posts back, this page will unlock the editor and
            PDF preview workspace.
          </p>
        </section>
      ) : (
        <>
          <section className={styles.workspaceGrid}>
            <div className={styles.editorPanel}>
              <div className={styles.panelContent}>
                <div className={styles.cardHeadingRow}>
                  <div>
                    <p className={styles.eyebrow}>Editor</p>
                    <h2 className={styles.title}>Markdown source</h2>
                  </div>
                  <span
                    className={`${styles.draftStateBadge} ${
                      hasUnsavedChanges ? styles.draftPending : styles.draftSynced
                    }`}
                  >
                    {hasUnsavedChanges ? "unsaved" : "synced"}
                  </span>
                </div>

                <div
                  className={styles.documentTabs}
                  role="tablist"
                  aria-label="Result documents"
                >
                  {(Object.keys(documentMeta) as DocumentKey[]).map((key) => (
                    <button
                      key={key}
                      className={`${styles.documentTab} ${
                        activeDocument === key ? styles.documentTabActive : ""
                      }`}
                      type="button"
                      role="tab"
                      aria-selected={activeDocument === key}
                      onClick={() =>
                        startTransition(() => {
                          setActiveDocument(key);
                        })
                      }
                    >
                      {documentMeta[key].label}
                    </button>
                  ))}
                </div>

                <div className={styles.editorMeta}>
                  <span>{wordCount} words</span>
                  <span>
                    {documentVariant === "resume"
                      ? "Resume preview"
                      : "Letterhead preview"}
                  </span>
                </div>

                <textarea
                  className={styles.markdownEditor}
                  value={currentMarkdown}
                  onChange={(event) => updateDraft(event.target.value)}
                  spellCheck={false}
                />

                <div className={styles.actionRow}>
                  <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                  >
                    <Save size={16} />
                    <span>{isSaving ? "Saving..." : "Save Markdown"}</span>
                  </button>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => void handleDownloadPdf()}
                    disabled={isExporting}
                  >
                    <Download size={16} />
                    <span>{isExporting ? "Exporting..." : "Download PDF"}</span>
                  </button>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => void handleDownloadArchive()}
                    disabled={isArchiveExporting}
                  >
                    <Files size={16} />
                    <span>
                      {isArchiveExporting ? "Bundling..." : "Download CV + Letter"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.previewPanel}>
              <div className={styles.panelContent}>
                <div className={styles.cardHeadingRow}>
                  <div>
                    <p className={styles.eyebrow}>Preview</p>
                    <h2 className={styles.title}>PDF-like document view</h2>
                  </div>
                  <span className={styles.previewChip}>
                    {documentMeta[activeDocument].label}
                  </span>
                </div>

                <div className={styles.previewCanvas}>
                  <div className={styles.previewSheetWrap}>
                    <div className={styles.previewSheetFrame}>
                      <MarkdownSheet
                        markdown={previewMarkdown}
                        variant={documentVariant}
                        fullName={fullName || undefined}
                        headerSubtitle={payload.companyName}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className={styles.exportCache} aria-hidden="true">
            <div className={styles.exportCacheFrame}>
              <MarkdownSheet
                ref={cvExportRef}
                markdown={resumePreviewMarkdown}
                variant="resume"
                fullName={fullName || undefined}
                headerSubtitle={payload.companyName}
              />
            </div>
            <div className={styles.exportCacheFrame}>
              <MarkdownSheet
                ref={coverLetterExportRef}
                markdown={drafts.coverLetterMarkdown}
                variant="coverLetter"
                fullName={fullName || undefined}
                headerSubtitle={payload.companyName}
              />
            </div>
          </div>
        </>
      )}

      <AlertPopup
        open={isDeletePopupOpen}
        title={`Delete ticket ${ticketId}?`}
        description="This permanently removes the ticket and its saved CV and cover letter markdown documents."
        confirmLabel={isDeleting ? "Deleting..." : "Delete ticket"}
        cancelLabel="Cancel"
        isBusy={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
