const defaultAppUrl = "http://localhost";

function getHostName(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export const appUrl = defaultAppUrl;

export function isAppHost(host: string | null | undefined) {
  if (!host) {
    return false;
  }

  return host.split(":")[0]?.toLowerCase() === getHostName(appUrl);
}

export function isMarketingHost(host: string | null | undefined) {
  if (!host) {
    return false;
  }
}

export function buildAppUrl(pathname = "/") {
  return new URL(pathname, `${appUrl}/`).toString();
}
