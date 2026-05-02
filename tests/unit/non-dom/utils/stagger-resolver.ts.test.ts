// fallow-ignore-file
import { expect, describe, it } from "bun:test";
import { StaggerResolver } from "@/utils/stagger-resolver.ts";
import { roundToFloat } from "@/utils/helpers/math.functions";

describe("stagger-resolver", () => {
  describe("resolveStaggerDelays", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: simple number stagger produces evenly spaced delays from index 0", () => {
      const result = StaggerResolver.resolveDelays(3, 0.1);
      const expected = [0, 0.1, 0.2];

      expect(result).toEqual(expected);
    });

    it("HAPPY PATH: { each } form behaves identically to a plain number stagger", () => {
      const result = StaggerResolver.resolveDelays(3, { each: 0.1 });
      const expected = [0, 0.1, 0.2];

      expect(result).toEqual(expected);
    });

    it("HAPPY PATH: { amount } form spreads total delay evenly across all targets", () => {
      // amount=1 over 3 targets → step = 1 / (3-1) = 0.5
      const result = StaggerResolver.resolveDelays(3, { amount: 1 });
      const expected = [0, 0.5, 1];

      expect(result).toEqual(expected);
    });

    it("HAPPY PATH: from:'start' is the default — delays increase left to right", () => {
      // each: 0.5 (power of two) avoids floating-point drift
      const result = StaggerResolver.resolveDelays(4, { each: 0.5, from: "start" });
      const expected = [0, 0.5, 1, 1.5];

      expect(result).toEqual(expected);
    });

    it("HAPPY PATH: from:'end' reverses the order — last element starts first", () => {
      const result = StaggerResolver.resolveDelays(3, { each: 0.1, from: "end" });
      const expected = [0.2, 0.1, 0];

      expect(result).toEqual(expected);
    });

    it("HAPPY PATH: from:'center' fans out from the middle element", () => {
      // 5 elements, center index = 2, distances = [2, 1, 0, 1, 2]
      const result = StaggerResolver.resolveDelays(5, { each: 0.1, from: "center" });
      const expected = [0.2, 0.1, 0, 0.1, 0.2];

      expect(result).toEqual(expected);
    });

    it("HAPPY PATH: from:'center' with even count uses the midpoint between the two center elements", () => {
      // 4 elements, center = 1.5, distances = |0-1.5|=1.5, |1-1.5|=0.5, |2-1.5|=0.5, |3-1.5|=1.5
      // each: 0.5 (power of two) avoids floating-point drift → 1.5*0.5=0.75, 0.5*0.5=0.25
      const result = StaggerResolver.resolveDelays(4, { each: 0.5, from: "center" });
      const expected = [0.75, 0.25, 0.25, 0.75];

      expect(result).toEqual(expected);
    });

    it("HAPPY PATH: from:'edges' fans in from both ends toward the center", () => {
      // 4 elements: Math.min(i, 3-i) → [0, 1, 1, 0]
      const result = StaggerResolver.resolveDelays(4, { each: 0.1, from: "edges" });
      const expected = [0, 0.1, 0.1, 0];

      expect(result).toEqual(expected);
    });

    it("HAPPY PATH: from: numeric index uses that element as the origin", () => {
      // origin=1, distances = |0-1|, |1-1|, |2-1| = [1, 0, 1]
      const result = StaggerResolver.resolveDelays(3, { each: 0.1, from: 1 });
      const expected = [0.1, 0, 0.1];

      expect(result).toEqual(expected);
    });

    it("HAPPY PATH: from:'random' returns an array of the correct length with values that are multiples of each", () => {
      const result = StaggerResolver.resolveDelays(5, { each: 0.1, from: "random" });

      expect(result).toHaveLength(5);
      // Every delay must be one of the 5 possible multiples: 0, 0.1, 0.2, 0.3, 0.4
      const validDelays = new Set<number>([0, 0.1, 0.2, 0.3, 0.4]);
      for (const delay of result) {
        const roundedDelay: number = roundToFloat(delay, 10);
        expect(validDelays.has(roundedDelay)).toBe(true);
      }
    });

    // ===== EDGE CASES =====

    it("EDGE CASE: count=0 returns an empty array regardless of stagger config", () => {
      const resultA = StaggerResolver.resolveDelays(0, 0.1);
      const resultB = StaggerResolver.resolveDelays(0, { each: 0.5 });
      const expected: number[] = [];

      expect(resultA).toEqual(expected);
      expect(resultB).toEqual(expected);
    });

    it("EDGE CASE: count=1 always returns [0] — single element has no stagger offset", () => {
      const resultA = StaggerResolver.resolveDelays(1, 0.5);
      const resultB = StaggerResolver.resolveDelays(1, { each: 0.5 });
      const expected = [0];

      expect(resultA).toEqual(expected);
      expect(resultB).toEqual(expected);
    });

    it("EDGE CASE: { amount } with count=1 returns [0] — division by zero guard", () => {
      // step = count <= 1 ? 0 : amount / (count - 1)
      const result = StaggerResolver.resolveDelays(1, { amount: 1 });
      const expected = [0];

      expect(result).toEqual(expected);
    });

    it("EDGE CASE: each:0 produces all-zero delays regardless of from", () => {
      const result = StaggerResolver.resolveDelays(4, { each: 0, from: "end" });
      const expected = [0, 0, 0, 0];

      expect(result).toEqual(expected);
    });

    it("EDGE CASE: StaggerObject with neither each nor amount defaults to a step of 0", () => {
      const result = StaggerResolver.resolveDelays(3, {});
      const expected = [0, 0, 0];

      expect(result).toEqual(expected);
    });
  });
});
