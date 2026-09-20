// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// This is the browser config Next.js 16 actually loads. `sentry.client.config.ts` at the
// workspace root is the older location and is no longer imported by anything.

import * as Sentry from "@sentry/nextjs";

// Every transaction is a billed event and 1 sends all of them. Ten percent is plenty to spot a
// slow route, and a fork that enables Sentry should not find out about the rest from an invoice.
const TRACES_SAMPLE_RATE = 0.1;

const CREDENTIAL_HEADERS = new Set(["authorization", "cookie", "set-cookie", "x-api-key"]);

/**
 * Strip credentials and request bodies out of an event before it leaves the browser.
 *
 * Sentry's request data defaults (`cookies`, `data`, `headers`) are not gated on
 * `sendDefaultPii`, so they have to be removed explicitly. Header names are case-insensitive in
 * transit, so match lower-cased rather than assuming "cookie".
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

  // Add optional integrations for additional features
  integrations: [
    // These three are the SDK defaults, spelled out because this dashboard is where an agent
    // wallet's private key is generated (profile/@wallet/GenerateAgentButton.tsx) and where one
    // is pasted into a form (components/ConnectAgentDialog.tsx). Turning any of them off would
    // put that key into a session replay.
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: TRACES_SAMPLE_RATE,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // `sendDefaultPii` is deliberately not set. On the browser SDK it tells Sentry's relay to infer
  // the visitor's IP address from the ingest request and attach it to every event and session.

  beforeSend(event) {
    scrubRequest(event.request);
    return event;
  },

  beforeSendTransaction(event) {
    scrubRequest(event.request);
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
