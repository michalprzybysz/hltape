// apps/api/src/db/schema/index.ts
import { Decimal } from "decimal.js";
import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user, walletAddress } from "./auth";

export const decimalNumber = customType<{ data: Decimal; driverData: string }>({
  dataType() {
    return "numeric(30, 10)";
  },
  fromDriver(value: string): Decimal {
    return new Decimal(value);
  },
  toDriver(value: Decimal): string {
    return value.toString();
  },
});

export const percentageType = customType<{ data: Decimal; driverData: string }>({
  dataType() {
    return "numeric(10, 6)";
  },
  fromDriver(value: string) {
    return new Decimal(value);
  },
  toDriver(value: Decimal) {
    return value.toString();
  },
});

export const leverageType = customType<{ data: Decimal; driverData: string }>({
  dataType() {
    return "numeric(4, 0)";
  },
  fromDriver(value: string) {
    return new Decimal(value);
  },
  toDriver(value: Decimal) {
    return value.toString();
  },
});

export const orderSides = pgEnum("order_side", ["long", "short"]);
export const orderStatus = pgEnum("order_status", [
  "open",
  "filled",
  "canceled",
  "expired",
  "closed",
]);

export const order = pgTable(
  "order",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    instrument: text("instrument").notNull(),
    assetIndex: integer("asset_index").notNull(),
    side: orderSides().notNull().default("long"),
    triggerPrice: decimalNumber("trigger_price").notNull(),
    initialTriggerPrice: decimalNumber("initial_trigger_price").notNull(),
    size: decimalNumber("size").notNull(),
    status: orderStatus().notNull().default("open"),
    raw: jsonb("raw"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .$onUpdate(() => new Date().toISOString())
      .notNull(),
    trailing: boolean("trailing").notNull().default(false),
    trailingDistance: percentageType("trailing_distance"),
    leverage: leverageType("leverage").notNull().default(new Decimal(1)),
  },
  (table) => ({
    activeTrailingIndex: index("active_trailing_idx")
      .on(table.instrument)
      .where(sql`${table.status} = 'open' AND ${table.trailing} = true`),
    userOrderIdx: index("user_order_idx").on(table.userId, table.status),
  }),
);

export const agentWallet = pgTable(
  "agent_wallet",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    masterWalletId: text("master_wallet_id")
      .notNull()
      .references(() => walletAddress.id, { onDelete: "cascade" }),
    agentAddress: text("agent_address").notNull(),
    encryptedPrivateKey: text("encrypted_private_key").notNull(),
    label: text("label"),
    isActive: boolean("is_active").default(true).notNull(),
    expiresAt: timestamp("expires_at", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .$onUpdate(() => new Date().toISOString())
      .notNull(),
  },
  (table) => ({
    userMainAddressIdx: index("agent_wallet_user_main_idx").on(table.userId, table.masterWalletId),
    userActiveIdx: index("agent_active_idx").on(table.userId, table.isActive),
  }),
);

export const executionStatus = pgEnum("execution_status", ["success", "failed", "pending"]);

export const executionLog = pgTable(
  "execution_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    assetIndex: integer("asset_index"),
    instrument: text("instrument"),

    oldTriggerPrice: decimalNumber("old_trigger_price"),
    newTriggerPrice: decimalNumber("new_trigger_price").notNull(),

    status: executionStatus().notNull().default("pending"),
    errorMessage: text("error_message"),

    apiResponse: jsonb("api_response"),

    executionTimeMs: integer("execution_time_ms"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => ({
    orderIdIdx: index("execution_log_order_idx").on(table.orderId),
    userIdIdx: index("execution_log_user_idx").on(table.userId),
    createdAtIdx: index("execution_log_created_idx").on(table.createdAt),
  }),
);

export * from "./auth";
