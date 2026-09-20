// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Every transaction is a billed event and 1 sends all of them. Ten percent is plenty to spot a
// slow route, and a fork that enables Sentry should not find out about the rest from an invoice.
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
 * `requestDataIntegration` is on by default and its defaults are `{ cookies: true, data: true,
 * headers: true, ... }`. None of those are gated on `sendDefaultPii` — only the client IP is —
 * so they have to be removed explicitly. The cookie this drops is the Better Auth session
 * cookie, which is a live bearer credential for the API.
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

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: TRACES_SAMPLE_RATE,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  integrations: [
    // Never attach an incoming request body to an event. The scrubber below is the backstop.
    Sentry.httpIntegration({ maxIncomingRequestBodySize: "none" }),
  ],

  // `sendDefaultPii` is deliberately not set: it attaches the caller's IP address to every event.

  beforeSend(event) {
    scrubRequest(event.request);
    return event;
  },

  beforeSendTransaction(event) {
    scrubRequest(event.request);
    return event;
  },
});
