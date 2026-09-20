// apps/api/src/lib/sentry.ts

import * as Sentry from "@sentry/node";

const SENTRY_DSN = process.env.SENTRY_DSN || "";

let initialized = false;

export function initWorkerSentry(workerName: string): void {
  if (initialized || process.env.NODE_ENV !== "production" || !SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: "production",
    serverName: `worker-${workerName.toLowerCase()}`,
    initialScope: { tags: { worker: workerName } },
  });

  initialized = true;
}

export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;

  Sentry.captureException(err, { extra: context });
}

export async function flushSentry(): Promise<void> {
  if (!initialized) return;
  await Sentry.close(2000);
}
