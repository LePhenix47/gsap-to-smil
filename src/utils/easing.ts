import type { EaseString } from "@/types/easing.type.ts";

/**
 * Translates GSAP ease names into SMIL timing attributes.
 *
 * GSAP eases like `"power2.out"` or `"back.in(1.7)"` are resolved to cubic-bezier
 * control points, which are then converted to SMIL `calcMode`, `keyTimes`, and
 * `keySplines` attribute values for `<animate>` / `<animateTransform>` elements.
 *
 * SMIL has no native elastic or bounce easing — those fall back to `calcMode="linear"`.
 * Use keyframe approximation for accurate elastic/bounce curves.
 */
export class Easing {
  private static readonly EASE_MAP = new Map<
    string,
    [number, number, number, number]
  >(
    // ! Review some of the easing cubic Bézier values: https://easings.net, values don't seem right
    Object.entries({
      ease: [0.25, 0.1, 0.25, 1],
      "ease-in": [0.42, 0, 1, 1],
      "ease-out": [0, 0, 0.58, 1],
      "ease-in-out": [0.42, 0, 0.58, 1],

      "power1.in": [0.55, 0.085, 0.68, 0.53],
      "power1.out": [0.25, 0.46, 0.45, 0.94],
      "power1.inOut": [0.455, 0.03, 0.515, 0.955],

      "power2.in": [0.55, 0.055, 0.675, 0.19],
      "power2.out": [0.215, 0.61, 0.355, 1],
      "power2.inOut": [0.645, 0.045, 0.355, 1],

      "power3.in": [0.895, 0.03, 0.685, 0.22],
      "power3.out": [0.165, 0.84, 0.44, 1],
      "power3.inOut": [0.77, 0, 0.175, 1],

      "power4.in": [0.755, 0.05, 0.855, 0.06],
      "power4.out": [0.23, 1, 0.32, 1],
      "power4.inOut": [0.86, 0, 0.07, 1],

      "sine.in": [0.47, 0, 0.745, 0.715],
      "sine.out": [0.39, 0.575, 0.565, 1],
      "sine.inOut": [0.445, 0.05, 0.55, 0.95],
    }),
  );

  /**
   * Penner overshoot constant for back easing.
   *
   * From the standard Penner easing equation, produces ~10% overshoot
   * — the canonical GSAP back ease default when no parameter is passed.
   *
   * @see https://github.com/jesusgollonet/penner_easing/blob/master/equations.js
   */
  private static readonly PENNER_OVERSHOOT: number = 1.70158;

  /**
   * Scale factor for `back.inOut` so overshoot feels symmetric on both
   * sides of the midpoint. Without this, the first-half overshoot
   * appears weaker than the second-half.
   *
   * Value `1.525` is the empirically-tuned Penner constant.
   */
  private static readonly BACK_INOUT_AMPLITUDE: number = 1.525;

  /**
   * Base exponent for exponential easing (`2^10`).
   *
   * `10` gives a sharp but not instant curve — standard across all
   * Penner-based libraries. The same constant drives `expo.in`,
   * `expo.out`, and `expo.inOut`.
   */
  private static readonly EXPONENT_BASE: number = 10;

  /**
   * Easing math functions for curves that cannot be expressed as a
   * single cubic-bezier (back, circ, expo, elastic, bounce).
   *
   * Each function takes `timePosition` in `[0, 1]` and returns the
   * eased progress — which may overshoot outside `[0, 1]` for back
   * and elastic families.
   *
   * Sampled into `keyTimes` + `values` by `sampleProgress()` instead
   * of using `keySplines`.
   */
  private static readonly EASE_FUNCTIONS = new Map<
    string,
    (timePosition: number) => number
  >(
    Object.entries({
      // ═══════════════════════════════════════════════════════════
      // Back easing — quadratic polynomial with configurable overshoot
      // Formula:  f(t) = t² * ((s+1) * t - s)  where s = overshoot
      // ═══════════════════════════════════════════════════════════

      "back.in": (timePosition: number): number => {
        const overshoot: number = Easing.PENNER_OVERSHOOT;
        const accelerationFactor: number = overshoot + 1;
        const squaredTime: number = timePosition * timePosition;
        const overshootTerm: number =
          accelerationFactor * timePosition - overshoot;
        const easedProgress: number = squaredTime * overshootTerm;

        return easedProgress;
      },

      "back.out": (timePosition: number): number => {
        const overshoot: number = Easing.PENNER_OVERSHOOT;
        const accelerationFactor: number = overshoot + 1;
        const reversedTime: number = timePosition - 1;
        const squaredReversed: number = reversedTime * reversedTime;
        const overshootTerm: number =
          accelerationFactor * reversedTime + overshoot;
        const normalizedProgress: number = squaredReversed * overshootTerm + 1;

        return normalizedProgress;
      },

      "back.inOut": (timePosition: number): number => {
        const overshoot: number =
          Easing.PENNER_OVERSHOOT * Easing.BACK_INOUT_AMPLITUDE;
        const accelerationFactor: number = overshoot + 1;
        const doubledTime: number = timePosition * 2;

        // First half — back.in scaled to [0, 0.5]
        if (doubledTime < 1) {
          const squaredDouble: number = doubledTime * doubledTime;
          const overshootTerm: number =
            accelerationFactor * doubledTime - overshoot;
          const firstHalfProgress: number = 0.5 * squaredDouble * overshootTerm;

          return firstHalfProgress;
        }

        // Second half — back.out offset by 1, scaled to [0.5, 1]
        const shiftedTime: number = doubledTime - 2;
        const squaredShifted: number = shiftedTime * shiftedTime;
        const overshootTerm: number =
          accelerationFactor * shiftedTime + overshoot;
        const backOutCore: number = squaredShifted * overshootTerm;
        const secondHalfProgress: number = 0.5 * (backOutCore + 2);

        return secondHalfProgress;
      },

      // ═══════════════════════════════════════════════════════════
      // Circular easing — quarter-circle arc
      // Formula:  f(t) = 1 - √(1 - t²)  (in),  f(t) = √(1 - (t-1)²)  (out)
      // ═══════════════════════════════════════════════════════════

      "circ.in": (timePosition: number): number => {
        const squaredTime: number = timePosition * timePosition;
        const complementRadius: number = 1 - squaredTime;
        const distanceOnArc: number = Math.sqrt(complementRadius);
        const easedProgress: number = 1 - distanceOnArc;

        return easedProgress;
      },

      "circ.out": (timePosition: number): number => {
        const reversedTime: number = timePosition - 1;
        const squaredReversed: number = reversedTime * reversedTime;
        const complementRadius: number = 1 - squaredReversed;
        const easedProgress: number = Math.sqrt(complementRadius);

        return easedProgress;
      },

      "circ.inOut": (timePosition: number): number => {
        const doubledTime: number = timePosition * 2;

        // First half — circ.in scaled to [0, 0.5]
        if (doubledTime < 1) {
          const squaredDouble: number = doubledTime * doubledTime;
          const complementRadius: number = 1 - squaredDouble;
          const distanceOnArc: number = Math.sqrt(complementRadius);
          const distanceFromTop: number = distanceOnArc - 1;
          const firstHalfProgress: number = -0.5 * distanceFromTop;

          return firstHalfProgress;
        }

        // Second half — circ.out offset by 1, scaled to [0.5, 1]
        const shiftedTime: number = doubledTime - 2;
        const squaredShifted: number = shiftedTime * shiftedTime;
        const complementRadius: number = 1 - squaredShifted;
        const distanceOnArc: number = Math.sqrt(complementRadius);
        const secondHalfProgress: number = 0.5 * (distanceOnArc + 1);

        return secondHalfProgress;
      },

      // ═══════════════════════════════════════════════════════════
      // Exponential easing — powers of 2
      // Formula:  f(t) = 2^(10*(t-1))  (in),  f(t) = 1 - 2^(-10*t)  (out)
      // ═══════════════════════════════════════════════════════════

      "expo.in": (timePosition: number): number => {
        if (timePosition === 0) return 0;

        const exponent: number = Easing.EXPONENT_BASE * (timePosition - 1);
        const easedProgress: number = Math.pow(2, exponent);

        return easedProgress;
      },

      "expo.out": (timePosition: number): number => {
        if (timePosition === 1) return 1;

        const exponent: number = -Easing.EXPONENT_BASE * timePosition;
        const powerValue: number = Math.pow(2, exponent);
        const easedProgress: number = 1 - powerValue;

        return easedProgress;
      },

      "expo.inOut": (timePosition: number): number => {
        const isAtBoundary: boolean = [0, 1].includes(timePosition);
        if (isAtBoundary) return timePosition;

        const doubledTime: number = timePosition * 2;
        const isFirstHalf: boolean = doubledTime < 1;

        if (isFirstHalf) {
          const exponent: number = Easing.EXPONENT_BASE * (doubledTime - 1);
          const powerValue: number = Math.pow(2, exponent);
          const firstHalfProgress: number = 0.5 * powerValue;

          return firstHalfProgress;
        }

        const exponent: number = -Easing.EXPONENT_BASE * (doubledTime - 1);
        const powerValue: number = Math.pow(2, exponent);
        const invertedPower: number = 2 - powerValue;
        const secondHalfProgress: number = 0.5 * invertedPower;

        return secondHalfProgress;
      },
    }),
  );

  private static readonly SAMPLE_CACHE = new Map<string, number[]>();

  /**
   * Resolves a GSAP ease name or raw `[x1,y1,x2,y2]` array to cubic-bezier control points.
   *
   * Returns `null` for `"none"`, `"linear"`, `"elastic.*"`, and `"bounce.*"` —
   * those cannot be expressed as a single cubic-bezier.
   *
   * GSAP parameterized eases like `"back.out(1.7)"` have their parameters stripped
   * so the base name matches the EASE_MAP key.
   */
  static resolveEase(
    ease: EaseString | number[],
  ): [number, number, number, number] | null {
    if (Array.isArray(ease)) {
      if (ease.length !== 4) {
        throw new Error(
          `[gsap-to-smil] cubic-bezier array must have exactly 4 values, got ${ease.length}`,
        );
      }

      return ease as [number, number, number, number];
    }

    if (Easing.isLinearEasing(ease)) {
      return null;
    }

    // * Strip GSAP parameters, ex: "back.out(1.7)" → "back.out" for Map lookup
    const normalized: string = ease.replace(/\(.*\)$/, "");

    if (normalized.startsWith("elastic") || normalized.startsWith("bounce")) {
      return null;
    }

    const bezier = Easing.EASE_MAP.get(normalized);
    if (!bezier) {
      throw new Error(
        `[gsap-to-smil] Unknown ease "${ease}". Use a named GSAP ease, "linear", or a [x1,y1,x2,y2] array.`,
      );
    }

    return bezier;
  }

  /**
   * Determines the SMIL `calcMode` for a given ease.
   *
   * - `"linear"` — for `"none"`, `"linear"`, `undefined`, elastic/bounce fallback
   * - `"spline"` — for any ease that resolves to a cubic-bezier
   * - `"discrete"` — reserved for stepped eases (not yet implemented)
   */
  static resolveCalcMode = (
    ease: EaseString | number[] | undefined,
  ): "linear" | "spline" | "discrete" => {
    if (
      ease === undefined ||
      (typeof ease === "string" && Easing.isLinearEasing(ease))
    ) {
      return "linear";
    }

    if (typeof ease === "string" && Easing.needsSampling(ease)) {
      return "linear";
    }

    const bezier = Easing.resolveEase(ease);

    if (bezier === null) {
      console.warn(
        `[gsap-to-smil] "${ease}" cannot be expressed as a single cubic-bezier. Falling back to linear.`,
      );
      return "linear";
    }

    return "spline";
  };

  /**
   * Generates evenly-spaced `keyTimes` values for `intervalCount` keyframe intervals.
   *
   * `keyTimes` is a semicolon-separated list of 0→1 positions marking the boundaries
   * between keyframe intervals. For `N` intervals there are `N+1` positions:
   *
   * - 1 interval → `"0; 1"`
   * - 2 intervals → `"0; 0.5; 1"`
   * - 3 intervals → `"0; 0.333; 0.667; 1"`
   *
   * SMIL requires `keyTimes` whenever `calcMode="spline"` and `keySplines` is set.
   */
  static resolveKeyTimes(intervalCount: number): string {
    const keyTimesArray: number[] = [0];
    const increment: number = 1 / intervalCount;

    for (let i = 0; i < intervalCount; i++) {
      const previousValue: number = keyTimesArray.at(-1)!;
      keyTimesArray.push(previousValue + increment);
    }

    return keyTimesArray.join("; ");
  }

  /**
   * Generates `keySplines` — one cubic-bezier per keyframe interval, semicolon-separated.
   *
   * For a given ease and `intervalCount`, the bezier is repeated for every interval
   * since SMIL applies the same easing to each segment unless overridden per-segment.
   *
   * Returns `null` when the ease resolves to linear (no bezier available) — caller
   * should use `calcMode="linear"` and skip `keySplines`/`keyTimes`.
   *
   * Example: `resolveKeySplines("power1.out", 2)` → `"0.25 0.46 0.45 0.94; 0.25 0.46 0.45 0.94"`
   */
  static resolveKeySplines(
    ease: EaseString | number[],
    intervalCount: number,
  ): string | null {
    if (!intervalCount) {
      throw new Error(
        "[gsap-to-smil] intervalCount must be a positive integer",
      );
    }

    const bezier = Easing.resolveEase(ease);
    if (!bezier) {
      return null;
    }

    const stringBezier = bezier.join(" ");
    const splines = Array.from({ length: intervalCount }, () => stringBezier);

    return splines.join("; ");
  }

  static needsSampling = (ease: EaseString | number[] | undefined): boolean => {
    if (ease === undefined || ease === null) return false;
    if (Array.isArray(ease)) return false;

    const normalized: string = ease.replace(/\(.*\)$/, "");
    const hasEasingFunction: boolean = Easing.EASE_FUNCTIONS.has(normalized);
    const isElasticFamily: boolean = normalized.startsWith("elastic");
    const isBounceFamily: boolean = normalized.startsWith("bounce");

    return hasEasingFunction || isElasticFamily || isBounceFamily;
  };

  static sampleProgress = (
    ease: EaseString,
    pointCount: number = 20,
  ): number[] | null => {
    const normalized: string = ease.replace(/\(.*\)$/, "");
    const cacheKey: string = `${normalized}:${pointCount}`;

    const cachedEntry: number[] | undefined = Easing.SAMPLE_CACHE.get(cacheKey);
    if (cachedEntry !== undefined) return cachedEntry;

    const easingFunction = Easing.EASE_FUNCTIONS.get(normalized);
    if (easingFunction === undefined) return null;

    const sampleCount: number = pointCount;
    const progressValues: number[] = [];
    const timeIncrement: number = 1 / (sampleCount - 1);

    for (let index = 0; index < sampleCount; index++) {
      const timePosition: number = index * timeIncrement;

      const progressValue: number = easingFunction(timePosition);
      progressValues.push(progressValue);
    }

    // Force exact endpoints — floating-point drift on the increment
    // can leave the last value at 0.9999 instead of 1.0
    progressValues[0] = easingFunction(0);
    progressValues[sampleCount - 1] = easingFunction(1);

    Easing.SAMPLE_CACHE.set(cacheKey, progressValues);
    return progressValues;
  };

  private static isLinearEasing(ease: EaseString): ease is "none" | "linear" {
    return ["none", "linear"].includes(ease);
  }
}
