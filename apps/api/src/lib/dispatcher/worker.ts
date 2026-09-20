// apps/api/src/lib/dispatcher/worker.ts
import type { MessagePort } from "node:worker_threads";
import { expose } from "threads/worker";
import { DISPATCHER_CONFIG } from "../enums";
import { createWorkerLogger } from "../logger/workerLogger";
import { initWorkerSentry } from "../sentry";
import type { DecisionMessage, ExecutionDecision, ExecutionTask } from "../types";

initWorkerSentry("Dispatcher");

const logger = createWorkerLogger("Dispatcher");

let brainPort: MessagePort | null = null;
let executorPort: MessagePort | null = null;

const tasks = new Map<string, ExecutionTask>();
const pendingRequests = new Set<string>();
const rateLimitWindow: number[] = [];

let isScheduled = false;
let processingTimeout: ReturnType<typeof setTimeout> | null = null;

function cleanupRateLimit(now: number): void {
  const windowStart = now - DISPATCHER_CONFIG.windowSizeMs;
  while (rateLimitWindow.length > 0 && rateLimitWindow[0] < windowStart) {
    rateLimitWindow.shift();
  }
}

function canDispatch(now: number): boolean {
  cleanupRateLimit(now);
  return rateLimitWindow.length < DISPATCHER_CONFIG.maxRequestsPerSecond;
}

function recordDispatch(now: number): void {
  rateLimitWindow.push(now);
}

function availableSlots(): number {
  return Math.max(0, DISPATCHER_CONFIG.maxRequestsPerSecond - rateLimitWindow.length);
}

function enqueueTask(decision: ExecutionDecision): void {
  const existing = tasks.get(decision.id);

  if (existing) {
    existing.order = {
      id: decision.id,
      userId: decision.userId,
      instrument: decision.instrument,
      side: decision.side,
      assetIndex: decision.assetIndex,
      size: decision.size,
    };
    existing.triggerPrice = decision.triggerPrice;
    existing.priority = decision.priorityScore;
    existing._effectivePriority = decision.priorityScore;
  } else {
    const task: ExecutionTask = {
      id: decision.id,
      order: {
        id: decision.id,
        userId: decision.userId,
        instrument: decision.instrument,
        side: decision.side,
        assetIndex: decision.assetIndex,
        size: decision.size,
      },
      triggerPrice: decision.triggerPrice,
      priority: decision.priorityScore,
      createdAt: Date.now(),
      _effectivePriority: decision.priorityScore,
    };
    tasks.set(decision.id, task);
  }

  if (!isScheduled) {
    scheduleProcessing();
  }
}

function scheduleProcessing(): void {
  isScheduled = true;
  setImmediate(processQueue);
}

function scheduleRetry(): void {
  if (isScheduled) return;
  isScheduled = true;
  processingTimeout = setTimeout(() => {
    processingTimeout = null;
    setImmediate(processQueue);
  }, 10);
}

function processQueue(): void {
  isScheduled = false;

  if (tasks.size === 0 || !executorPort) return;

  const now = Date.now();

  if (!canDispatch(now)) {
    scheduleRetry();
    return;
  }

  const workBuffer: ExecutionTask[] = [];
  tasks.forEach((task) => {
    if (pendingRequests.has(task.id)) return;

    const age = now - task.createdAt;
    const boost = Math.min(
      age * DISPATCHER_CONFIG.agingFactorPerMs,
      DISPATCHER_CONFIG.maxAgingMultiplier - 1,
    );
    task._effectivePriority = task.priority * (1 + boost);
    workBuffer.push(task);
  });

  if (workBuffer.length === 0) return;

  workBuffer.sort((a, b) => b._effectivePriority - a._effectivePriority);

  const available = availableSlots();
  const toDispatch = Math.min(available, workBuffer.length);

  for (let i = 0; i < toDispatch; i++) {
    const task = workBuffer[i];
    dispatchTask(task, now);
  }

  if (tasks.size > 0) {
    if (availableSlots() === 0) {
      scheduleRetry();
    } else {
      scheduleProcessing();
    }
  }
}

function dispatchTask(task: ExecutionTask, now: number): void {
  tasks.delete(task.id);
  pendingRequests.add(task.id);
  recordDispatch(now);

  logger.debug("Dispatching task to Executor", {
    orderId: task.id,
    price: task.triggerPrice,
    priority: task._effectivePriority,
  });

  executorPort?.postMessage({
    type: "execute",
    data: {
      orderId: task.id,
      order: task.order,
      triggerPrice: task.triggerPrice,
    },
  });
}

function handleExecutorResult(result: { orderId: string; success: boolean }): void {
  pendingRequests.delete(result.orderId);

  if (tasks.has(result.orderId) && !isScheduled) {
    scheduleProcessing();
  }
}

const dispatcherApi = {
  setPorts(brainP: MessagePort, executorP: MessagePort) {
    brainPort = brainP;
    executorPort = executorP;

    brainPort.on("message", (msg: DecisionMessage) => {
      if (msg.type === "decision") {
        logger.debug("Received decision from Brain", {
          orderId: msg.data.id,
          price: msg.data.triggerPrice,
        });
        enqueueTask(msg.data);
      }
    });

    executorPort.on("message", (msg: { type: string; orderId: string; success: boolean }) => {
      if (msg.type === "result") {
        handleExecutorResult(msg);
      }
    });

    brainPort.start();
    executorPort.start();

    logger.info("Connected to Brain and Executor via MessagePorts");
  },

  setLoggerPort(port: MessagePort) {
    logger.setPort(port);
    port.start();
  },

  cancel(orderId: string): boolean {
    const removed = tasks.delete(orderId);
    pendingRequests.delete(orderId);
    return removed;
  },

  getStats() {
    const now = Date.now();
    cleanupRateLimit(now);

    let oldestTaskAge: number | null = null;
    tasks.forEach((task) => {
      const age = now - task.createdAt;
      if (oldestTaskAge === null || age > oldestTaskAge) {
        oldestTaskAge = age;
      }
    });

    return {
      queueSize: tasks.size,
      pendingRequests: pendingRequests.size,
      rateLimitUsage: {
        current: rateLimitWindow.length,
        max: DISPATCHER_CONFIG.maxRequestsPerSecond,
        percentage: (rateLimitWindow.length / DISPATCHER_CONFIG.maxRequestsPerSecond) * 100,
      },
      oldestTaskAge,
    };
  },

  shutdown() {
    if (processingTimeout) {
      clearTimeout(processingTimeout);
    }
    tasks.clear();
    pendingRequests.clear();
    rateLimitWindow.length = 0;
  },
};

expose(dispatcherApi);
