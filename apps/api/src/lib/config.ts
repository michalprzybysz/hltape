// apps/api/src/lib/config.ts
import { z } from "zod";
import { BUILDER_ADDRESS, BUILDER_FEE_TENTHS_BPS, REFERRAL_CODE } from "./revenue";

/**
 * Single source of truth for the API server configuration.
 *
 * This module is imported from worker threads as well as from the Fastify app.
 * Worker threads do NOT inherit the parent's parsed values, but they DO inherit
 * `process.env`, so this file must stay standalone: no imports beyond zod and
 * the compiled-in ./revenue constants, and no dependency on the Fastify instance.
 */

const MASTER_KEY_PATTERN = /^[a-fA-F0-9]{64}$/;
const BUILDER_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

const ENV_EXAMPLE_PATH = "apps/api/.env.example";

/** Treat an unset variable and an empty/whitespace-only one as the same thing. */
function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

const requiredString = z.preprocess(emptyToUndefined, z.string().min(1));
const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());

const envSchema = z.object({
  // --- required ---
  DATABASE_URL: requiredString,
  BETTER_AUTH_SECRET: requiredString,
  BETTER_AUTH_URL: requiredString,
  APP_ORIGIN: requiredString,
  MASTER_KEY_HEX: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(
        MASTER_KEY_PATTERN,
        "must be exactly 64 hex characters (generate with: openssl rand -hex 32)",
      ),
  ),

  // --- optional, with defaults ---
  NODE_ENV: z.preprocess(emptyToUndefined, z.string().min(1).default("development")),
  TESTNET: z.preprocess(emptyToUndefined, z.string().min(1).default("true")),

  // --- observability ---
  LOGTAIL_SOURCE_TOKEN: optionalString,
  LOGTAIL_ENDPOINT: optionalString,
  SENTRY_DSN: optionalString,
  DEBUG_WORKERS: optionalString,
  DEBUG_METRICS: optionalString,
});

type Env = z.infer<typeof envSchema>;

function formatIssues(issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>): string[] {
  const lines = new Set<string>();

  for (const issue of issues) {
    const name = String(issue.path[0] ?? "(unknown variable)");
    const raw = process.env[name];
    const unset = raw === undefined || raw.trim() === "";
    lines.add(unset ? `  ${name}: required, but is not set` : `  ${name}: ${issue.message}`);
  }

  return [...lines].sort();
}

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const lines = formatIssues(result.error.issues);
    throw new Error(
      [
        `Invalid environment configuration (${lines.length} problem${lines.length === 1 ? "" : "s"}):`,
        ...lines,
        "",
        `Every variable is documented in ${ENV_EXAMPLE_PATH} — copy it to apps/api/.env and fill it in.`,
      ].join("\n"),
    );
  }

  return result.data;
}

const env = parseEnv();

/** Builder-fee tag attached to orders. `address` is null when the fee is disabled. */
export interface BuilderConfig {
  readonly address: string | null;
  readonly feeTenthsBps: number;
}

/** A builder tag that is known to be active — safe to attach to an order payload. */
export interface ActiveBuilderConfig {
  readonly address: string;
  readonly feeTenthsBps: number;
}

/** Hyperliquid referral code, or null when referral linking is disabled. */
export type ReferralCode = string | null;

export interface LogtailConfig {
  readonly token: string;
  readonly endpoint: string;
}

export interface DebugConfig {
  readonly workers: readonly string[];
  readonly metrics: boolean;
}

/**
 * Validate the compiled-in revenue settings. These are not environment
 * variables, so a mistake here is a mistake someone made while editing
 * src/lib/revenue.ts — fail loudly at startup rather than letting Hyperliquid
 * reject every order at runtime.
 */
function resolveBuilder(): BuilderConfig {
  const address = BUILDER_ADDRESS.trim();

  if (address !== "" && !BUILDER_ADDRESS_PATTERN.test(address)) {
    throw new Error(
      `Invalid BUILDER_ADDRESS in src/lib/revenue.ts: ${JSON.stringify(address)}\n` +
        '  Must be a 0x-prefixed 40 hex character address, or "" to disable the builder fee.',
    );
  }

  if (!Number.isInteger(BUILDER_FEE_TENTHS_BPS) || BUILDER_FEE_TENTHS_BPS < 0) {
    throw new Error(
      `Invalid BUILDER_FEE_TENTHS_BPS in src/lib/revenue.ts: ${BUILDER_FEE_TENTHS_BPS}\n` +
        "  Must be a non-negative whole number of tenths of a basis point (1 = 0.001%).",
    );
  }

  return Object.freeze({
    address: address === "" ? null : address.toLowerCase(),
    feeTenthsBps: BUILDER_FEE_TENTHS_BPS,
  });
}

const builder: BuilderConfig = resolveBuilder();

const logtail: LogtailConfig | null = env.LOGTAIL_SOURCE_TOKEN
  ? Object.freeze({
      token: env.LOGTAIL_SOURCE_TOKEN,
      endpoint: env.LOGTAIL_ENDPOINT ?? "",
    })
  : null;

const debug: DebugConfig = Object.freeze({
  workers: Object.freeze(
    (env.DEBUG_WORKERS ?? "")
      .toLowerCase()
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  ),
  metrics: env.DEBUG_METRICS === "true",
});

export const config = Object.freeze({
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === "production",
  appOrigin: env.APP_ORIGIN,
  databaseUrl: env.DATABASE_URL,
  masterKeyHex: env.MASTER_KEY_HEX,
  testnet: env.TESTNET === "true",
  auth: Object.freeze({
    secret: env.BETTER_AUTH_SECRET,
    url: env.BETTER_AUTH_URL,
  }),
  builder,
  referralCode: REFERRAL_CODE.trim() === "" ? null : REFERRAL_CODE.trim(),
  logtail,
  sentryDsn: env.SENTRY_DSN ?? null,
  debug,
});

export type Config = typeof config;

/**
 * Returns the builder tag to attach to orders, or null when no builder address
 * is configured. When null, the `builder` key must be omitted from the order
 * payload entirely — Hyperliquid rejects an empty or zero-fee builder object.
 */
export function getBuilderTag(): ActiveBuilderConfig | null {
  return config.builder.address === null
    ? null
    : { address: config.builder.address, feeTenthsBps: config.builder.feeTenthsBps };
}
