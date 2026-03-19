import type { ExportApplicationArchiveDocumentRequest } from "@repo/contracts";
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { zipSync } from "fflate";

type RenderApplicationPdfInput = {
  ticketId: string;
  html: string;
  fileName: string;
};

type RenderApplicationArchiveInput = {
  ticketId: string;
  archiveName: string;
  documents: ExportApplicationArchiveDocumentRequest[];
};

function sanitizeBaseName(value: string, extension: string, fallback: string) {
  const trimmed = value.trim();
  const withoutExtension = trimmed.replace(
    new RegExp(`\\.${extension}$`, "i"),
    ""
  );
  const sanitized = Array.from(withoutExtension)
    .map((character) => {
      const codePoint = character.charCodeAt(0);

      if (codePoint < 32 || /[<>:"/\\|?*]/.test(character)) {
        return " ";
      }

      return character;
    })
    .join("")
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "")
    .trim();

  return `${sanitized || fallback}.${extension}`;
}

function sanitizePdfFileName(value: string) {
  return sanitizeBaseName(value, "pdf", "application");
}

function sanitizeZipFileName(value: string) {
  return sanitizeBaseName(value, "zip", "documents");
}

function normalizeGotenbergUrl(value: string | undefined) {
  return (value ?? "http://gotenberg:3000").trim().replace(/\/+$/, "");
}

@Injectable()
export class PdfService {
  private readonly gotenbergUrl = normalizeGotenbergUrl(
    process.env.GOTENBERG_URL
  );

  async renderApplicationPdf(input: RenderApplicationPdfInput) {
    return this.renderPdfDocument(input);
  }

  async renderApplicationArchive(input: RenderApplicationArchiveInput) {
    if (!Array.isArray(input.documents) || input.documents.length === 0) {
      throw new BadRequestException(
        "Archive export must include at least one document."
      );
    }

    const renderedDocuments = await Promise.all(
      input.documents.map((document) =>
        this.renderPdfDocument({
          ticketId: input.ticketId,
          html: document.html,
          fileName: document.fileName,
        })
      )
    );

    const archiveEntries = Object.fromEntries(
      renderedDocuments.map((document) => [
        document.fileName,
        new Uint8Array(document.buffer),
      ])
    );

    return {
      buffer: Buffer.from(zipSync(archiveEntries)),
      fileName: sanitizeZipFileName(input.archiveName || `${input.ticketId}.zip`),
    };
  }

  private async renderPdfDocument(input: RenderApplicationPdfInput) {
    const html = input.html.trim();

    if (!html) {
      throw new BadRequestException("PDF export HTML must not be empty.");
    }

    const fileName = sanitizePdfFileName(
      input.fileName || `${input.ticketId}-document.pdf`
    );
    const form = new FormData();

    form.append(
      "files",
      new Blob([html], { type: "text/html;charset=utf-8" }),
      "index.html"
    );
    form.set("printBackground", "true");
    form.set("preferCssPageSize", "true");
    form.set("emulatedMediaType", "screen");

    let response: Response;

    try {
      response = await fetch(
        `${this.gotenbergUrl}/forms/chromium/convert/html`,
        {
          method: "POST",
          body: form,
          signal: AbortSignal.timeout(45_000),
        }
      );
    } catch (error) {
      throw new ServiceUnavailableException(
        `Gotenberg is not reachable at ${this.gotenbergUrl}. ${
          error instanceof Error ? error.message : "Unknown connection error."
        }`
      );
    }

    if (!response.ok) {
      const message = (await response.text()).trim();

      throw new BadGatewayException(
        message || `Gotenberg returned HTTP ${response.status}.`
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (buffer.length === 0) {
      throw new BadGatewayException(
        "Gotenberg returned an empty PDF document."
      );
    }

    return {
      buffer,
      fileName,
    };
  }
}
