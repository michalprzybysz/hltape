// apps/api/src/lib/siwe.ts

import { siwe } from "better-auth/plugins";
import ensLookup from "./ensLookup";
import getNonce from "./getNonce";
import verifyMessage from "./verifyMessage";

const origin = process.env.APP_ORIGIN;
if (!origin) {
  throw new Error("Missing APP_ORIGIN env variable");
}

// ERC-4361 defines the SIWE `domain` as the RFC 3986 authority, so it carries the port when
// there is a non-default one. The dashboard signs `window.location.host`, and since better-auth
// 1.5 the server compares that against this value, so this must be `host` and not `hostname`:
// with `hostname` the documented local setup (APP_ORIGIN=http://localhost:3000) signs
// "localhost:3000", gets compared against "localhost" and every sign-in fails.
let domain: string;
try {
  domain = new URL(origin).host;
} catch {
  throw new Error(`APP_ORIGIN must be a valid URL, got: ${origin}`);
}

export default siwe({
  domain,
  anonymous: true,
  getNonce,
  verifyMessage,
  ensLookup,
});
