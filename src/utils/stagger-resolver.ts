import type { StaggerObject } from "@/types/index.ts";

export class StaggerResolver {
  private static resolveStep(count: number, stagger: number | StaggerObject): number {
    if (typeof stagger === "number") return stagger;
    if (stagger.each !== undefined) return stagger.each;
    if (stagger.amount !== undefined) return count <= 1 ? 0 : stagger.amount / (count - 1);
    return 0;
  }

  private static randomOrder(count: number): number[] {
    const order = Array.from({ length: count }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = order[i] as number;
      order[i] = order[j] as number;
      order[j] = tmp;
    }
    return order;
  }

  private static resolveMultipliers(count: number, from: StaggerObject["from"]): number[] {
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
