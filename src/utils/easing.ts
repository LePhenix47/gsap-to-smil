import type { EaseString } from "@/types/easing.ts";

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

  private static isLinearEasing(ease: EaseString): boolean {
    // TODO: I wanted to use a return type here: ease is Pick<EaseString, "none" | "linear">

    return ["none", "linear"].includes(ease);
  }

  static resolveEase(
    ease: EaseString | number[],
  ): [number, number, number, number] | null {
    // ? If it's an array of numbers, it's a cubic-bezier value
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

    // ! I don't exactly understand the point of this part ?
    const normalized: string = ease.replace(/\(.*\)$/, "");
    /**
     * // I tested that regex on the browser: verdict → Regex is useless
     *  const easeKeysArr = Object.keys(Object.fromEntries(EASE_MAP))
     *  easeKeysArr.forEach(k=>{
     *  const normalized = k.replace(/\(.*\)$/, "");
     *  console.log(k, normalized, "same ?", k === normalized)
     *  })
     */

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

  static uniformKeyTimes(keyTimesAmount: number): string {
    // ! "What is a keyTime again ?" Is something I'd ask myself if I were to go back into this class again
    // ! We need a JSDoc, and if possible one that cross-references the docs/ and/or describes a summary of what it is
    // ! It's doing a terrible job at explaining what we're doing here
    // ! Essentially we want to generate an array of keyTimes that are evenly distributed between 0 and 1
    const keyTimesArray: number[] = [0];
    const splinesAmount: number = keyTimesAmount - 1;
    const increment: number = 1 / splinesAmount;

    for (let i = 0; i < splinesAmount; i++) {
      const currentInterpolatedValue: number =
        keyTimesArray.at(-1)! + increment;

      keyTimesArray.push(currentInterpolatedValue);
    }

    return keyTimesArray.join("; ");
  }

  // TODO: For much later, fir the "keyframes" Not sure so we gotta discuss this first, when it comes to keyframes, the keyTimes aren't uniformaly distributed ? IDK, DO NOT implement anything without discussion

  static keySplines(
    timingAnimation: EaseString | number[],
    keyTimesAmount: number,
  ): string {
    // ! "What is a keySpline ?"" if I checkout the code 6 months from now
    if (!keyTimesAmount) {
      throw new Error(
        "[gsap-to-smil] keyTimesAmount must be a positive integer",
      );
    }

    const bezier = Easing.resolveEase(timingAnimation);
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

  // ! Not explicit enough for a method name, you're generating the attributes for the keyframes as a string
  static timingFunctionString(
    valuesAmount: number,
    timingAnimation: EaseString | number[],
  ): string {
    const keyTimes = Easing.uniformKeyTimes(valuesAmount);
    const keySplines = Easing.keySplines(timingAnimation, valuesAmount);

    return `keyTimes="${keyTimes}" calcMode="spline" keySplines="${keySplines}"`;
  }

  // ! Not explicit enough for a method name, again
  static resolveCalcMode(
    ease: EaseString | number[] | undefined,
    intervalCount: number,
  ): {
    calcMode: "linear" | "spline" | "discrete";
    keySplines: string | null;
    keyTimes: string | null;
  } {
    if (!ease || ease === "none" || ease === "linear") {
      return { calcMode: "linear", keySplines: null, keyTimes: null };
    }

    const bezier = Easing.resolveEase(ease);

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
    const keyTimes = Easing.uniformKeyTimes(intervalCount + 1);

    return { calcMode: "spline", keySplines, keyTimes };
  }
}
