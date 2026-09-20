// packages/sdk/src/positions/index.ts
import type { HttpRequester } from "../httpClient";
import type { OpenPositionRequest, OpenPositionResponse, PositionsResponse } from "./types";

const DEFAULT_RESOURCE_PATH = "positions" as const;

export interface PositionsModuleOptions {
  resourcePath?: string;
}

export interface PositionsModule {
  getAll: () => Promise<PositionsResponse>;
  open: (data: OpenPositionRequest) => Promise<OpenPositionResponse>;
}

export const createPositionsModule = (
  request: HttpRequester,
  options: PositionsModuleOptions = {},
): PositionsModule => {
  const { resourcePath = DEFAULT_RESOURCE_PATH } = options;

  return {
    getAll: () => request().get(resourcePath).json<PositionsResponse>(),
    open: (data: OpenPositionRequest) =>
      request().post(resourcePath, { json: data }).json<OpenPositionResponse>(),
  };
};

export type {
  AccountSummary,
  Leverage,
  MarginMode,
  OpenPositionRequest,
  OpenPositionResponse,
  Position,
  PositionsResponse,
  Side,
} from "./types";
export { SIDES } from "./types";
