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

      "power2.in": [0.55, 0, 1, 0.45],
      "power2.out": [0, 0.55, 0.45, 1],
      "power2.inOut": [0.65, 0, 0.35, 1],

      "power3.in": [0.895, 0.03, 0.685, 0.22],
      "power3.out": [0.165, 0.84, 0.44, 1],
      "power3.inOut": [0.77, 0, 0.175, 1],

      "power4.in": [0.755, 0.05, 0.855, 0.06],
      "power4.out": [0.23, 1, 0.32, 1],
      "power4.inOut": [0.86, 0, 0.07, 1],

      "sine.in": [0.47, 0, 0.745, 0.715],
      "sine.out": [0.39, 0.575, 0.565, 1],
      "sine.inOut": [0.445, 0.05, 0.55, 0.95],

      "circ.in": [0.6, 0.04, 0.98, 0.335],
      "circ.out": [0.075, 0.82, 0.165, 1],
      "circ.inOut": [0.785, 0.135, 0.15, 0.86],

      "expo.in": [0.95, 0.05, 0.795, 0.035],
      "expo.out": [0.19, 1, 0.22, 1],
      "expo.inOut": [1, 0, 0, 1],

      "back.in": [0.6, -0.28, 0.735, 0.045],
      "back.out": [0.175, 0.885, 0.32, 1.275],
      "back.inOut": [0.68, -0.55, 0.265, 1.55],
    }),
  );

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
  static resolveCalcMode(
    ease: EaseString | number[] | undefined,
  ): "linear" | "spline" | "discrete" {
    if (!ease || (typeof ease === "string" && Easing.isLinearEasing(ease))) {
      return "linear";
    }

    const bezier = Easing.resolveEase(ease);

    if (!bezier) {
      console.warn(
        `[gsap-to-smil] "${ease}" cannot be expressed as a single cubic-bezier. Falling back to linear.`,
      );
      return "linear";
    }

    return "spline";
  }

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

  private static isLinearEasing(ease: EaseString): ease is "none" | "linear" {
    return ["none", "linear"].includes(ease);
  }
}
