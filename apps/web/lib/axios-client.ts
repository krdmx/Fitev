import axios, {
  AxiosHeaders,
  type AxiosRequestConfig,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

import { apiUrl } from "@/lib/api-config";
import { resolveRequestUrl } from "@/lib/api-response";

type CreateApiClientOptions = {
  adapter?: AxiosRequestConfig["adapter"];
  lookup?: AxiosRequestConfig["lookup"];
  noStoreGetRequests?: boolean;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

function shouldLogHttpTraffic() {
  return process.env.NODE_ENV === "development";
}

function getMethodLabel(method: string | undefined) {
  return (method ?? "get").toUpperCase();
}

function prepareHeaders(config: InternalAxiosRequestConfig) {
  const headers = AxiosHeaders.from(config.headers);

  if (isPlainObject(config.data) && !headers.hasContentType()) {
    headers.setContentType("application/json");
  }

  config.headers = headers;
}

function prepareFetchOptions(
  config: InternalAxiosRequestConfig,
  options: CreateApiClientOptions
) {
  const fetchOptions = { ...(config.fetchOptions ?? {}) };

  if (options.noStoreGetRequests && getMethodLabel(config.method) === "GET") {
    fetchOptions.cache ??= "no-store";
  }

  if (Object.keys(fetchOptions).length > 0) {
    config.fetchOptions = fetchOptions;
  }
}

function logRequest(config: InternalAxiosRequestConfig) {
  if (!shouldLogHttpTraffic()) {
    return;
  }

  console.warn(`[api] ${getMethodLabel(config.method)} ${resolveRequestUrl(config)}`);
}

export function createApiClient(
  options: CreateApiClientOptions = {}
): AxiosInstance {
  const client = axios.create({
    adapter: options.adapter ?? "fetch",
    baseURL: apiUrl,
    timeout: 30_000,
    withCredentials: false,
    headers: {
      Accept: "application/json",
    },
    lookup: options.lookup,
  });

  client.interceptors.request.use(
    (config) => {
      prepareHeaders(config);
      prepareFetchOptions(config, options);
      logRequest(config);
      return config;
    },
    (error) => Promise.reject(error),
    { synchronous: true }
  );

  client.interceptors.response.use(
    (response) => {
      if (shouldLogHttpTraffic()) {
        console.warn(
          `[api] ${response.status} ${getMethodLabel(response.config.method)} ${resolveRequestUrl(
            response.config
          )}`
        );
      }

      return response;
    },
    (error) => {
      const method = getMethodLabel(error.config?.method);
      const requestUrl = resolveRequestUrl(error.config);
      const statusPrefix =
        typeof error.response?.status === "number"
          ? `${error.response.status} `
          : "";

      console.error(`[api] ${statusPrefix}${method} ${requestUrl}`, error);
      return Promise.reject(error);
    }
  );

  return client;
}
