// packages/sdk/src/httpClient.ts
import ky, { type HTTPError, type KyInstance, type Options } from "ky";

export interface HttpClientConfig {
  baseUrl: string;
  hooks?: Options["hooks"];
}

export interface HttpClientFactory {
  getClient: () => KyInstance;
}

const sanitizeBaseUrl = (url: string): string => url.replace(/\/+$/, "");

const createHeaders = () => ({
  Accept: "application/json",
});

/**
 * Extract error message from API response body
 */
const extractErrorMessage = async (error: HTTPError): Promise<HTTPError> => {
  try {
    const body = (await error.response.json()) as { message?: string };
    if (body.message) {
      error.message = body.message;
    }
  } catch {
    // Response is not JSON, keep original message
  }
  return error;
};

export const createHttpClient = ({ baseUrl, hooks }: HttpClientConfig): HttpClientFactory => {
  if (!baseUrl) {
    throw new Error("Base URL is required to create the HTTP client.");
  }

  // Merge user hooks with default error handling
  const mergedHooks: Options["hooks"] = {
    ...hooks,
    beforeError: [extractErrorMessage, ...(hooks?.beforeError ?? [])],
  };

  const client = ky.create({
    prefixUrl: sanitizeBaseUrl(baseUrl),
    headers: createHeaders(),
    credentials: "include",
    hooks: mergedHooks,
  });

  const getClient = () => client;

  return {
    getClient,
  };
};

export type HttpRequester = () => KyInstance;
