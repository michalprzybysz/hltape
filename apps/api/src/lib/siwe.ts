// apps/api/src/lib/siwe.ts

import { siwe } from "better-auth/plugins";
import ensLookup from "./ensLookup";
import getNonce from "./getNonce";
import verifyMessage from "./verifyMessage";

const origin = process.env.APP_ORIGIN;
if (!origin) {
  throw new Error("Missing APP_ORIGIN env variable");
}

let domain: string;
try {
  domain = new URL(origin).hostname;
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
