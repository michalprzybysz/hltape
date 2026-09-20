// apps/api/src/lib/utils/math.ts
import { Decimal } from "decimal.js";
import { BRAIN_CONFIG, FEEDER_FALLBACK_VOL } from "../enums";
import type { Side } from "../types";

const ONE = new Decimal(1);
const TEN = new Decimal(10);
const FIFTY = new Decimal(50);
const THREE = new Decimal(3);

export function roundToHlPrice(price: Decimal): Decimal {
  return price.toSignificantDigits(5, Decimal.ROUND_HALF_UP);
}

export function isPriceDifferent(priceA: Decimal, priceB: Decimal): boolean {
  const hlPriceA = roundToHlPrice(priceA);
  const hlPriceB = roundToHlPrice(priceB);
  return !hlPriceA.equals(hlPriceB);
}

export function calculateTheoreticalSl(
  currentPrice: Decimal,
  triggerPrice: Decimal,
  trailingDistance: Decimal,
  side: Side,
): Decimal | null {
  if (side === "long") {
    if (currentPrice.lt(triggerPrice)) return null;
    const newSl = currentPrice.mul(ONE.minus(trailingDistance));
    return newSl.gt(triggerPrice) ? newSl : null;
  }
  if (currentPrice.gt(triggerPrice)) return null;
  const newSl = currentPrice.mul(ONE.plus(trailingDistance));
  return newSl.lt(triggerPrice) ? newSl : null;
}

export function calculateGapPercent(
  newTrigger: Decimal,
  oldTrigger: Decimal,
  currentPrice: Decimal,
): Decimal {
  if (currentPrice.isZero()) {
    return new Decimal(0);
  }
  return newTrigger.minus(oldTrigger).abs().div(currentPrice);
}

export function calculateThreshold(
  volatility: Decimal,
  leverage: Decimal,
  sizeUsd: Decimal,
  trailingDist: Decimal,
): Decimal {
  const levFactor = leverage.div(FIFTY).plus(ONE);
  const sizeFactor = sizeUsd.plus(TEN).log(10).div(THREE);

  const denominator = levFactor.mul(sizeFactor);
  if (denominator.isZero()) {
    return BRAIN_CONFIG.minThreshold;
  }

  const threshold = volatility.mul(BRAIN_CONFIG.volatilityMultiplier).div(denominator);

  const maxAllowed = trailingDist.mul(0.1);
  return Decimal.max(BRAIN_CONFIG.minThreshold, Decimal.min(threshold, maxAllowed));
}

export function calculatePureRiskScore(
  gapPercent: Decimal,
  leverage: Decimal,
  sizeUsd: Decimal,
): Decimal {
  let score = gapPercent.mul(leverage);
  const whaleBonus = sizeUsd.plus(ONE).log(10);
  score = score.mul(whaleBonus);

  if (gapPercent.gt(BRAIN_CONFIG.panicGap)) {
    score = score.mul(BRAIN_CONFIG.panicMultiplier);
  }

  return score.mul(BRAIN_CONFIG.riskScale).floor();
}

interface VolatilityData {
  prices: Decimal[];
  lastVol: Decimal;
}

const volatilityCache = new Map<string, VolatilityData>();

export function calculateVolatility(symbol: string, price: Decimal): Decimal {
  let data = volatilityCache.get(symbol);
  if (!data) {
    data = { prices: [], lastVol: FEEDER_FALLBACK_VOL };
    volatilityCache.set(symbol, data);
  }

  data.prices.push(price);
  if (data.prices.length > 20) {
    data.prices.shift();
  }

  if (data.prices.length < 5) {
    return FEEDER_FALLBACK_VOL;
  }

  const returns: Decimal[] = [];
  for (let i = 1; i < data.prices.length; i++) {
    const ret = data.prices[i].minus(data.prices[i - 1]).div(data.prices[i - 1]);
    returns.push(ret);
  }

  const mean = returns.reduce((a, b) => a.plus(b), new Decimal(0)).div(returns.length);
  const variance = returns
    .reduce((sum, r) => sum.plus(r.minus(mean).pow(2)), new Decimal(0))
    .div(returns.length);

  const vol = variance.sqrt();
  data.lastVol = vol.isFinite() && vol.gt(0) ? vol : FEEDER_FALLBACK_VOL;

  return data.lastVol;
}

export function getVolatilityData(symbol: string): VolatilityData | undefined {
  return volatilityCache.get(symbol);
}

export function clearVolatilityData(symbol: string): void {
  volatilityCache.delete(symbol);
}

export function clearAllVolatilityData(): void {
  volatilityCache.clear();
}
