// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
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
 * The edge runtime runs the middleware, which sees every dashboard request and therefore every
 * Better Auth session cookie. Sentry's request data defaults (`cookies`, `data`, `headers`) are
 * not gated on `sendDefaultPii`, so they have to be removed explicitly.
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
