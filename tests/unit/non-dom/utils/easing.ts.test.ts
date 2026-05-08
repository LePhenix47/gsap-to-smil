// fallow-ignore-file
import { expect, describe, it, spyOn } from "bun:test";
import { Easing } from "@/utils/easing.ts";

describe("easing", () => {
  // ===== resolveEase =====

  describe("resolveEase", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: known ease name returns its bezier control points", () => {
      const easeName = "power2.out";

      const result = Easing.resolveEase(easeName);
      const expected: [number, number, number, number] = [
        0.215, 0.61, 0.355, 1,
      ];

      expect(result).toEqual(expected);
    });

    it("HAPPY PATH: raw [x1,y1,x2,y2] array is returned as-is", () => {
      const customBezier: [number, number, number, number] = [0.42, 0, 0.58, 1];

      const result = Easing.resolveEase(customBezier);
      const expected = customBezier;

      expect(result).toEqual(expected);
    });

    it("HAPPY PATH: 'none' returns null — caller should use calcMode=linear", () => {
      const result = Easing.resolveEase("none");
      const expected = null;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: 'linear' returns null — caller should use calcMode=linear", () => {
      const result = Easing.resolveEase("linear");
      const expected = null;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: elastic ease returns null — cannot be expressed as a single bezier", () => {
      const result = Easing.resolveEase("elastic.out");
      const expected = null;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: bounce ease returns null — cannot be expressed as a single bezier", () => {
      const result = Easing.resolveEase("bounce.in");
      const expected = null;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: parametrized suffix is stripped before lookup — 'back.out(1.7)' resolves as 'back.out'", () => {
      const parametrized = "back.out(1.7)";
      const canonical = "back.out";

      const result = Easing.resolveEase(parametrized);
      const expected = Easing.resolveEase(canonical);

      expect(result).toEqual(expected);
    });

    // ===== EDGE CASES =====

    it("EDGE CASE: unrecognised ease name throws", () => {
      const ease = "totally.unknown";
      expect(() => Easing.resolveEase(ease)).toThrow(
        `[gsap-to-smil] Unknown ease "${ease}". Use a named GSAP ease, "linear", or a [x1,y1,x2,y2] array.`,
      );
    });

    it("EDGE CASE: raw array with wrong length throws", () => {
      const badArray: number[] = [0.42, 0, 0.58];

      expect(() => Easing.resolveEase(badArray)).toThrow(
        `[gsap-to-smil] cubic-bezier array must have exactly 4 values, got ${badArray.length}`,
      );
    });

    it("EDGE CASE: raw array with a value below 0 throws — SMIL cubic-bezier requires all values in [0,1]", () => {
      const underflowArray: [number, number, number, number] = [
        0.42, -0.2, 0.58, 1,
      ];

      expect(() => Easing.resolveEase(underflowArray)).toThrow(
        "[gsap-to-smil] in SMIL cubic-bezier values must be between 0 and 1",
      );
    });

    it("EDGE CASE: raw array with a value above 1 throws — SMIL cubic-bezier requires all values in [0,1]", () => {
      const overflowArray: [number, number, number, number] = [
        0.42, 0, 0.58, 1.4,
      ];

      expect(() => Easing.resolveEase(overflowArray)).toThrow(
        "[gsap-to-smil] in SMIL cubic-bezier values must be between 0 and 1",
      );
    });
  });

  // ===== resolveCalcMode =====

  describe("resolveCalcMode", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: undefined ease returns linear", () => {
      const result = Easing.resolveCalcMode(undefined);
      const expected = "linear";

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: 'none' returns linear", () => {
      const result = Easing.resolveCalcMode("none");
      const expected = "linear";

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: 'linear' returns linear", () => {
      const result = Easing.resolveCalcMode("linear");
      const expected = "linear";

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: cubic bezier ease returns spline", () => {
      const result = Easing.resolveCalcMode("power2.inOut");

      expect(result).toBe("spline");
    });

    it("HAPPY PATH: raw bezier array returns spline", () => {
      const customBezier: [number, number, number, number] = [0.42, 0, 0.58, 1];

      const result = Easing.resolveCalcMode(customBezier);

      expect(result).toBe("spline");
    });

    // ===== EDGE CASES =====

    it("EDGE CASE: elastic ease falls back to linear and emits a console warning", () => {
      const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

      const result = Easing.resolveCalcMode("elastic.out");

      expect(result).toBe("linear");
      expect(warnSpy).toHaveBeenCalledTimes(1);

      warnSpy.mockRestore();
    });

    it("EDGE CASE: bounce ease falls back to linear and emits a console warning", () => {
      const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

      const result = Easing.resolveCalcMode("bounce.out");

      expect(result).toBe("linear");
      expect(warnSpy).toHaveBeenCalledTimes(1);

      warnSpy.mockRestore();
    });
  });

  // ===== resolveKeyTimes =====

  describe("resolveKeyTimes", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: 1 interval produces '0; 1'", () => {
      const result = Easing.resolveKeyTimes(1);
      const expected = "0; 1";

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: 2 intervals produces '0; 0.5; 1'", () => {
      const result = Easing.resolveKeyTimes(2);
      const expected = "0; 0.5; 1";

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: 4 intervals produces evenly spaced positions", () => {
      const result = Easing.resolveKeyTimes(4);
      const expected = "0; 0.25; 0.5; 0.75; 1";

      expect(result).toBe(expected);
    });
  });

  // ===== resolveKeySplines =====

  describe("resolveKeySplines", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: 1 interval produces a single bezier string", () => {
      const easeName = "power1.inOut";
      const [x1, y1, x2, y2] = Easing.resolveEase(easeName)!;

      const result = Easing.resolveKeySplines(easeName, 1);
      const expected = `${x1} ${y1} ${x2} ${y2}`;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: 2 intervals repeats the bezier twice separated by semicolon", () => {
      const easeName = "sine.out";
      const [x1, y1, x2, y2] = Easing.resolveEase(easeName)!;
      const singleSpline = `${x1} ${y1} ${x2} ${y2}`;

      const result = Easing.resolveKeySplines(easeName, 2);
      const expected = `${singleSpline}; ${singleSpline}`;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: linear ease returns null — caller should skip keySplines", () => {
      const result = Easing.resolveKeySplines("linear", 1);

      expect(result).toBeNull();
    });

    it("HAPPY PATH: 'none' ease returns null — caller should skip keySplines", () => {
      const result = Easing.resolveKeySplines("none", 2);

      expect(result).toBeNull();
    });

    // ===== EDGE CASES =====

    it("EDGE CASE: intervalCount=0 throws", () => {
      expect(() => Easing.resolveKeySplines("power1.out", 0)).toThrow();
    });
  });
});
