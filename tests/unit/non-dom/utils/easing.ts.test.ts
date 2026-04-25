import { expect, describe, it, spyOn } from "bun:test";
import {
  resolveEase,
  getSvgUniformKeyTimes,
  getSvgKeySplines,
  getSvgTimingFunctionString,
  resolveCalcMode,
} from "@/utils/easing.ts";

describe("easing", () => {
  // ===== resolveEase =====

  describe("resolveEase", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: known ease name returns its bezier control points", () => {
      const easeName = "power2.out";

      const result = resolveEase(easeName);
      const expected: [number, number, number, number] = [0, 0.55, 0.45, 1];

      expect(result).toEqual(expected);
    });

    it("HAPPY PATH: raw [x1,y1,x2,y2] array is returned as-is", () => {
      const customBezier: [number, number, number, number] = [0.42, 0, 0.58, 1];

      const result = resolveEase(customBezier);
      const expected = customBezier;

      expect(result).toEqual(expected);
    });

    it("HAPPY PATH: 'none' returns null — caller should use calcMode=linear", () => {
      const result = resolveEase("none");
      const expected = null;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: 'linear' returns null — caller should use calcMode=linear", () => {
      const result = resolveEase("linear");
      const expected = null;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: elastic ease returns null — cannot be expressed as a single bezier", () => {
      const result = resolveEase("elastic.out");
      const expected = null;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: bounce ease returns null — cannot be expressed as a single bezier", () => {
      const result = resolveEase("bounce.in");
      const expected = null;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: parametrized suffix is stripped before lookup — 'back.out(1.7)' resolves as 'back.out'", () => {
      const parametrized = "back.out(1.7)";
      const canonical = "back.out";

      const result = resolveEase(parametrized);
      const expected = resolveEase(canonical);

      expect(result).toEqual(expected);
    });

    // ===== EDGE CASES =====

    it("EDGE CASE: unrecognised ease name throws", () => {
      expect(() => resolveEase("totally.unknown")).toThrow();
    });

    it("EDGE CASE: raw array with wrong length throws", () => {
      const badArray: number[] = [0.42, 0, 0.58];

      expect(() => resolveEase(badArray)).toThrow();
    });
  });

  // ===== getSvgUniformKeyTimes =====

  describe("getSvgUniformKeyTimes", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: 2 keyframes produces '0; 1'", () => {
      const keyframeCount = 2;

      const result = getSvgUniformKeyTimes(keyframeCount);
      const expected = "0; 1";

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: 3 keyframes produces '0; 0.5; 1'", () => {
      const keyframeCount = 3;

      const result = getSvgUniformKeyTimes(keyframeCount);
      const expected = "0; 0.5; 1";

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: 5 keyframes produces 4 evenly spaced intervals", () => {
      const keyframeCount = 5;

      const result = getSvgUniformKeyTimes(keyframeCount);
      const expected = "0; 0.25; 0.5; 0.75; 1";

      expect(result).toBe(expected);
    });
  });

  // ===== getSvgKeySplines =====

  describe("getSvgKeySplines", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: 2 keyframes (1 interval) produces a single bezier string", () => {
      const easeName = "power1.inOut";
      const keyframeCount = 2;
      const [x1, y1, x2, y2] = resolveEase(easeName)!;

      const result = getSvgKeySplines(easeName, keyframeCount);
      const expected = `${x1} ${y1} ${x2} ${y2}`;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: 3 keyframes (2 intervals) repeats the bezier twice separated by semicolon", () => {
      const easeName = "sine.out";
      const keyframeCount = 3;
      const [x1, y1, x2, y2] = resolveEase(easeName)!;
      const singleSpline = `${x1} ${y1} ${x2} ${y2}`;

      const result = getSvgKeySplines(easeName, keyframeCount);
      const expected = `${singleSpline}; ${singleSpline}`;

      expect(result).toBe(expected);
    });

    // ===== EDGE CASES =====

    it("EDGE CASE: keyTimesAmount=0 throws", () => {
      expect(() => getSvgKeySplines("power1.out", 0)).toThrow();
    });

    it("EDGE CASE: linear ease throws — use calcMode=linear instead of keySplines", () => {
      expect(() => getSvgKeySplines("linear", 2)).toThrow();
    });
  });

  // ===== getSvgTimingFunctionString =====

  describe("getSvgTimingFunctionString", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: produces a correctly formatted keyTimes + calcMode + keySplines string", () => {
      const easeName = "power1.out";
      const keyframeCount = 2;
      const expectedKeyTimes = getSvgUniformKeyTimes(keyframeCount);
      const expectedKeySplines = getSvgKeySplines(easeName, keyframeCount);

      const result = getSvgTimingFunctionString(keyframeCount, easeName);
      const expected = `keyTimes="${expectedKeyTimes}" calcMode="spline" keySplines="${expectedKeySplines}"`;

      expect(result).toBe(expected);
    });
  });

  // ===== resolveCalcMode =====

  describe("resolveCalcMode", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: undefined ease returns linear mode with no keyTimes or keySplines", () => {
      const result = resolveCalcMode(undefined, 1);
      const expected = { calcMode: "linear" as const, keySplines: null, keyTimes: null };

      expect(result).toEqual(expected);
    });

    it("HAPPY PATH: 'none' returns linear mode", () => {
      const result = resolveCalcMode("none", 1);
      const expected = { calcMode: "linear" as const, keySplines: null, keyTimes: null };

      expect(result).toEqual(expected);
    });

    it("HAPPY PATH: 'linear' returns linear mode", () => {
      const result = resolveCalcMode("linear", 1);
      const expected = { calcMode: "linear" as const, keySplines: null, keyTimes: null };

      expect(result).toEqual(expected);
    });

    it("HAPPY PATH: cubic bezier ease with 1 interval returns spline mode", () => {
      const easeName = "power2.inOut";
      const intervalCount = 1;
      const [x1, y1, x2, y2] = resolveEase(easeName)!;

      const result = resolveCalcMode(easeName, intervalCount);

      expect(result.calcMode).toBe("spline");
      expect(result.keySplines).toBe(`${x1} ${y1} ${x2} ${y2}`);
      expect(result.keyTimes).toBe("0; 1");
    });

    it("HAPPY PATH: cubic bezier ease with 2 intervals repeats the spline twice", () => {
      const easeName = "sine.inOut";
      const intervalCount = 2;
      const [x1, y1, x2, y2] = resolveEase(easeName)!;
      const singleSpline = `${x1} ${y1} ${x2} ${y2}`;

      const result = resolveCalcMode(easeName, intervalCount);

      expect(result.calcMode).toBe("spline");
      expect(result.keySplines).toBe(`${singleSpline}; ${singleSpline}`);
      expect(result.keyTimes).toBe("0; 0.5; 1");
    });

    // ===== EDGE CASES =====

    it("EDGE CASE: elastic ease falls back to linear and emits a console warning", () => {
      const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

      const result = resolveCalcMode("elastic.out", 1);
      const expected = { calcMode: "linear" as const, keySplines: null, keyTimes: null };

      expect(result).toEqual(expected);
      expect(warnSpy).toHaveBeenCalledTimes(1);

      warnSpy.mockRestore();
    });

    it("EDGE CASE: bounce ease falls back to linear and emits a console warning", () => {
      const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

      const result = resolveCalcMode("bounce.out", 1);
      const expected = { calcMode: "linear" as const, keySplines: null, keyTimes: null };

      expect(result).toEqual(expected);
      expect(warnSpy).toHaveBeenCalledTimes(1);

      warnSpy.mockRestore();
    });
  });
});
