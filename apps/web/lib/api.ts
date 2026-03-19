"use client";

import { apiUrl } from "@/lib/api-config";
import { getErrorMessage } from "@/lib/api-response";
import { createApiClient } from "@/lib/axios-client";

export { apiUrl, getErrorMessage };

export const api = createApiClient({
  adapter: "fetch",
  noStoreGetRequests: false,
});
