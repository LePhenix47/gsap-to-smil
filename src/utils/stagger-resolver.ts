import type { StaggerObject } from "@/types/index.ts";

// ! Missing JSDoc
export class StaggerResolver {
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
      // ! I don't really understand this, why are we dividing the stagger amount by (count - 1) ?
      const step: number = stagger.amount / (count - 1);

      return count <= 1 ? 0 : step;
    }

    return 0;
  }

  private static randomOrder(count: number): number[] {
    const order = Array.from({ length: count }, (_, i) => i);

    if (count <= 1) {
      return order;
    }

    // ! Why iterate backwards ?
    for (let i = order.length - 1; i > 0; i--) {
      const j: number = Math.floor(Math.random() * (i + 1));

      const tmp: number = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }

    return order;
  }

  private static resolveMultipliers(
    count: number,
    from: StaggerObject["from"],
  ): number[] {
    switch (from) {
      case undefined:
      // ! Would be nice if there was a one line comment above each return statement explaining what it does in a few words
      case "start":
        return Array.from({ length: count }, (_, i) => i);

      case "end":
        return Array.from({ length: count }, (_, i) => count - 1 - i);

      case "center": {
        const center = (count - 1) / 2;
        return Array.from({ length: count }, (_, i) => Math.abs(i - center));
      }

      case "edges":
        return Array.from({ length: count }, (_, i) =>
          Math.min(i, count - 1 - i),
        );

      case "random":
        return StaggerResolver.randomOrder(count);

      default:
        return Array.from({ length: count }, (_, i) => Math.abs(i - from));
    }
  }

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
