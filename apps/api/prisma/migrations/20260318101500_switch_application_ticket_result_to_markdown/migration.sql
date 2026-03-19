ALTER TABLE "ApplicationTicketResult"
ADD COLUMN "cvMarkdown" TEXT,
ADD COLUMN "coverLetterMarkdown" TEXT;

UPDATE "ApplicationTicketResult"
SET
  "cvMarkdown" = '# Legacy Imported CV

This ticket result predates markdown storage.

The original PDF is no longer available in editable form.',
  "coverLetterMarkdown" = '# Legacy Imported Cover Letter

This ticket result predates markdown storage.

The original PDF is no longer available in editable form.'
WHERE "cvMarkdown" IS NULL
   OR "coverLetterMarkdown" IS NULL;

ALTER TABLE "ApplicationTicketResult"
ALTER COLUMN "cvMarkdown" SET NOT NULL,
ALTER COLUMN "coverLetterMarkdown" SET NOT NULL;

ALTER TABLE "ApplicationTicketResult"
DROP COLUMN "cvPdf",
DROP COLUMN "cvFileName",
DROP COLUMN "cvMimeType",
DROP COLUMN "coverLetterPdf",
DROP COLUMN "coverLetterFileName",
DROP COLUMN "coverLetterMimeType";
