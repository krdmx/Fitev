import MarkdownPreview from "@uiw/react-markdown-preview";
import { forwardRef, memo } from "react";
import styles from "./markdown-sheet.module.css";

export type MarkdownSheetVariant = "coverLetter" | "resume";

type MarkdownSheetProps = {
  title?: string;
  subtitle?: string;
  markdown: string;
  variant?: MarkdownSheetVariant;
  fullName?: string;
  headerSubtitle?: string;
};

const LETTER_CLOSINGS = new Set([
  "best",
  "best regards",
  "kind regards",
  "regards",
  "respectfully",
  "sincerely",
  "thank you",
  "thanks",
]);

function normalizeInlineText(value: string) {
  return value
    .replace(/[*_~`]/g, "")
    .replace(/\[[^\]]+\]\([^)]+\)/g, "")
    .trim()
    .toLowerCase()
    .replace(/[,:;.!]+$/g, "");
}

function normalizeCoverLetterMarkdown(markdown: string, fullName?: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  while (lines[0]?.trim() === "") {
    lines.shift();
  }

  if (lines[0]?.trim().startsWith("#")) {
    lines.shift();

    while (lines[0]?.trim() === "") {
      lines.shift();
    }
  }

  while (lines.at(-1)?.trim() === "") {
    lines.pop();
  }

  const normalizedFullName = fullName ? normalizeInlineText(fullName) : "";

  while (lines.length > 0) {
    const lastLine = lines.at(-1)?.trim() ?? "";

    if (!lastLine) {
      lines.pop();
      continue;
    }

    const normalizedLastLine = normalizeInlineText(lastLine);

    if (LETTER_CLOSINGS.has(normalizedLastLine)) {
      lines.pop();
      continue;
    }

    const previousLine = lines.at(-2)?.trim() ?? "";

    if (
      normalizedFullName &&
      normalizedLastLine === normalizedFullName &&
      LETTER_CLOSINGS.has(normalizeInlineText(previousLine))
    ) {
      lines.pop();
      lines.pop();
      continue;
    }

    break;
  }

  return lines.join("\n").trim();
}

const EXPORT_ROOT_CLASS = "markdown-sheet-export-root";

const MARKDOWN_SHEET_EXPORT_CSS = `
  @page {
    size: A4;
    margin: 0;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: #fff;
  }

  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .${EXPORT_ROOT_CLASS} {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #1f2937;
  }

  .${EXPORT_ROOT_CLASS},
  .${EXPORT_ROOT_CLASS} *,
  .${EXPORT_ROOT_CLASS} *::before,
  .${EXPORT_ROOT_CLASS} *::after {
    box-sizing: border-box;
  }

  .${EXPORT_ROOT_CLASS} .${styles.sheet} {
    width: 210mm;
    min-height: 297mm;
    background: #fff;
  }

  .${EXPORT_ROOT_CLASS} .${styles.markdownPreview} {
    color: inherit;
    background: transparent;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    overflow-wrap: anywhere;
  }

  .${EXPORT_ROOT_CLASS} .${styles.markdownPreview} > :first-child {
    margin-top: 0;
  }

  .${EXPORT_ROOT_CLASS} .${styles.markdownPreview} > :last-child {
    margin-bottom: 0;
  }

  .${EXPORT_ROOT_CLASS} .${styles.markdownPreview} img {
    max-width: 100%;
  }

  .${EXPORT_ROOT_CLASS} .${styles.markdownPreview} code,
  .${EXPORT_ROOT_CLASS} .${styles.markdownPreview} pre {
    font-family:
      "SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
  }

  .${EXPORT_ROOT_CLASS} .${styles.markdownPreview} pre {
    overflow: auto;
    padding: 0.85rem 1rem;
    border-radius: 12px;
    background: #f6f7f9;
  }

  .${EXPORT_ROOT_CLASS} .${styles.markdownPreview} code {
    font-size: 0.92em;
  }

  .${EXPORT_ROOT_CLASS} .${styles.resumeSheet} {
    padding: 20mm 16mm 18mm;
    color: #1f2937;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    line-height: 1.45;
  }

  .${EXPORT_ROOT_CLASS} .${styles.sheetBody} > :first-child {
    margin-top: 0;
  }

  .${EXPORT_ROOT_CLASS} .${styles.resumeBody} {
    color: #1f2937;
    font-size: 12px;
    line-height: 1.45;
  }

  .${EXPORT_ROOT_CLASS} .${styles.resumeBody} .${styles.markdownPreview} h1 {
    margin: 0 0 4px;
    color: #000;
    text-align: center;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 22px;
    letter-spacing: 0.5px;
  }

  .${EXPORT_ROOT_CLASS} .${styles.resumeBody} .${styles.markdownPreview} h1 + p {
    margin: 0 0 10px;
    color: #444;
    text-align: center;
    font-size: 11px;
  }

  .${EXPORT_ROOT_CLASS} .${styles.resumeBody} .${styles.markdownPreview} h2,
  .${EXPORT_ROOT_CLASS} .${styles.resumeBody} .${styles.markdownPreview} h3 {
    margin: 10px 0 4px;
    padding-bottom: 2px;
    border-bottom: 1px solid #333;
    color: #111;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    text-transform: uppercase;
  }

  .${EXPORT_ROOT_CLASS} .${styles.resumeBody} .${styles.markdownPreview} p {
    margin: 2px 0;
  }

  .${EXPORT_ROOT_CLASS} .${styles.resumeBody} .${styles.markdownPreview} ul,
  .${EXPORT_ROOT_CLASS} .${styles.resumeBody} .${styles.markdownPreview} ol {
    margin: 4px 0 8px;
    padding-left: 20px;
  }

  .${EXPORT_ROOT_CLASS} .${styles.resumeBody} .${styles.markdownPreview} li {
    margin-bottom: 3px;
  }

  .${EXPORT_ROOT_CLASS} .${styles.resumeBody} .${styles.markdownPreview} hr {
    margin: 10px 0;
    border: 0;
    border-top: 1px solid #ddd;
  }

  .${EXPORT_ROOT_CLASS} .${styles.resumeBody} .${styles.markdownPreview} a {
    color: #0056b3;
    text-decoration: none;
  }

  .${EXPORT_ROOT_CLASS} .${styles.resumeBody} .${styles.markdownPreview} strong {
    color: #000;
    font-weight: 600;
  }

  .${EXPORT_ROOT_CLASS} .${styles.coverLetterSheet} {
    padding: 22mm 18mm 20mm;
    color: #1f2937;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 13.5px;
    line-height: 1.6;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterHeader} {
    margin-bottom: 28px;
    padding-bottom: 14px;
    border-bottom: 2px solid #2c3e50;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterName} {
    margin: 0;
    color: #111;
    font-size: 24px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterHeaderSubtitle} {
    margin: 5px 0 0;
    color: #555;
    font-size: 12px;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterBody} {
    color: #1f2937;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} > :first-child {
    margin-top: 0;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} h1,
  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} h2,
  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} h3,
  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} h4 {
    margin: 1.5rem 0 0.85rem;
    color: #111;
    font-family: inherit;
    letter-spacing: normal;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} h1 {
    font-size: 1.5rem;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} h2 {
    font-size: 1.25rem;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} h3,
  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} h4 {
    font-size: 1.05rem;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} p {
    margin: 0 0 12px;
    text-align: justify;
    text-indent: 2.5em;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} > p:first-of-type {
    text-indent: 0;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} ul,
  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} ol,
  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} blockquote,
  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} pre,
  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} table {
    margin: 0 0 12px;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} ul,
  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} ol {
    padding-left: 1.4rem;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} li + li {
    margin-top: 0.35rem;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} blockquote {
    margin-left: 0;
    padding-left: 1rem;
    border-left: 3px solid rgba(44, 62, 80, 0.18);
    color: #555;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} hr {
    margin: 1.4rem 0;
    border: 0;
    border-top: 1px solid rgba(44, 62, 80, 0.18);
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} table {
    width: 100%;
    border-collapse: collapse;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} th,
  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} td {
    padding: 0.55rem 0.7rem;
    border: 1px solid rgba(44, 62, 80, 0.18);
    text-align: left;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} a {
    color: #0066cc;
    text-decoration: none;
  }

  .${EXPORT_ROOT_CLASS} .${styles.letterBody} .${styles.markdownPreview} strong {
    color: #000;
  }

  .${EXPORT_ROOT_CLASS} .${styles.signOff} {
    margin-top: 28px;
  }

  .${EXPORT_ROOT_CLASS} .${styles.signOff} p {
    margin: 0 0 5px;
    text-indent: 0;
  }

  .${EXPORT_ROOT_CLASS} .${styles.signOffName} {
    margin-top: 20px;
  }
`;

export function buildMarkdownSheetExportHtml(contentHtml: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <style>${MARKDOWN_SHEET_EXPORT_CSS}</style>
  </head>
  <body>
    <div class="${EXPORT_ROOT_CLASS}">
      ${contentHtml}
    </div>
  </body>
</html>`.trim();
}

const MarkdownSheetImpl = forwardRef<HTMLElement, MarkdownSheetProps>(
  function MarkdownSheet(
    {
      title,
      subtitle,
      markdown,
      variant = "coverLetter",
      fullName,
      headerSubtitle,
    },
    ref
  ) {
    const isResume = variant === "resume";

    if (isResume) {
      return (
        <article ref={ref} className={`${styles.sheet} ${styles.resumeSheet}`}>
          <div className={`${styles.sheetBody} ${styles.resumeBody}`}>
            <MarkdownPreview
              className={styles.markdownPreview}
              disableCopy
              source={markdown}
              wrapperElement={{ "data-color-mode": "light" }}
            />
          </div>
        </article>
      );
    }

    const normalizedMarkdown = normalizeCoverLetterMarkdown(markdown, fullName);

    return (
      <article
        ref={ref}
        className={`${styles.sheet} ${styles.coverLetterSheet}`}
      >
        <header className={styles.letterHeader}>
          <h1 className={styles.letterName}>
            {fullName ?? title ?? "Cover Letter"}
          </h1>
          {(headerSubtitle ?? subtitle) ? (
            <p className={styles.letterHeaderSubtitle}>
              {headerSubtitle ?? subtitle}
            </p>
          ) : null}
        </header>

        <div className={styles.letterBody}>
          <MarkdownPreview
            className={styles.markdownPreview}
            disableCopy
            source={normalizedMarkdown}
            wrapperElement={{ "data-color-mode": "light" }}
          />
        </div>

        <footer className={styles.signOff}>
          <p>Sincerely,</p>
          <p className={styles.signOffName}>
            <strong>{fullName ?? title ?? "Candidate"}</strong>
          </p>
        </footer>
      </article>
    );
  }
);

MarkdownSheetImpl.displayName = "MarkdownSheet";

export const MarkdownSheet = memo(MarkdownSheetImpl);
MarkdownSheet.displayName = "Memo(MarkdownSheet)";
