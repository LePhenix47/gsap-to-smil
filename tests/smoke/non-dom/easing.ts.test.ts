// fallow-ignore-file
import { describe, expect, it } from "bun:test";
import { Easing } from "@/utils/easing.ts";

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
        const result = Easing.resolveKeySplines(ease, intervalCount);

        expect(result?.trimEnd().endsWith(";")).toBe(false);
      }
    }
  });

  it("SMOKE TEST: keySplines interval count is always keyTimes count − 1", () => {
    const easeName = "power2.out";

    for (const intervalCount of [1, 2, 3, 4]) {
      const keyTimes = Easing.resolveKeyTimes(intervalCount);
      const keySplines = Easing.resolveKeySplines(easeName, intervalCount);

      const keyTimesCount = keyTimes.split(";").length;
      const keySplinesCount = keySplines!.split(";").length;

      expect(keySplinesCount).toBe(keyTimesCount - 1);
    }
  });

  it("SMOKE TEST: resolveKeyTimes and resolveKeySplines are always in sync (splines = times − 1)", () => {
    const easeName = "sine.inOut";

    for (const intervalCount of [1, 2, 3, 4]) {
      const calcMode = Easing.resolveCalcMode(easeName);
      const keyTimes = Easing.resolveKeyTimes(intervalCount);
      const keySplines = Easing.resolveKeySplines(easeName, intervalCount);

      const keyTimesCount = keyTimes.split(";").length;
      const keySplinesCount = keySplines!.split(";").length;

      expect(calcMode).toBe("spline");
      expect(keySplinesCount).toBe(keyTimesCount - 1);
    }
  });

  it("SMOKE TEST: parametrized ease and its canonical form produce identical keySplines", () => {
    const parametrized = "back.out(1.7)";
    const canonical = "back.out";

    const result = Easing.resolveKeySplines(parametrized, 1);
    const expected = Easing.resolveKeySplines(canonical, 1);

    expect(result).toBe(expected);
  });

  it("SMOKE TEST: custom bezier array and its equivalent named ease produce identical outputs", () => {
    const namedEase = "power1.inOut";
    const customBezier = Easing.resolveEase(namedEase)!;
    const intervalCount = 2;

    const calcFromName = Easing.resolveCalcMode(namedEase);
    const calcFromArray = Easing.resolveCalcMode(customBezier);

    expect(calcFromArray).toBe(calcFromName);
  });
});
