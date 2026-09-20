// apps/api/src/lib/logger/workerLogger.ts
import type { MessagePort } from "node:worker_threads";
import type { LogLevel, WorkerLoggerOptions } from "../types";

const DEBUG_WORKERS = (process.env.DEBUG_WORKERS ?? "").toLowerCase().split(",").filter(Boolean);
const DEBUG_ALL = DEBUG_WORKERS.includes("*") || DEBUG_WORKERS.includes("all");

function isDebugEnabled(name: string): boolean {
  if (DEBUG_ALL) return true;
  return DEBUG_WORKERS.includes(name.toLowerCase());
}

export class WorkerLogger {
  private port: MessagePort | null = null;
  private readonly name: string;
  private readonly debugEnabled: boolean;

  constructor(options: WorkerLoggerOptions) {
    this.name = options.name;
    this.debugEnabled = options.debugEnabled ?? isDebugEnabled(options.name);
  }

  setPort(port: MessagePort): void {
    this.port = port;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (level === "debug" && !this.debugEnabled) return;

    if (this.port) {
      this.port.postMessage({ type: "log", level, message, context: data, timestamp: Date.now() });
    } else {
      console.log(`[${this.name}] [${level.toUpperCase()}] ${message}`, data || "");
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log("error", message, data);
  }
}

export function createWorkerLogger(name: string): WorkerLogger {
  return new WorkerLogger({ name });
}
