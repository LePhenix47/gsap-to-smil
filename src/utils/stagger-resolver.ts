import type { StaggerObject } from "@/types/index.ts";

/** Extracts the per-target time step (seconds) from whichever stagger form is provided. */
const resolveStep = (count: number, stagger: number | StaggerObject): number => {
  if (typeof stagger === "number") return stagger;
  if (stagger.each !== undefined) return stagger.each;
  if (stagger.amount !== undefined) return count <= 1 ? 0 : stagger.amount / (count - 1);
  return 0;
};

/** Returns a Fisher-Yates shuffle of `[0, 1, ..., count - 1]`. */
const randomOrder = (count: number): number[] => {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = order[i] as number;
    order[i] = order[j] as number;
    order[j] = tmp;
  }
  return order;
};

/**
 * Maps each target index to its distance from the stagger origin.
 * Multiply the result by `step` to get per-target delay in seconds.
 */
const resolveMultipliers = (count: number, from: StaggerObject["from"]): number[] => {
  switch (from) {
    case undefined:
    case "start":
      return Array.from({ length: count }, (_, i) => i);

    case "end":
      return Array.from({ length: count }, (_, i) => count - 1 - i);

    case "center": {
      const center = (count - 1) / 2;
      return Array.from({ length: count }, (_, i) => Math.abs(i - center));
    }

    case "edges":
      return Array.from({ length: count }, (_, i) => Math.min(i, count - 1 - i));

    case "random":
      return randomOrder(count);

    default:
      // number: specific index as origin — TypeScript narrows `from` to number here
      return Array.from({ length: count }, (_, i) => Math.abs(i - from));
  }
};

/**
 * Computes per-target delay offsets (in seconds) from a stagger config.
 * The caller adds these on top of the base `delay` from `TweenVars`.
 *
 * @example
 * resolveStaggerDelays(3, 0.1)                           // [0, 0.1, 0.2]
 * resolveStaggerDelays(3, { each: 0.1, from: "end" })   // [0.2, 0.1, 0]
 * resolveStaggerDelays(3, { amount: 1 })                 // [0, 0.5, 1]
 */
export const resolveStaggerDelays = (
  count: number,
  stagger: number | StaggerObject,
): number[] => {
  if (count === 0) return [];

  const step = resolveStep(count, stagger);
  const from = typeof stagger === "object" ? stagger.from : undefined;
  const multipliers = resolveMultipliers(count, from);

  return multipliers.map((m) => m * step);
};
