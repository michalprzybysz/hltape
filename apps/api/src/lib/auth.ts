// apps/api/src/lib/auth.ts
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import database from "./database";
import siwe from "./siwe";

const origin = process.env.APP_ORIGIN;
if (!origin) {
  throw new Error("Missing required env variable: APP_ORIGIN");
}
const domain = (() => {
  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname.startsWith("localhost:")) {
      return hostname;
    }
    const parts = hostname.split(".");
    if (parts.length < 2) throw new Error();
    return `.${parts.slice(-2).join(".")}`;
  } catch {
    throw new Error(`Invalid APP_ORIGIN: ${origin}`);
  }
})();

export const auth = betterAuth({
  trustedOrigins: [origin],
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain,
    },
  },
  database,
  plugins: [
    siwe,
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],
});
