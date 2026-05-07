import type { EaseString } from "./easing.type.ts";

/**
 * Options passed to `buildAnimate()` to create a SMIL `<animate>` element.
 * Either `from`+`to` or `values` must be provided — not both.
 */
export type AnimateOptions = {
  /** SVG presentation attribute to animate, e.g. `"opacity"`, `"fill"`, `"cx"`. */
  attributeName: string;
  from?: string;
  to?: string;
  /** Semicolon-separated keyframe values, e.g. `"0; 0.5; 1"`. Overrides `from`/`to`. */
  values?: string;
  /** Duration in seconds. */
  dur: number;
  /** Delay before the animation starts, in seconds. */
  delay?: number;
  /** GSAP-style repeat count. `-1` = infinite. Converted to SMIL `repeatCount = repeat + 1`. */
  repeat?: number;
  repeatDelay?: number;
  yoyo?: boolean;
  ease?: EaseString | number[];
  /** `"freeze"` = hold end value. `"remove"` = reset to initial. Default: `"freeze"`. */
  fill?: "freeze" | "remove";
  additive?: "sum" | "replace";
};

/**
 * Options passed to `buildAnimateTransform()` to create a SMIL `<animateTransform>` element.
 * Same as `AnimateOptions` minus `attributeName` (always `"transform"`) plus the transform `type`.
 */
export type AnimateTransformOptions = Omit<AnimateOptions, "attributeName"> & {
  type: "translate" | "rotate" | "scale" | "skewX" | "skewY";
};
