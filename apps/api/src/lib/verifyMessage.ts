// apps/api/src/lib/verifyMessage.ts
import type { SIWEPluginOptions } from "better-auth/plugins";
import { verifyMessage } from "viem";

type VerifyMessageArgs = Parameters<SIWEPluginOptions["verifyMessage"]>[0];

export default async function vm({
  message,
  signature,
  address,
}: VerifyMessageArgs): Promise<boolean> {
  try {
    return await verifyMessage({
      address: address as WalletAddress,
      message,
      signature: signature as WalletAddress,
    });
  } catch (_error) {
    return false;
  }
}
