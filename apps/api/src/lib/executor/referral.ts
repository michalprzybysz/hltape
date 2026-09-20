// apps/api/src/lib/executor/referral.ts
import { ExchangeClient, type HttpTransport, type InfoClient } from "@nktkas/hyperliquid";
import type { ReferralCode } from "../config";
import type { WorkerLogger } from "../logger/workerLogger";
import type { HotAgent, ReferralResponse } from "../types";

/**
 * Links new users to a Hyperliquid referral code on their first successful order.
 * Entirely optional: when no REFERRAL_CODE is configured this service no-ops.
 */
export class ReferralService {
  private readonly transport: HttpTransport;
  private readonly infoClient: InfoClient;
  private readonly referralCode: ReferralCode;
  private readonly logger: WorkerLogger;
  private readonly isTestnet: boolean;

  constructor(
    transport: HttpTransport,
    infoClient: InfoClient,
    referralCode: ReferralCode,
    logger: WorkerLogger,
    isTestnet: boolean,
  ) {
    this.transport = transport;
    this.infoClient = infoClient;
    this.referralCode = referralCode;
    this.logger = logger;
    this.isTestnet = isTestnet;
  }

  async ensureReferral(userId: string, agent: HotAgent): Promise<void> {
    // No referral code configured -> nothing to link.
    if (!this.referralCode) return;

    try {
      // @ts-expect-error referralState is not typed in the SDK
      const state = (await this.infoClient.referralState({
        user: agent.masterWalletAddress,
      })) as ReferralResponse;

      if (state.referredBy) return;

      const { privateKeyToAccount } = await import("viem/accounts");
      const account = privateKeyToAccount(agent.account.privateKey as `0x${string}`);
      const client = new ExchangeClient({
        transport: this.transport,
        wallet: account,
        isTestnet: this.isTestnet,
      });

      // @ts-expect-error customAction is not typed in the SDK
      await client.customAction({ type: "referral", code: this.referralCode });
      this.logger.info("Referral linked", { userId });
    } catch (err) {
      this.logger.debug("Referral linking failed", { userId, error: String(err) });
    }
  }
}
