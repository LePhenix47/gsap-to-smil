import type { StaggerObject } from "@/types/index.ts";

/**
 * Computes per-target delay offsets for staggered animations.
 *
 * When a GSAP tween targets multiple elements with `stagger`,
 * each element starts at a different time — creating a wave
 * effect. This resolver converts a stagger config (number or
 * `StaggerObject`) into an array of `begin=` offsets in seconds.
 *
 * Example: `{ each: 0.1, from: "start" }` with 3 targets
 * produces `[0, 0.1, 0.2]` — first element starts immediately,
 * second after 0.1s, third after 0.2s.
 */
export class StaggerResolver {
  /**
   * Extracts the per-target time offset from a stagger config.
   *
   * - A plain number (e.g. `0.1`) is used directly — each target
   *   starts 0.1s after the previous one.
   * - `{ each: 0.1 }` behaves identically to a plain number.
   * - `{ amount: 1 }` spreads 1 second across all targets:
   *   3 targets → 2 gaps → step = 1 / 2 = 0.5 → [0, 0.5, 1].
   *   The first target always starts at 0.
   * - If neither `each` nor `amount` is provided, returns 0.
   */
  private static resolveStep(
    count: number,
    stagger: number | StaggerObject,
  ): number {
    if (typeof stagger === "number") {
      return stagger;
    }

    if (stagger.each !== undefined) {
      return stagger.each;
    }

    if (stagger.amount !== undefined) {
      // amount = total time from first target's start to last target's start.
      // With N targets there are N-1 gaps, so step = amount / (count - 1).
      if (count <= 1) {
        return 0;
      }
      const step: number = stagger.amount / (count - 1);

      return step;
    }

    return 0;
  }

  /**
   * Fisher-Yates shuffle — produces a random permutation with uniform
   * distribution.
   *
   * Iterates backwards so every element has an equal probability of
   * ending up in any position. Forward iteration would bias the results
   * (some permutations would be more likely than others).
   */
  private static randomOrder(count: number): number[] {
    const order = Array.from({ length: count }, (_, i) => i);

    if (count <= 1) {
      return order;
    }

    for (let i = order.length - 1; i > 0; i--) {
      const j: number = Math.floor(Math.random() * (i + 1));

      const temporary: number = order[i];
      order[i] = order[j];
      order[j] = temporary;
    }

    return order;
  }

  /**
   * Converts a `from` position into a multiplier array.
   *
   * Each multiplier is later multiplied by the per-target `step`
   * to produce the actual delay in seconds. The multiplier pattern
   * determines the stagger wave shape.
   */
  private static resolveMultipliers(
    count: number,
    from: StaggerObject["from"],
  ): number[] {
    switch (from) {
      case undefined:
      // [0, 1, 2, 3, ...] — left-to-right wave (default)
      case "start":
        return Array.from({ length: count }, (_, i) => i);

      // [3, 2, 1, 0] — right-to-left wave
      case "end":
        return Array.from({ length: count }, (_, i) => count - 1 - i);

      // [2, 1, 0, 1, 2] — fans out from the middle element
      case "center": {
        const center = (count - 1) / 2;
        return Array.from({ length: count }, (_, i) => Math.abs(i - center));
      }

      // [0, 1, 1, 0] — fans in from both ends toward the center
      case "edges":
        return Array.from({ length: count }, (_, i) =>
          Math.min(i, count - 1 - i),
        );

      case "random":
        return StaggerResolver.randomOrder(count);

      // [1, 0, 1] — fans out from the given index
      default:
        return Array.from({ length: count }, (_, i) => Math.abs(i - from));
    }
  }

  /**
   * Computes the `begin=` delay offsets for a staggered animation.
   *
   * Returns an array of `count` numbers — one delay in seconds per target.
   * Each delay = `step × multiplier`, where `step` comes from `resolveStep`
   * and `multiplier` from `resolveMultipliers`.
   *
   * - `count = 0` → `[]` (empty)
   * - `count = 1` → `[0]` (single element, no stagger offset)
   */
  static resolveDelays(
    count: number,
    stagger: number | StaggerObject,
  ): number[] {
    if (count === 0) return [];

    const step = StaggerResolver.resolveStep(count, stagger);
    const from = typeof stagger === "object" ? stagger.from : undefined;
    const multipliers = StaggerResolver.resolveMultipliers(count, from);

    return multipliers.map((m) => m * step);
  }
}
