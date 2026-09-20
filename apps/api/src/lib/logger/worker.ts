// apps/api/src/lib/logger/worker.ts

import type { MessagePort } from "node:worker_threads";
import { Logtail } from "@logtail/node";
import { expose } from "threads/worker";
import type { LogMessage, MetricMessage } from "../types";

const LOGTAIL_TOKEN = process.env.LOGTAIL_SOURCE_TOKEN || "";
const LOGTAIL_ENDPOINT = process.env.LOGTAIL_ENDPOINT || "";
const isProduction = process.env.NODE_ENV === "production";
const hasValidToken = isProduction && LOGTAIL_TOKEN.length > 0;
const FORCE_CONSOLE = !isProduction || !hasValidToken;

let logtail: Logtail | null = hasValidToken
  ? new Logtail(LOGTAIL_TOKEN, {
      ...(LOGTAIL_ENDPOINT && { endpoint: LOGTAIL_ENDPOINT }),
    })
  : null;

let isDead = false;

const safeLog = (
  level: "info" | "warn" | "error" | "debug",
  msg: string,
  ctx: Record<string, unknown>,
) => {
  if (logtail && !isDead && level !== "error") {
    const cloudLevel = level === "debug" ? "info" : level;

    logtail[cloudLevel](msg, ctx).catch((err: unknown) => {
      const error = err as { message?: string };
      if (error?.message?.includes("Unauthorized")) {
        console.error("[Logger] CRITICAL: Invalid Token. Disabling cloud.");
        isDead = true;
        logtail = null;
      }
    });
  }

  if (FORCE_CONSOLE) {
    const ts = new Date().toISOString().split("T")[1].slice(0, -1); // Krótki czas
    const contextStr = ctx && Object.keys(ctx).length ? JSON.stringify(ctx) : "";

    let color = "\x1b[37m"; // White
    if (level === "error") color = "\x1b[31m"; // Red
    if (level === "warn") color = "\x1b[33m"; // Yellow
    if (level === "debug") color = "\x1b[90m"; // Gray

    console.log(`${color}[${ts}] [${level.toUpperCase()}] ${msg}\x1b[0m`, contextStr);
  }
};

const loggerApi = {
  registerSource(port: MessagePort, sourceName: string) {
    port.on("message", (msg: LogMessage | MetricMessage) => {
      if (isDead && !FORCE_CONSOLE) return;

      try {
        if (msg.type === "metric") {
          if (FORCE_CONSOLE && process.env.DEBUG_METRICS === "true") {
            console.log(`[Metric] ${sourceName}: ${msg.name} = ${msg.value}`);
          }
          if (logtail && !isDead) {
            safeLog("info", `Metric: ${msg.name}`, { ...msg, src: sourceName });
          }
          return;
        }

        if (msg.type === "log") {
          const context = {
            ...msg.context,
            src: sourceName,
            ts: msg.timestamp,
          };

          const lvl = msg.level as "info" | "warn" | "error" | "debug";
          safeLog(lvl, msg.message, context);
        }
      } catch (err) {
        console.error("[Logger Worker] Panic:", err);
      }
    });

    port.start();
  },

  async flush() {
    if (logtail && !isDead) {
      await logtail.flush();
    }
  },
};

expose(loggerApi);
