// apps/api/src/lib/auth.ts
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import database from "./database";
import siwe from "./siwe";

const origin = process.env.APP_ORIGIN;
if (!origin) {
  throw new Error("Missing required env variable: APP_ORIGIN");
}

/**
 * Auth cookies are host-only unless the operator says otherwise.
 *
 * With `crossSubDomainCookies` left off, better-auth omits the Domain attribute altogether, so
 * the browser keeps the session for exactly the host that set it. That is what every deployment
 * serving the dashboard and this API from one host wants, including the documented local setup:
 * http://localhost:3000 and http://localhost:4000 are one cookie host, because a port is not
 * part of a cookie's scope.
 *
 * Deriving a wider domain from APP_ORIGIN's hostname — the last two labels, as this file used to
 * do — is wrong in two common cases. On a shared host such as *.vercel.app, *.fly.dev,
 * *.onrender.com or *.pages.dev those two labels are the public suffix, and a browser drops any
 * cookie scoped to it, so sessions never persist and the login appears to loop; on example.co.uk
 * they are "co.uk", which fails the same way. Where the browser does accept it, it hands the
 * session of a server that custodies agent wallet keys to every sibling subdomain.
 *
 * Splitting the dashboard and the API across two subdomains is a deployment choice, so it is
 * opt-in and stated rather than guessed: AUTH_COOKIE_DOMAIN, documented in .env.example and
 * checked against both hosts at startup by ./config, which normalizes the value exactly as the
 * line below does.
 */
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim().toLowerCase().replace(/^\./, "");
const advanced = cookieDomain
  ? { crossSubDomainCookies: { enabled: true, domain: cookieDomain } }
  : {};

export const auth = betterAuth({
  trustedOrigins: [origin],
  advanced,
  database,
  plugins: [
    siwe,
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],
});
