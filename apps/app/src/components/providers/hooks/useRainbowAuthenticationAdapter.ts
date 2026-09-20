// apps/app/src/components/providers/hooks/useRainbowAuthenticationAdapter.ts
"use client";

import { createAuthenticationAdapter } from "@rainbow-me/rainbowkit";
import * as Sentry from "@sentry/nextjs";
import { createSiweMessage } from "viem/siwe";
import { authClient } from "@/lib/auth";
import { BRAND_NAME } from "@/lib/brand";

// Shown verbatim by the wallet before the user signs, so it has to say what the signature
// actually does. It authenticates the address; it authorises no transaction and moves no funds.
const siweStatement = () =>
  `Sign in to ${BRAND_NAME} by proving you control this wallet address. This signature is free, authorises no transaction and moves no funds.`;

export default function useRainbowAuthenticationAdapter() {
  const adapter = createAuthenticationAdapter({
    // Since better-auth 1.5 the nonce is not bound to a wallet address: the server stores it
    // under the nonce itself and re-reads the address and chain id from the signed message at
    // verify time. Both endpoints reject unknown body keys, so neither call sends any.
    getNonce: async () => {
      const { data, error } = await authClient.siwe.nonce();
      if (error || !data?.nonce) {
        const err = new Error("Failed to fetch nonce");
        Sentry.captureException(err, { extra: { error } });
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
      const { data, error } = await authClient.siwe.verify({ message, signature });
      if (error || !data?.user) {
        // The message carries the address and chain id, so it stands in for the fields this
        // call used to send separately.
        Sentry.captureException(new Error("SIWE verify failed"), {
          extra: { reason: error?.message ?? "unknown", message },
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
