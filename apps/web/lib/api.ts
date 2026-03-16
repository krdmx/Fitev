"use client";

const fallbackApiUrl = "http://api.localhost";

export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? fallbackApiUrl;

export function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown error";
}

export async function getResponseMessage(response: Response) {
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

export async function requestJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, init);

  if (!response.ok) {
    throw new Error(await getResponseMessage(response));
  }

  return (await response.json()) as T;
}
