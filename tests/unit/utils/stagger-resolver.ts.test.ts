import { expect, describe, it } from "bun:test";
import { resolveStaggerDelays } from "@/utils/stagger-resolver.ts";

describe("stagger-resolver", () => {
  describe("resolveStaggerDelays", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: simple number stagger produces evenly spaced delays from index 0", () => {
      expect(resolveStaggerDelays(3, 0.1)).toEqual([0, 0.1, 0.2]);
    });

    it("HAPPY PATH: { each } form behaves identically to a plain number stagger", () => {
      expect(resolveStaggerDelays(3, { each: 0.1 })).toEqual([0, 0.1, 0.2]);
    });

    it("HAPPY PATH: { amount } form spreads total delay evenly across all targets", () => {
      // amount=1 over 3 targets → step = 1 / (3-1) = 0.5
      expect(resolveStaggerDelays(3, { amount: 1 })).toEqual([0, 0.5, 1]);
    });

    it("HAPPY PATH: from:'start' is the default — delays increase left to right", () => {
      // each: 0.5 (power of two) avoids floating-point drift
      expect(resolveStaggerDelays(4, { each: 0.5, from: "start" })).toEqual([0, 0.5, 1, 1.5]);
    });

    it("HAPPY PATH: from:'end' reverses the order — last element starts first", () => {
      expect(resolveStaggerDelays(3, { each: 0.1, from: "end" })).toEqual([0.2, 0.1, 0]);
    });

    it("HAPPY PATH: from:'center' fans out from the middle element", () => {
      // 5 elements, center index = 2, distances = [2, 1, 0, 1, 2]
      expect(resolveStaggerDelays(5, { each: 0.1, from: "center" })).toEqual([0.2, 0.1, 0, 0.1, 0.2]);
    });

    it("HAPPY PATH: from:'center' with even count uses the midpoint between the two center elements", () => {
      // 4 elements, center = 1.5, distances = |0-1.5|=1.5, |1-1.5|=0.5, |2-1.5|=0.5, |3-1.5|=1.5
      // each: 0.5 (power of two) avoids floating-point drift → 1.5*0.5=0.75, 0.5*0.5=0.25
      expect(resolveStaggerDelays(4, { each: 0.5, from: "center" })).toEqual([0.75, 0.25, 0.25, 0.75]);
    });

    it("HAPPY PATH: from:'edges' fans in from both ends toward the center", () => {
      // 4 elements: Math.min(i, 3-i) → [0, 1, 1, 0]
      expect(resolveStaggerDelays(4, { each: 0.1, from: "edges" })).toEqual([0, 0.1, 0.1, 0]);
    });

    it("HAPPY PATH: from: numeric index uses that element as the origin", () => {
      // origin=1, distances = |0-1|, |1-1|, |2-1| = [1, 0, 1]
      expect(resolveStaggerDelays(3, { each: 0.1, from: 1 })).toEqual([0.1, 0, 0.1]);
    });

    it("HAPPY PATH: from:'random' returns an array of the correct length with values that are multiples of each", () => {
      const result = resolveStaggerDelays(5, { each: 0.1, from: "random" });

      expect(result).toHaveLength(5);
      // Every delay must be one of the 5 possible multiples: 0, 0.1, 0.2, 0.3, 0.4
      const validDelays = new Set([0, 0.1, 0.2, 0.3, 0.4]);
      for (const delay of result) {
        expect(validDelays.has(Math.round(delay * 10) / 10)).toBe(true);
      }
    });

    // ===== EDGE CASES =====

    it("EDGE CASE: count=0 returns an empty array regardless of stagger config", () => {
      expect(resolveStaggerDelays(0, 0.1)).toEqual([]);
      expect(resolveStaggerDelays(0, { each: 0.5 })).toEqual([]);
    });

    it("EDGE CASE: count=1 always returns [0] — single element has no stagger offset", () => {
      expect(resolveStaggerDelays(1, 0.5)).toEqual([0]);
      expect(resolveStaggerDelays(1, { each: 0.5 })).toEqual([0]);
    });

    it("EDGE CASE: { amount } with count=1 returns [0] — division by zero guard", () => {
      // step = count <= 1 ? 0 : amount / (count - 1)
      expect(resolveStaggerDelays(1, { amount: 1 })).toEqual([0]);
    });

    it("EDGE CASE: each:0 produces all-zero delays regardless of from", () => {
      expect(resolveStaggerDelays(4, { each: 0, from: "end" })).toEqual([0, 0, 0, 0]);
    });

    it("EDGE CASE: StaggerObject with neither each nor amount defaults to a step of 0", () => {
      expect(resolveStaggerDelays(3, {})).toEqual([0, 0, 0]);
    });
  });
});
