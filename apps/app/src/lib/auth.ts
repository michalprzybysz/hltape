// apps/app/src/lib/auth.ts
import { adminClient, siweClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [siweClient(), adminClient()],
});
