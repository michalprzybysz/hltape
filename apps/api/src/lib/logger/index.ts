// apps/api/src/lib/logger/index.ts

import { MessageChannel, type MessagePort } from "node:worker_threads";
import { spawn, Thread, Transfer, Worker } from "threads";
import type { LogMessage, MetricMessage } from "../types";

const DEBUG_SOURCES = (process.env.DEBUG_WORKERS ?? "").toLowerCase().split(",").filter(Boolean);
const DEBUG_ALL = DEBUG_SOURCES.includes("*") || DEBUG_SOURCES.includes("all");

function isDebugEnabled(source: string): boolean {
  if (DEBUG_ALL) return true;
  return DEBUG_SOURCES.includes(source.toLowerCase());
}

type LoggerWorker = {
  registerSource(port: MessagePort, sourceName: string): Promise<void>;
  flush(): Promise<void>;
};

let loggerWorker: LoggerWorker | null = null;
let mainPort: MessagePort | null = null;
let isInitialized = false;

// Worker ports for child workers
export const workerPorts: {
  brain?: MessagePort;
  feeder?: MessagePort;
  dispatcher?: MessagePort;
  executor?: MessagePort;
  janitor?: MessagePort;
} = {};

async function createChannel(sourceName: string): Promise<MessagePort> {
  if (!loggerWorker) throw new Error("Logger not initialized");
  const { port1, port2 } = new MessageChannel();
  await loggerWorker.registerSource(Transfer(port1) as unknown as MessagePort, sourceName);
  return port2;
}

/**
 * Initialize the logger system. Call once at startup.
 */
export async function initLogger(): Promise<void> {
  if (isInitialized) return;

  loggerWorker = await spawn<LoggerWorker>(new Worker("./worker"));
  mainPort = await createChannel("API");

  // Create worker ports
  workerPorts.brain = await createChannel("Brain");
  workerPorts.feeder = await createChannel("Feeder");
  workerPorts.dispatcher = await createChannel("Dispatcher");
  workerPorts.executor = await createChannel("Executor");
  workerPorts.janitor = await createChannel("Janitor");

  isInitialized = true;
}

/**
 * Shutdown the logger system. Call on app close.
 */
export async function shutdownLogger(): Promise<void> {
  if (!loggerWorker) return;

  try {
    await loggerWorker.flush();
  } catch {
    // ignore flush errors
  }

  await Thread.terminate(loggerWorker as unknown as Parameters<typeof Thread.terminate>[0]);
  loggerWorker = null;
  mainPort = null;
  isInitialized = false;
}

function emit(level: string, message: string, data?: object): void {
  if (level === "debug" && !isDebugEnabled("api")) return;

  if (!mainPort) {
    const ts = new Date().toISOString();
    console.log(`[${ts}] [API] [${level.toUpperCase()}] ${message}`, data ?? "");
    return;
  }

  const payload: LogMessage = {
    type: "log",
    source: "API",
    level,
    message,
    timestamp: Date.now(),
    context: data,
  };

  try {
    mainPort.postMessage(payload);
  } catch {
    console.log(`[FALLBACK] ${level}: ${message}`, data);
  }
}

export const logger = {
  debug(message: string, data?: object): void {
    emit("debug", message, data);
  },

  info(message: string, data?: object): void {
    emit("info", message, data);
  },

  warn(message: string, data?: object): void {
    emit("warn", message, data);
  },

  error(message: string, data?: object): void {
    emit("error", message, data);
  },

  fatal(message: string, data?: object): void {
    emit("fatal", message, data);
  },

  metric(name: string, value: number, tags?: object): void {
    if (!mainPort) return;

    const payload: MetricMessage = {
      type: "metric",
      source: "API",
      name,
      value,
      timestamp: Date.now(),
      tags,
    };

    try {
      mainPort.postMessage(payload);
    } catch {
      // ignore metric errors
    }
  },
};
