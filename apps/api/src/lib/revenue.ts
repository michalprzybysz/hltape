// apps/api/src/lib/revenue.ts
/**
 * ============================================================================
 * REVENUE CONFIGURATION — THE ONLY PLACE THE SERVER DEFINES WHO GETS PAID
 * ============================================================================
 *
 * These are the project's default revenue settings. They are compiled into the
 * server; there is no environment variable that changes them.
 *
 * RUNNING YOUR OWN INSTANCE? Edit this file. Both mechanisms are opt-out:
 *
 *   - to earn the builder fee yourself, replace BUILDER_ADDRESS with your own
 *     Hyperliquid address, and REFERRAL_CODE with your own referral code
 *   - to run with no builder fee and no referral linking at all, set both to
 *     the empty string ""
 *
 * An empty BUILDER_ADDRESS is fully supported: the server then omits the
 * `builder` key from every order payload and the dashboard drops its fee
 * approval step. Nothing breaks and nothing is collected.
 *
 * If you change BUILDER_ADDRESS here you must make the same change in
 * apps/app/src/lib/revenue.ts — the dashboard asks the user to approve a fee
 * for a specific address on-chain, and Hyperliquid rejects an order whose
 * builder address the user has not approved.
 *
 * Neither value is a secret. A builder address is a public on-chain address and
 * a referral code is public by design; both are visible in every order this
 * server submits.
 */

/**
 * Hyperliquid address credited with the builder fee on every order this server
 * places. Empty string disables the builder fee entirely.
 */
export const BUILDER_ADDRESS = "0x2270544482ceBCc67F5582AB0B2de9521F6AF82F";

/**
 * Builder fee rate, in tenths of a basis point — Hyperliquid's `f` field.
 * 1 = 0.001%, 10 = 0.01%. Must not exceed the maximum rate the user approved
 * on-chain (see MAX_BUILDER_FEE in apps/app/src/lib/revenue.ts), or Hyperliquid
 * rejects the order.
 */
export const BUILDER_FEE_TENTHS_BPS = 1;

/**
 * Hyperliquid referral code applied to a user who is not already referred by
 * someone else. Applied once, on the user's first successful order. Empty
 * string disables referral linking entirely.
 */
export const REFERRAL_CODE = "HLTAPEXYZ";
