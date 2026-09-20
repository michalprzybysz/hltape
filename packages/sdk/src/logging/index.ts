// packages/sdk/src/logs/index.ts
import type { HttpRequester } from "../httpClient";
import type { ExecutionLog, GetLogsParams } from "./types";

const DEFAULT_RESOURCE_PATH = "log" as const;

export interface LogsModuleOptions {
  resourcePath?: string;
}

export interface LogsModule {
  getAll: (params?: GetLogsParams) => Promise<ExecutionLog[]>;
  getById: (id: string) => Promise<ExecutionLog>;
}

export const createLogsModule = (
  request: HttpRequester,
  options: LogsModuleOptions = {},
): LogsModule => {
  const { resourcePath = DEFAULT_RESOURCE_PATH } = options;

  return {
    getAll: (params?: GetLogsParams) => {
      const searchParams = new URLSearchParams();

      if (params?.orderId) {
        searchParams.append("orderId", params.orderId);
      }
      if (params?.status) {
        searchParams.append("status", params.status);
      }
      if (params?.limit) {
        searchParams.append("limit", params.limit.toString());
      }

      const query = searchParams.toString();
      const url = query ? `${resourcePath}?${query}` : resourcePath;

      return request().get(url).json<ExecutionLog[]>();
    },
    getById: (id: string) => request().get(`${resourcePath}/${id}`).json<ExecutionLog>(),
  };
};

export type { ExecutionLog, ExecutionStatus, GetLogsParams } from "./types";
