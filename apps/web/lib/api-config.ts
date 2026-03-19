const defaultApiUrl = "http://api.localhost";

export function normalizeApiUrl(value: string | undefined) {
  const normalized = (value ?? defaultApiUrl)
    .replace(/\s+/g, "")
    .replace(/\/+$/, "");

  return normalized || defaultApiUrl;
}

export const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

export function buildApiUrl(path: string) {
  if (!path) {
    return apiUrl;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiUrl}${normalizedPath}`;
}
