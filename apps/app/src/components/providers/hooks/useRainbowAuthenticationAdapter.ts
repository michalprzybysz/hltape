// apps/app/src/components/providers/hooks/useRainbowAuthenticationAdapter.ts
"use client";

import { createAuthenticationAdapter } from "@rainbow-me/rainbowkit";
import * as Sentry from "@sentry/nextjs";
import { createSiweMessage, parseSiweMessage } from "viem/siwe";
import { getAccount } from "wagmi/actions";
import { config } from "@/components/providers/wagmi";
import { authClient } from "@/lib/auth";
import { BRAND_NAME } from "@/lib/brand";

// Shown verbatim by the wallet before the user signs, so it has to say what the signature
// actually does. It authenticates the address; it authorises no transaction and moves no funds.
const siweStatement = () =>
  `Sign in to ${BRAND_NAME} by proving you control this wallet address. This signature is free, authorises no transaction and moves no funds.`;

export default function useRainbowAuthenticationAdapter() {
  const adapter = createAuthenticationAdapter({
    getNonce: async () => {
      const { address, chainId } = getAccount(config);
      if (!address || !chainId) {
        const err = new Error("getNonce called before wallet connected");
        Sentry.captureException(err, { extra: { address, chainId } });
        throw err;
      }
      const { data, error } = await authClient.siwe.nonce({
        walletAddress: address,
        chainId,
      });
      if (error || !data?.nonce) {
        const err = new Error("Failed to fetch nonce");
        Sentry.captureException(err, { extra: { address, chainId, error } });
        throw err;
      }
      return data.nonce;
    },

    createMessage: ({ nonce, address, chainId }) =>
      createSiweMessage({
        domain: window.location.host,
        address,
        statement: siweStatement(),
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce,
      }),

    verify: async ({ message, signature }) => {
      const parsed = parseSiweMessage(message);
      const walletAddress = parsed.address;
      const msgChainId = parsed.chainId;
      if (!walletAddress || !msgChainId) {
        Sentry.captureException(new Error("SIWE message missing address or chainId"), {
          extra: { message },
        });
        return false;
      }
      const { data, error } = await authClient.siwe.verify({
        message,
        signature,
        walletAddress,
        chainId: msgChainId,
      });
      if (error || !data?.user) {
        Sentry.captureException(new Error("SIWE verify failed"), {
          extra: { reason: error?.message ?? "unknown", walletAddress },
        });
        return false;
      }
      authClient.$store.notify("$sessionSignal");
      return true;
    },

    signOut: async () => {
      await authClient.signOut();
    },
  });

  return adapter;
}
