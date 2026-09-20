// apps/api/src/plugins/sentry.ts

import * as Sentry from "@sentry/node";
import fp from "fastify-plugin";

// Every transaction Sentry accepts is a billed event, and 1.0 sends all of them. A fork that
// turns Sentry on should not find that out from an invoice. Edit the constant if you want more
// resolution; it is deliberately a constant rather than yet another environment variable.
const TRACES_SAMPLE_RATE = 0.1;

// Request headers that carry a credential. Header names are case-insensitive in transit and the
// SDK reports whichever casing the client sent, so these are compared lower-cased.
const CREDENTIAL_HEADERS = new Set([
  "authorization",
  "cookie",
  "proxy-authorization",
  "set-cookie",
  "x-api-key",
]);

/**
 * Strip credentials and request bodies out of an event before it leaves the process.
 *
 * `requestDataIntegration` is on by default in @sentry/node and its defaults are
 * `{ cookies: true, data: true, headers: true, ... }`. None of those are gated on
 * `sendDefaultPii` — only the client IP is — so dropping that option is not enough on its own.
 * Without this scrubber every event carries the Better Auth session cookie, which is a live
 * bearer credential, and the request body. The body of POST /wallets/agent is
 * `{ agentAddress, privateKey, label }`.
 */
function scrubRequest(request: Sentry.RequestEventData | undefined): void {
  if (!request) {
    return;
  }

  delete request.data;
  delete request.cookies;

  const { headers } = request;
  if (headers) {
    for (const name of Object.keys(headers)) {
      if (CREDENTIAL_HEADERS.has(name.toLowerCase())) {
        delete headers[name];
      }
    }
  }
}

export default fp(
  async (fastify) => {
    const dsn = process.env.SENTRY_DSN;

    if (process.env.NODE_ENV !== "production" || !dsn) {
      return;
    }

    Sentry.init({
      dsn,
      environment: "production",
      tracesSampleRate: TRACES_SAMPLE_RATE,
      integrations: [
        // Do not read the incoming request body at all. The scrubber below is the backstop;
        // this stops the body from ever being attached in the first place.
        Sentry.httpIntegration({ maxIncomingRequestBodySize: "none" }),
      ],
      beforeSend(event) {
        scrubRequest(event.request);
        return event;
      },
      beforeSendTransaction(event) {
        scrubRequest(event.request);
        return event;
      },
    });

    Sentry.setupFastifyErrorHandler(fastify);

    fastify.addHook("onClose", async () => {
      await Sentry.close(2000);
    });
  },
  { name: "sentry" },
);
