import {
  AxiosHeaders,
  isAxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";

type ApiErrorPayload = {
  message?: string | string[];
  error?: string;
};

type ApiResponseLike = Pick<AxiosResponse, "data" | "status" | "headers">;
type RequestConfigLike = Pick<AxiosRequestConfig, "baseURL" | "url">;

function getFallbackErrorMessage(error: unknown) {
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "Unknown error";
}

function getResponseHeader(
  headers: ApiResponseLike["headers"],
  headerName: string
) {
  if (!headers) {
    return null;
  }

  if (headers instanceof AxiosHeaders) {
    return headers.get(headerName);
  }

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === headerName.toLowerCase()) {
      return value;
    }
  }

  return null;
}

function readPayloadMessage(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const payload = data as ApiErrorPayload;

  if (Array.isArray(payload.message)) {
    return payload.message.join(", ");
  }

  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }

  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }

  return null;
}

function readTextMessage(data: unknown) {
  if (typeof data !== "string") {
    return null;
  }

  const text = data.trim();
  return text || null;
}

function isTimeoutError(error: {
  code?: string;
  message?: string;
}) {
  return (
    error.code === "ECONNABORTED" ||
    error.code === "ETIMEDOUT" ||
    error.message?.toLowerCase().includes("timeout") === true
  );
}

export function resolveRequestUrl(config: RequestConfigLike | undefined) {
  const baseURL = config?.baseURL?.trim();
  const url = config?.url?.trim();

  if (url) {
    try {
      return baseURL ? new URL(url, baseURL).toString() : url;
    } catch {
      return url;
    }
  }

  if (baseURL) {
    return baseURL;
  }

  return "the configured backend URL";
}

export function getErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const requestUrl = resolveRequestUrl(error.config);

    if (error.response) {
      return getResponseMessage(error.response);
    }

    if (isTimeoutError(error)) {
      const timeout = error.config?.timeout;

      if (typeof timeout === "number" && timeout > 0) {
        return `Request to ${requestUrl} timed out after ${timeout}ms.`;
      }

      return `Request to ${requestUrl} timed out.`;
    }

    if (error.request || error.code === "ERR_NETWORK") {
      return formatApiReachabilityError(requestUrl, error.cause ?? error);
    }

    return getFallbackErrorMessage(error);
  }

  return getFallbackErrorMessage(error);
}

export function getResponseMessage(response: ApiResponseLike) {
  const contentType = String(
    getResponseHeader(response.headers, "content-type") ?? ""
  );
  const payloadMessage = readPayloadMessage(response.data);

  if (contentType.includes("application/json") && payloadMessage) {
    return payloadMessage;
  }

  if (payloadMessage) {
    return payloadMessage;
  }

  const text = readTextMessage(response.data);
  if (text) {
    return text;
  }

  return `Request failed with HTTP ${response.status}`;
}

export function formatApiReachabilityError(url: string, error: unknown) {
  return `Backend is not reachable at ${url}. ${getFallbackErrorMessage(error)}`;
}
