// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// NOTE: nothing imports this file. Since Next.js 15.3 the browser SDK is initialised from
// `src/instrumentation-client.ts`, and `src/instrumentation.ts` only pulls in the server and edge
// configs. That is why the `Sentry.getFeedback()` calls in `src/app/global-error.tsx`,
// `src/app/(restricted)/error.tsx` and `src/app/login/error.tsx` currently resolve to `undefined`
// and the feedback buttons do nothing: the `feedbackIntegration` below is never registered. Move
// the integration into `src/instrumentation-client.ts` if you want that feature back, and delete
// this file. It is kept, and kept scrubbed, so that reinstating it cannot quietly reintroduce the
// PII settings it used to carry.

import * as Sentry from "@sentry/nextjs";

// Every transaction is a billed event and 1 sends all of them. Ten percent is plenty to spot a
// slow route, and a fork that enables Sentry should not find out about the rest from an invoice.
const TRACES_SAMPLE_RATE = 0.1;

const CREDENTIAL_HEADERS = new Set(["authorization", "cookie", "set-cookie", "x-api-key"]);

/**
 * Strip credentials and request bodies out of an event before it leaves the browser.
 *
 * Sentry's request data defaults (`cookies`, `data`, `headers`) are not gated on
 * `sendDefaultPii`, so they have to be removed explicitly.
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

  // `sendDefaultPii` is deliberately not set. On the browser SDK it tells Sentry's relay to infer
  // the visitor's IP address from the ingest request and attach it to every event and session.

  integrations: [
    // The three masking options are the SDK defaults, spelled out because this dashboard is
    // where an agent wallet's private key is generated and where one is pasted into a form.
    // Turning any of them off would put that key into a session replay.
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
    Sentry.feedbackIntegration({
      colorScheme: "dark",
      showBranding: false,
      showName: false,
      showEmail: false,
      triggerLabel: "Feedback",
      formTitle: "Send Feedback",
      submitButtonLabel: "Send Feedback",
      messagePlaceholder: "Describe what happened or what could be improved...",
      successMessageText: "Thank you for your feedback!",
      themeDark: {
        background: "#141821",
        foreground: "#e8edf2",
        accentBackground: "#4db8a8",
        accentForeground: "#ffffff",
        border: "1.5px solid rgba(255, 255, 255, 0.1)",
      },
    }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  beforeSend(event) {
    scrubRequest(event.request);
    return event;
  },

  beforeSendTransaction(event) {
    scrubRequest(event.request);
    return event;
  },
});
