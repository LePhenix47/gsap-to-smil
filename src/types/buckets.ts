import type { EaseString } from "./easing.ts";
import type { AttrVars } from "./attr.ts";
import type { StaggerObject } from "./stagger.ts";
import type { DrawSVGValue, MotionPathVars, MorphSVGVars } from "./plugins.ts";

/**
 * Transform shorthand keys from `TweenVars` that map to `<animateTransform>`.
 * Canonical output order: translate → rotate → scale → skewX → skewY.
 */
export type TransformProps = {
  x?: number | string;
  y?: number | string;
  z?: number | string;
  xPercent?: number | string;
  yPercent?: number | string;
  rotation?: number | string;
  rotationX?: number | string;
  rotationY?: number | string;
  scale?: number | string;
  scaleX?: number | string;
  scaleY?: number | string;
  skewX?: number | string;
  skewY?: number | string;
};

/**
 * Top-level SVG presentation attribute keys that map directly to `<animate>`.
 * Includes an index signature for any unknown attribute names routed here.
 */
export type DirectProps = {
  opacity?: number | string;
  fill?: string;
  stroke?: string;
  [key: string]: number | string | undefined;
};

/**
 * Resolved tween control properties with all defaults filled in.
 * Produced by `routeProperties()` — not user-facing.
 */
export type SpecialProps = {
  duration: number;
  delay: number;
  ease: EaseString | number[];
  repeat: number;
  repeatDelay: number;
  yoyo: boolean;
  yoyoEase: EaseString | boolean | undefined;
  stagger: number | StaggerObject | undefined;
  paused: boolean;
  reversed: boolean;
  id: string | undefined;
  data: unknown;
  immediateRender: boolean;
  transformOrigin: string | undefined;
  onStart: ((...args: unknown[]) => void) | undefined;
  onStartParams: unknown[] | undefined;
  onComplete: ((...args: unknown[]) => void) | undefined;
  onCompleteParams: unknown[] | undefined;
  onRepeat: ((...args: unknown[]) => void) | undefined;
  onRepeatParams: unknown[] | undefined;
  onReverseComplete: ((...args: unknown[]) => void) | undefined;
  onReverseCompleteParams: unknown[] | undefined;
};

/**
 * Result of `routeProperties()` — a `TweenVars` object split into typed buckets
 * so each layer of the build pipeline only sees what it needs.
 */
export type PropertyBuckets = {
  /** Keys routed to `<animateTransform>`. */
  transforms: TransformProps;
  /** Top-level SVG presentation attribute keys routed to `<animate>`. */
  direct: DirectProps;
  /** Contents of the `attr: {}` bucket, routed to `<animate>`. */
  attrs: AttrVars;
  /** Tween control properties (duration, ease, repeat…) with defaults applied. */
  special: SpecialProps;
  /** Plugin dispatch keys (drawSVG, motionPath, morphSVG). */
  plugins: {
    drawSVG?: DrawSVGValue;
    motionPath?: MotionPathVars | string;
    morphSVG?: MorphSVGVars | string;
  };
};
