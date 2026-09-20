// apps/api/src/lib/janitor/worker.ts

import type { MessagePort } from "node:worker_threads";
import { HttpTransport, InfoClient } from "@nktkas/hyperliquid";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { Observable, Subject } from "threads/observable";
import { expose } from "threads/worker";
import * as schema from "../../db/schema";
import { createWorkerLogger } from "../logger/workerLogger";
import { captureError, initWorkerSentry } from "../sentry";
import type { ZombieOrder } from "../types";
import { uuidToCloid } from "../utils/uuid";

const DATABASE_URL = process.env.DATABASE_URL;
const TESTNET = process.env.TESTNET === "true";

if (!DATABASE_URL) {
  throw new Error("[Janitor Worker] DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 2,
});
const db = drizzle(pool, { schema });

const transport = new HttpTransport({ isTestnet: TESTNET });
const infoClient = new InfoClient({ transport });

initWorkerSentry("Janitor");

const logger = createWorkerLogger("Janitor");

const closedOrders$ = new Subject<{
  orderId: string;
  userId: string;
}>();

const janitorApi = {
  async runCleanup(): Promise<{ checked: number; closed: number }> {
    try {
      const openOrdersData = await db
        .select({
          id: schema.order.id,
          userId: schema.order.userId,
          instrument: schema.order.instrument,
        })
        .from(schema.order)
        .where(eq(schema.order.status, "open"));

      if (openOrdersData.length === 0) {
        return { checked: 0, closed: 0 };
      }

      logger.debug(`Checking ${openOrdersData.length} open orders`);

      const ordersByUserId = new Map<string, typeof openOrdersData>();
      for (const order of openOrdersData) {
        if (!ordersByUserId.has(order.userId)) {
          ordersByUserId.set(order.userId, []);
        }
        const userOrders = ordersByUserId.get(order.userId);
        if (userOrders) {
          userOrders.push(order);
        }
      }

      const agentWallets = await db
        .select({
          userId: schema.agentWallet.userId,
          masterWalletId: schema.agentWallet.masterWalletId,
        })
        .from(schema.agentWallet)
        .where(eq(schema.agentWallet.isActive, true));

      const userToMasterWallet = new Map<string, string>();
      for (const aw of agentWallets) {
        userToMasterWallet.set(aw.userId, aw.masterWalletId);
      }

      const walletAddresses = await db
        .select({
          id: schema.walletAddress.id,
          address: schema.walletAddress.address,
        })
        .from(schema.walletAddress);

      const walletIdToAddress = new Map<string, string>();
      for (const wa of walletAddresses) {
        walletIdToAddress.set(wa.id, wa.address);
      }

      const ordersByWalletAddress = new Map<string, typeof openOrdersData>();
      for (const [userId, orders] of ordersByUserId.entries()) {
        const masterWalletId = userToMasterWallet.get(userId);
        if (!masterWalletId) continue;
        const address = walletIdToAddress.get(masterWalletId);
        if (!address) continue;

        if (!ordersByWalletAddress.has(address)) {
          ordersByWalletAddress.set(address, []);
        }
        const walletOrders = ordersByWalletAddress.get(address);
        if (walletOrders) {
          walletOrders.push(...orders);
        }
      }

      const zombies: ZombieOrder[] = [];

      for (const [masterWalletAddress, walletOrders] of ordersByWalletAddress.entries()) {
        try {
          const hlOpenOrders = await infoClient.openOrders({
            user: masterWalletAddress,
          });

          const activeCloids = new Set<string>();

          for (const o of hlOpenOrders) {
            if (o.cloid) {
              activeCloids.add(o.cloid.toLowerCase());
            }
          }

          logger.debug(
            `Wallet ${masterWalletAddress}: DB=${walletOrders.length} orders, HL=${hlOpenOrders.length} orders`,
            {
              hlOpenOrders: hlOpenOrders.length,
            },
          );

          for (const order of walletOrders) {
            const myCloid = uuidToCloid(order.id).toLowerCase();

            if (!activeCloids.has(myCloid)) {
              logger.debug(
                `Found zombie: Order ${order.id} (CLOID: ${myCloid}) in DB but not on HL`,
              );
              zombies.push({
                id: order.id,
                userId: order.userId,
              });
            }
          }
        } catch (err) {
          captureError(err, { wallet: masterWalletAddress, context: "checkWallet" });
          logger.error(`Error checking wallet ${masterWalletAddress}`, { err: String(err) });
        }
      }

      for (const zombie of zombies) {
        try {
          await db
            .update(schema.order)
            .set({
              status: "closed",
              trailing: false,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.order.id, zombie.id));

          logger.info(`🧟‍♂️ Zombie killed: Order ${zombie.id}`);

          closedOrders$.next({
            orderId: zombie.id,
            userId: zombie.userId,
          });
        } catch (err) {
          captureError(err, { orderId: zombie.id, context: "DB update zombie" });
          logger.error(`DB Update failed for ${zombie.id}`, { err: String(err) });
        }
      }

      return {
        checked: openOrdersData.length,
        closed: zombies.length,
      };
    } catch (err) {
      captureError(err, { context: "runCleanup" });
      logger.error("Fatal cleanup error", { err: String(err) });
      throw err;
    }
  },

  setLoggerPort(port: MessagePort) {
    logger.setPort(port);
    port.start();
  },

  /**
   * Observable stream of closed orders
   * Main thread subscribes to this to cleanup Brain/Dispatcher
   */
  events() {
    return Observable.from(closedOrders$);
  },
};

expose(janitorApi);
