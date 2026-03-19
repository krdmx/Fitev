"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import styles from "./alert-popup.module.css";

type AlertPopupTone = "danger" | "default";

export function AlertPopup({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  isBusy,
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  isBusy: boolean;
  tone?: AlertPopupTone;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !isMounted) {
      return;
    }

    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    const frameId = window.requestAnimationFrame(() => {
      cancelButtonRef.current?.focus();
    });

    document.body.style.overflow = "hidden";

    return () => {
      window.cancelAnimationFrame(frameId);
      document.body.style.overflow = previousOverflow;

      const previouslyFocusedElement = previouslyFocusedElementRef.current;

      if (
        previouslyFocusedElement &&
        document.contains(previouslyFocusedElement)
      ) {
        previouslyFocusedElement.focus();
      }

      previouslyFocusedElementRef.current = null;
    };
  }, [isMounted, open]);

  useEffect(() => {
    if (!open || !isMounted) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || isBusy) {
        return;
      }

      event.preventDefault();
      onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBusy, isMounted, onCancel, open]);

  if (!open || !isMounted) {
    return null;
  }

  return createPortal(
    <div
      className={styles.overlay}
      onClick={(event) => {
        if (event.target !== event.currentTarget || isBusy) {
          return;
        }

        onCancel();
      }}
    >
      <section
        className={styles.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className={styles.content}>
          <p className={styles.eyebrow}>Confirm action</p>
          <h2 className={styles.title} id={titleId}>
            {title}
          </h2>
          <p className={styles.description} id={descriptionId}>
            {description}
          </p>
        </div>

        <div className={styles.actions}>
          <button
            ref={cancelButtonRef}
            className={styles.cancelButton}
            type="button"
            onClick={onCancel}
            disabled={isBusy}
          >
            {cancelLabel}
          </button>
          <button
            className={`${styles.confirmButton} ${
              tone === "danger" ? styles.confirmButtonDanger : ""
            }`}
            type="button"
            onClick={() => void onConfirm()}
            disabled={isBusy}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
}
