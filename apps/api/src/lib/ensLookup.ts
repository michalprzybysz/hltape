// apps/api/src/lib/ensLookup.ts

import type { SIWEPluginOptions } from "better-auth/plugins";
import makeBlockie from "ethereum-blockies-base64";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

type EnsLookupFn = NonNullable<SIWEPluginOptions["ensLookup"]>;
type ENSLookupArgs = Parameters<EnsLookupFn>[0];
type ENSLookupResult = Awaited<ReturnType<EnsLookupFn>>;

export default async function ensLookup({
  walletAddress,
}: ENSLookupArgs): Promise<ENSLookupResult> {
  const avatar = makeBlockie(walletAddress);
  try {
    const client = createPublicClient({
      chain: mainnet,
      transport: http(),
    });
    const ensName = await client.getEnsName({
      address: walletAddress as WalletAddress,
    });
    const ensAvatar = ensName
      ? await client.getEnsAvatar({
          name: ensName,
        })
      : null;
    return {
      name: ensName || "",
      avatar: ensAvatar || avatar,
    };
  } catch {
    return {
      name: "",
      avatar: avatar,
    };
  }
}
