import type { EaseString } from "@/types/easing.ts";

// ===== GSAP ease name → cubic-bezier lookup =====
// Values are [x1, y1, x2, y2] matching the CSS cubic-bezier() convention.
// elastic / bounce are omitted — they can't be expressed as a single bezier.

/**
 * A mapping of CSS easing function names to their cubic-bezier control point coordinates.
 *
 * This map provides a programmatic way to access standard CSS easing curves,
 * popular animation library curves (like GSAP's "power" series), and additional
 * utility curves (sine, circular, exponential, back/overshoot).
 *
 * Each entry maps a string alias to a tuple of four numbers `[x1, y1, x2, y2]`
 * representing the two control points of a cubic-bezier curve.
 *
 * @example
 * // Get the control points for "ease-out"
 * const [x1, y1, x2, y2] = EASE_MAP.get("ease-out");
 * // Result: [0, 0, 0.58, 1]
 *
 * @example
 * // Use with Web Animations API
 * element.animate(keyframes, {
 *   duration: 1000,
 *   easing: `cubic-bezier(${EASE_MAP.get("power2.out").join(",")})`
 * });
 *
 * @example
 * // Check if an easing name exists
 * if (EASE_MAP.has("back.inOut")) {
 *   const bezier = EASE_MAP.get("back.inOut");
 * }
 *
 * @see {@link https://easings.net/} Visual reference for easing curves
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function} MDN: easing-function
 */
const EASE_MAP = new Map<string, [number, number, number, number]>(
  Object.entries({
    // ? CSS shorthand aliases
    ease: [0.25, 0.1, 0.25, 1],
    "ease-in": [0.42, 0, 1, 1],
    "ease-out": [0, 0, 0.58, 1],
    "ease-in-out": [0.42, 0, 0.58, 1],

    // ? power1
    "power1.in": [0.55, 0.085, 0.68, 0.53],
    "power1.out": [0.25, 0.46, 0.45, 0.94],
    "power1.inOut": [0.455, 0.03, 0.515, 0.955],

    // ? power2
    "power2.in": [0.55, 0, 1, 0.45],
    "power2.out": [0, 0.55, 0.45, 1],
    "power2.inOut": [0.65, 0, 0.35, 1],

    // ? power3
    "power3.in": [0.895, 0.03, 0.685, 0.22],
    "power3.out": [0.165, 0.84, 0.44, 1],
    "power3.inOut": [0.77, 0, 0.175, 1],

    // ? power4
    "power4.in": [0.755, 0.05, 0.855, 0.06],
    "power4.out": [0.23, 1, 0.32, 1],
    "power4.inOut": [0.86, 0, 0.07, 1],

    // ? sine
    "sine.in": [0.47, 0, 0.745, 0.715],
    "sine.out": [0.39, 0.575, 0.565, 1],
    "sine.inOut": [0.445, 0.05, 0.55, 0.95],

    // ? circ
    "circ.in": [0.6, 0.04, 0.98, 0.335],
    "circ.out": [0.075, 0.82, 0.165, 1],
    "circ.inOut": [0.785, 0.135, 0.15, 0.86],

    // ? expo
    "expo.in": [0.95, 0.05, 0.795, 0.035],
    "expo.out": [0.19, 1, 0.22, 1],
    "expo.inOut": [1, 0, 0, 1],

    // ? back (overshoot)
    "back.in": [0.6, -0.28, 0.735, 0.045],
    "back.out": [0.175, 0.885, 0.32, 1.275],
    "back.inOut": [0.68, -0.55, 0.265, 1.55],
  }),
);

// ===== resolveEase =====

/**
 * Resolves a GSAP ease name or raw `[x1, y1, x2, y2]` array to a bezier tuple.
 *
 * Returns `null` for `"none"` / `"linear"` — callers should use `calcMode="linear"` instead.
 * Returns `null` for `elastic` / `bounce` — these need keyframe approximation, not a single bezier.
 * Strips parametrized suffixes like `"back.out(1.7)"` before lookup.
 *
 * @throws if the ease name is unrecognised and not elastic/bounce.
 */
export function resolveEase(
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

  if (ease === "none" || ease === "linear") return null;

  // Strip "back.out(1.7)" → "back.out"
  const normalized = ease.replace(/\(.*\)$/, "");

  if (normalized.startsWith("elastic") || normalized.startsWith("bounce")) {
    return null; // needs keyframe approximation
  }

  const bezier = EASE_MAP.get(normalized);
  if (!bezier) {
    throw new Error(
      `[gsap-to-smil] Unknown ease "${ease}". Use a named GSAP ease, "linear", or a [x1,y1,x2,y2] array.`,
    );
  }

  return bezier;
}

// ===== getSvgUniformKeyTimes =====

/**
 * Generates a uniform `keyTimes` string for a given number of keyframes.
 * e.g. `getSvgUniformKeyTimes(3)` → `"0; 0.5; 1"`
 */
export function getSvgUniformKeyTimes(keyTimesAmount: number): string {
  const keyTimesArray: number[] = [0];

  const splinesAmount: number = keyTimesAmount - 1;
  const increment: number = 1 / splinesAmount;

  for (let i = 0; i < splinesAmount; i++) {
    const currentInterpolatedValue: number = keyTimesArray.at(-1)! + increment;
    keyTimesArray.push(currentInterpolatedValue);
  }

  return keyTimesArray.join("; ");
}

// ===== getSvgKeySplines =====

/**
 * Generates a `keySplines` string by repeating the same bezier for each keyframe interval.
 * e.g. 3 keyframes → 2 splines → `"0.42 0 0.58 1; 0.42 0 0.58 1"`
 *
 * @throws if `keyTimesAmount` is falsy or if the ease resolves to null (linear/elastic/bounce).
 */
export function getSvgKeySplines(
  timingAnimation: EaseString | number[],
  keyTimesAmount: number,
): string {
  if (!keyTimesAmount) {
    throw new Error("[gsap-to-smil] keyTimesAmount must be a positive integer");
  }

  const bezier = resolveEase(timingAnimation);
  if (!bezier) {
    throw new Error(
      `[gsap-to-smil] "${timingAnimation}" resolves to linear or null — use calcMode="linear" instead of keySplines`,
    );
  }

  const stringBezier = bezier.join(" ");
  const splines: string[] = [];

  for (let i = 0; i < keyTimesAmount - 1; i++) {
    splines.push(stringBezier);
  }

  return splines.join("; ");
}

// ===== getSvgTimingFunctionString =====

/**
 * Convenience helper — returns the full `keyTimes="..." calcMode="spline" keySplines="..."` string
 * ready to be set on a SMIL element as attributes.
 */
export function getSvgTimingFunctionString(
  valuesAmount: number,
  timingAnimation: EaseString | number[],
): string {
  const keyTimes = getSvgUniformKeyTimes(valuesAmount);
  const keySplines = getSvgKeySplines(timingAnimation, valuesAmount);

  return `keyTimes="${keyTimes}" calcMode="spline" keySplines="${keySplines}"`;
}

// ===== resolveCalcMode =====

type CalcModeResult = {
  calcMode: "linear" | "spline" | "discrete";
  keySplines: string | null;
  keyTimes: string | null;
};

/**
 * Given an ease and the number of intervals (keyframes - 1), returns everything needed
 * to set easing on a SMIL element — handles the linear vs spline decision automatically.
 *
 * For `elastic` / `bounce`, falls back to linear with a warning.
 */
export function resolveCalcMode(
  ease: EaseString | number[] | undefined,
  intervalCount: number,
): CalcModeResult {
  if (!ease || ease === "none" || ease === "linear") {
    return { calcMode: "linear", keySplines: null, keyTimes: null };
  }

  const bezier = resolveEase(ease);

  if (!bezier) {
    console.warn(
      `[gsap-to-smil] "${ease}" cannot be expressed as a single cubic-bezier. Falling back to linear.`,
    );
    return { calcMode: "linear", keySplines: null, keyTimes: null };
  }

  const stringBezier = bezier.join(" ");
  const keySplines = Array.from(
    { length: intervalCount },
    () => stringBezier,
  ).join("; ");
  const keyTimes = getSvgUniformKeyTimes(intervalCount + 1);

  return { calcMode: "spline", keySplines, keyTimes };
}
