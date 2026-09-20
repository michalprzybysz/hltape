// apps/app/src/components/providers/hooks/useRainbowAuthStatus.ts
"use client";

import type { AuthenticationStatus } from "@rainbow-me/rainbowkit";
import { authClient } from "@/lib/auth";

export default function useRainbowAuthStatus(): AuthenticationStatus {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return "loading";
  if (session?.user) return "authenticated";
  return "unauthenticated";
}
