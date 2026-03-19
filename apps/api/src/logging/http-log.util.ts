import { STATUS_CODES } from "node:http";

import { Logger } from "@nestjs/common";
import pc from "picocolors";

const MAX_LOG_BODY_LENGTH = 4000;
const EMPTY_BODY_PLACEHOLDER = "(empty)";

type HttpLogKind = "Inbound Request" | "Outgoing Request";

type HttpLogOptions = {
  logger: Logger;
  kind: HttpLogKind;
  method: string;
  address: string;
  query?: unknown;
  body?: unknown;
  statusCode: number;
  statusText?: string;
  durationMs: number;
  error?: string | null;
};

type AddressableRequest = {
  protocol?: string;
  originalUrl?: string;
  url?: string;
  get?: (name: string) => string | undefined;
};

export function buildRequestAddress(request: AddressableRequest): string {
  const path = getRequestPath(request);

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const forwardedProtocol = request.get?.("x-forwarded-proto")?.split(",")[0];
  const protocol = forwardedProtocol?.trim() || request.protocol?.trim();
  const host = request.get?.("host")?.trim();

  if (!protocol || !host) {
    return path;
  }

  return `${protocol}://${host}${path}`;
}

export function getRequestPath(request: Pick<AddressableRequest, "originalUrl" | "url">): string {
  const path = request.originalUrl ?? request.url ?? "/";

  return path.trim() || "/";
}

export function shouldSkipInboundRequestLogging(
  method: string,
  path: string
): boolean {
  const normalizedPath = path.split("?")[0] ?? path;

  return method.toUpperCase() === "GET" && normalizedPath === "/health";
}

export function logHttpExchange(input: HttpLogOptions): void {
  const resolvedError = resolveErrorMessage(input.error, input.statusCode);
  const message = formatHttpLogMessage(input, resolvedError);

  if (resolvedError) {
    input.logger.error(message);
    return;
  }

  input.logger.log(message);
}

function formatHttpLogMessage(
  input: HttpLogOptions,
  error: string | null
): string {
  const statusLine = `${input.statusCode} ${resolveStatusText(
    input.statusCode,
    input.statusText
  )}`;
  const lines = [
    pc.bold(pc.white(`[${input.kind}] ${input.method.toUpperCase()}`)),
    `${pc.cyan("Address:")} ${pc.white(input.address)}`,
    ...(typeof input.query === "undefined"
      ? []
      : [
          `${pc.cyan("Query:")}\n${indentMultiline(
            pc.white(formatValue(input.query))
          )}`,
        ]),
    `${pc.cyan("Body:")}\n${indentMultiline(pc.white(formatValue(input.body)))}`,
    `${pc.cyan("Status:")} ${colorizeStatus(statusLine, input.statusCode)}`,
    `${pc.cyan("Duration:")} ${pc.white(`${input.durationMs} ms`)}`,
  ];

  if (error) {
    lines.push(`${pc.red("Error:")} ${pc.red(error)}`);
  }

  return lines.join("\n");
}

function resolveStatusText(statusCode: number, statusText?: string): string {
  const normalizedStatusText =
    statusText?.trim() || STATUS_CODES[statusCode] || "Unknown Status";

  return normalizedStatusText;
}

function colorizeStatus(statusLine: string, statusCode: number): string {
  if (statusCode >= 500) {
    return pc.red(statusLine);
  }

  if (statusCode >= 400) {
    return pc.yellow(statusLine);
  }

  if (statusCode >= 300) {
    return pc.cyan(statusLine);
  }

  return pc.green(statusLine);
}

function formatValue(value: unknown): string {
  if (value == null) {
    return EMPTY_BODY_PLACEHOLDER;
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (!normalized) {
      return EMPTY_BODY_PLACEHOLDER;
    }

    return truncateBody(tryFormatJsonString(value));
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  const serialized = JSON.stringify(value, createCircularReplacer(), 2);

  if (!serialized) {
    return EMPTY_BODY_PLACEHOLDER;
  }

  return truncateBody(serialized);
}

function tryFormatJsonString(value: string): string {
  try {
    const parsed = JSON.parse(value);

    if (typeof parsed === "object" && parsed !== null) {
      return JSON.stringify(parsed, createCircularReplacer(), 2) ?? value;
    }
  } catch {
    // Preserve the original string when it is not JSON.
  }

  return value;
}

function truncateBody(value: string): string {
  if (value.length <= MAX_LOG_BODY_LENGTH) {
    return value;
  }

  const hiddenLength = value.length - MAX_LOG_BODY_LENGTH;

  return `${value.slice(0, MAX_LOG_BODY_LENGTH).trimEnd()}\n... [truncated ${hiddenLength} characters]`;
}

function createCircularReplacer() {
  const seen = new WeakSet<object>();

  return (_key: string, value: unknown) => {
    if (typeof value !== "object" || value === null) {
      return value;
    }

    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);
    return value;
  };
}

function resolveErrorMessage(
  error: string | null | undefined,
  statusCode: number
): string | null {
  const normalizedError = error?.trim();

  if (normalizedError) {
    return normalizedError;
  }

  if (statusCode >= 400) {
    return `Request failed with HTTP ${statusCode}.`;
  }

  return null;
}

function indentMultiline(value: string): string {
  return value
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}
