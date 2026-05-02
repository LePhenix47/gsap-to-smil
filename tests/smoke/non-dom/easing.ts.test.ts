// fallow-ignore-next-line
import { describe, expect, it } from "bun:test";
import {
  resolveEase,
  getSvgKeySplines,
  getSvgUniformKeyTimes,
  resolveCalcMode,
} from "@/utils/easing.ts";

describe("easing (smoke)", () => {
  it("SMOKE TEST: keySplines never ends with a trailing semicolon (Chrome silently drops animation if it does)", () => {
    const easeNames = [
      "power1.in",
      "power1.out",
      "power1.inOut",
      "power2.in",
      "power2.out",
      "power2.inOut",
      "sine.in",
      "sine.out",
      "sine.inOut",
      "back.out",
      "circ.inOut",
      "expo.in",
    ] as const;

    for (const ease of easeNames) {
      for (const intervalCount of [1, 2, 3]) {
        const result = getSvgKeySplines(ease, intervalCount + 1);

        expect(result.trimEnd().endsWith(";")).toBe(false);
      }
    }
  });

  it("SMOKE TEST: keySplines interval count is always keyTimes count − 1", () => {
    const easeName = "power2.out";

    for (const keyframeCount of [2, 3, 4, 5]) {
      const keyTimes = getSvgUniformKeyTimes(keyframeCount);
      const keySplines = getSvgKeySplines(easeName, keyframeCount);

      const keyTimesCount = keyTimes.split(";").length;
      const keySplinesCount = keySplines.split(";").length;

      expect(keySplinesCount).toBe(keyTimesCount - 1);
    }
  });

  it("SMOKE TEST: resolveCalcMode keySplines and keyTimes are always in sync (splines = times − 1)", () => {
    const easeName = "sine.inOut";

    for (const intervalCount of [1, 2, 3, 4]) {
      const result = resolveCalcMode(easeName, intervalCount);

      const keyTimesCount = result.keyTimes!.split(";").length;
      const keySplinesCount = result.keySplines!.split(";").length;

      expect(result.calcMode).toBe("spline");
      expect(keySplinesCount).toBe(keyTimesCount - 1);
    }
  });

  it("SMOKE TEST: parametrized ease and its canonical form produce identical keySplines", () => {
    const parametrized = "back.out(1.7)";
    const canonical = "back.out";
    const keyframeCount = 2;

    const result = getSvgKeySplines(parametrized, keyframeCount);
    const expected = getSvgKeySplines(canonical, keyframeCount);

    expect(result).toBe(expected);
  });

  it("SMOKE TEST: custom bezier array and its equivalent named ease produce identical resolveCalcMode output", () => {
    const namedEase = "power1.inOut";
    const customBezier = resolveEase(namedEase)!;
    const intervalCount = 2;

    const fromName = resolveCalcMode(namedEase, intervalCount);
    const fromArray = resolveCalcMode(customBezier, intervalCount);

    expect(fromArray.calcMode).toBe(fromName.calcMode);
    expect(fromArray.keySplines).toBe(fromName.keySplines);
    expect(fromArray.keyTimes).toBe(fromName.keyTimes);
  });
});
