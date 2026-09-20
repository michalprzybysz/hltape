// apps/api/src/plugins/assets.ts
import { HttpTransport, InfoClient } from "@nktkas/hyperliquid";
import fp from "fastify-plugin";
import { logger } from "../lib/logger";

export interface AssetService {
  getIndex(symbol: string): number;
  getSymbol(index: number): string;
  hasSymbol(symbol: string): boolean;
  refresh(): Promise<void>;
  size(): number;
}

declare module "fastify" {
  interface FastifyInstance {
    assets: AssetService;
  }
}

export default fp(
  async (fastify) => {
    const symbolToIndex = new Map<string, number>();
    const indexToSymbol = new Map<number, string>();

    const isTestnet = process.env.TESTNET === "true";
    const client = new InfoClient({
      transport: new HttpTransport({ isTestnet }),
    });

    const refreshMeta = async (): Promise<void> => {
      try {
        logger.debug("[Assets] Refreshing Hyperliquid metadata...");
        const meta = await client.meta();

        symbolToIndex.clear();
        indexToSymbol.clear();

        for (let i = 0; i < meta.universe.length; i++) {
          const asset = meta.universe[i];
          symbolToIndex.set(asset.name, i);
          indexToSymbol.set(i, asset.name);
        }

        logger.info("[Assets] Loaded assets", { count: symbolToIndex.size });
      } catch (err) {
        logger.error("[Assets] Failed to load metadata", { err: String(err) });
        throw err; // Fail startup if we can't load assets
      }
    };

    await refreshMeta();

    const refreshInterval = setInterval(
      () => {
        refreshMeta().catch((err) => {
          logger.error("[Assets] Periodic refresh failed", { err: String(err) });
        });
      },
      60 * 60 * 1000,
    );

    fastify.addHook("onClose", () => {
      clearInterval(refreshInterval);
    });

    const service: AssetService = {
      getIndex(symbol: string): number {
        const idx = symbolToIndex.get(symbol);
        if (idx === undefined) {
          throw new Error(`Unknown asset symbol: ${symbol}`);
        }
        return idx;
      },

      getSymbol(index: number): string {
        return indexToSymbol.get(index) ?? "UNKNOWN";
      },

      hasSymbol(symbol: string): boolean {
        return symbolToIndex.has(symbol);
      },

      refresh: refreshMeta,

      size(): number {
        return symbolToIndex.size;
      },
    };

    fastify.decorate("assets", service);
  },
  { name: "assets", dependencies: ["logger"] },
);
