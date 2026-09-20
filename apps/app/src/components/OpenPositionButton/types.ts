export { MARGIN_MODE, type MarginMode, type OpenPositionFormData } from "./schema";

export interface CoinOption {
  name: string;
  maxLeverage: number;
  price: string | undefined;
}

export const SIZE_PRESETS = [10, 25, 50, 75, 100] as const;
export const SL_PRESETS = [0.02, 0.05, 0.1, 0.2, 0.5] as const;

export function clampLeverage(val: number, max: number): number {
  return Math.max(1, Math.min(max, Math.round(val)));
}

export function computeLeveragePresets(max: number): number[] {
  if (max <= 5) return Array.from({ length: max }, (_, i) => i + 1);
  const targets = [1, 0.25, 0.5, 0.75, 1].map((r) => Math.round(1 + r * (max - 1)));
  targets[0] = 1;
  targets[targets.length - 1] = max;
  return [...new Set(targets)].sort((a, b) => a - b).slice(0, 5);
}
