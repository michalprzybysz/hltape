// apps/api/src/lib/executor/agentCache.ts
import * as crypto from "node:crypto";
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "../../db/schema";
import type { WorkerLogger } from "../logger/workerLogger";
import { captureError } from "../sentry";
import type { ColdAgent, HotAgent } from "../types";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function decrypt(encrypted: string, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");
  const buf = Buffer.from(encrypted, "hex");

  if (buf.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error("Invalid encrypted data");
  }

  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}

export class AgentCache {
  private readonly coldCache = new Map<string, ColdAgent>();
  private readonly hotCache = new Map<string, HotAgent>();
  private readonly logger: WorkerLogger;
  private readonly masterKeyHex: string;
  private readonly db: NodePgDatabase<typeof schema>;
  private readonly schema: typeof schema;

  constructor(
    logger: WorkerLogger,
    masterKeyHex: string,
    db: NodePgDatabase<typeof schema>,
    dbSchema: typeof schema,
  ) {
    this.logger = logger;
    this.masterKeyHex = masterKeyHex;
    this.db = db;
    this.schema = dbSchema;
  }

  async loadAll(): Promise<void> {
    // Ładujemy tylko agentów (klucze API), nie master wallety
    const agents = await this.db
      .select({
        userId: this.schema.agentWallet.userId,
        masterWalletAddress: this.schema.walletAddress.address,
        agentAddress: this.schema.agentWallet.agentAddress,
        encryptedPrivateKey: this.schema.agentWallet.encryptedPrivateKey,
      })
      .from(this.schema.agentWallet)
      .innerJoin(
        this.schema.walletAddress,
        eq(this.schema.agentWallet.masterWalletId, this.schema.walletAddress.id),
      )
      .where(eq(this.schema.agentWallet.isActive, true));

    for (const agent of agents) {
      this.coldCache.set(agent.userId, {
        masterWalletAddress: agent.masterWalletAddress,
        agentAddress: agent.agentAddress,
        encryptedPrivateKey: agent.encryptedPrivateKey,
      });
    }

    this.logger.info("Agent cache loaded", { count: this.coldCache.size });
  }

  async getAgent(userId: string): Promise<HotAgent | null> {
    const hot = this.hotCache.get(userId);
    if (hot) {
      hot.lastUsed = Date.now();
      return hot;
    }

    const cold = this.coldCache.get(userId);
    if (!cold) return null;

    try {
      const privateKey = decrypt(cold.encryptedPrivateKey, this.masterKeyHex);
      const { privateKeyToAccount } = await import("viem/accounts");
      const account = privateKeyToAccount(privateKey as `0x${string}`);

      const hotAgent: HotAgent = {
        masterWalletAddress: cold.masterWalletAddress,
        agentAddress: cold.agentAddress,
        account: { address: account.address, privateKey },
        lastUsed: Date.now(),
      };

      this.hotCache.set(userId, hotAgent);
      return hotAgent;
    } catch (err) {
      captureError(err, { userId, context: "decryptAgentKey" });
      this.logger.error("Failed to decrypt agent key", { userId, error: String(err) });
      return null;
    }
  }

  async refresh(userId: string): Promise<void> {
    const agent = await this.db
      .select({
        masterWalletAddress: this.schema.walletAddress.address,
        agentAddress: this.schema.agentWallet.agentAddress,
        encryptedPrivateKey: this.schema.agentWallet.encryptedPrivateKey,
      })
      .from(this.schema.agentWallet)
      .innerJoin(
        this.schema.walletAddress,
        eq(this.schema.agentWallet.masterWalletId, this.schema.walletAddress.id),
      )
      .where(eq(this.schema.agentWallet.userId, userId))
      .limit(1);

    if (agent[0]) {
      this.coldCache.set(userId, agent[0]);
      this.hotCache.delete(userId);
    }
  }

  invalidate(userId: string): void {
    this.hotCache.delete(userId);
  }

  clear(): void {
    this.coldCache.clear();
    this.hotCache.clear();
  }

  get coldSize(): number {
    return this.coldCache.size;
  }

  get hotSize(): number {
    return this.hotCache.size;
  }
}
