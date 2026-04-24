import type { EaseString } from "./easing.ts";
import type { AttrVars } from "./attr.ts";
import type { StaggerObject } from "./stagger.ts";
import type { DrawSVGValue, MotionPathVars, MorphSVGVars } from "./plugins.ts";

/**
 * Third argument to `tl.to()` / `tl.from()` etc. — controls where in the timeline the tween is inserted.
 *
 * - `number` — absolute time in seconds from the timeline start
 * - `"<"` — same start time as the previous tween
 * - `">"` — after the previous tween ends (default sequential)
 * - `">-0.5"` — 0.5s before the previous tween ends (overlap)
 * - `"<0.5"` — 0.5s after the previous tween starts
 * - `"+=0.5"` — 0.5s after the current timeline end
 * - `"myLabel"` — at a named label position
 */
export type PositionParam = number | string;

/**
 * The vars object passed to `smil.to()`, `smil.from()`, `smil.fromTo()`, and `smil.set()`.
 *
 * Special properties (duration, ease, repeat…) control the tween itself.
 * Everything else is treated as an animated value and routed to the appropriate SMIL element.
 */
export type TweenVars = {
  /** Animation duration in seconds. Default: `0.5`. */
  duration?: number;
  /** Delay before the animation starts, in seconds. */
  delay?: number;
  /** Easing function. Named GSAP ease, CSS shorthand, or raw `[x1, y1, x2, y2]` bezier array. */
  ease?: EaseString | number[];
  /** Number of times to repeat after the first play. `-1` = infinite. */
  repeat?: number;
  /** Delay between repeats in seconds. */
  repeatDelay?: number;
  /** `true` = ping-pong (A→B→A). Requires `repeat` to be set. */
  yoyo?: boolean;
  /** Separate ease for the reverse direction of a yoyo. */
  yoyoEase?: EaseString | boolean;
  /** Offset between each target's start time. Number = seconds per target. */
  stagger?: number | StaggerObject;
  /** Start paused — call `.play()` manually to begin. */
  paused?: boolean;
  /** Start in reverse direction. */
  reversed?: boolean;
  /** String ID to retrieve the tween later. */
  id?: string;
  /** Arbitrary data attached to the tween. */
  data?: unknown;
  /** Render start values immediately on creation. Default `true` for `from()` / `fromTo()`. */
  immediateRender?: boolean;

  /** Animate SVG presentation attributes directly (maps to `<animate attributeName="...">`). */
  attr?: AttrVars;

  /** DrawSVG plugin — animate stroke drawing via `stroke-dashoffset`. */
  drawSVG?: DrawSVGValue;
  /** MotionPath plugin — move element along an SVG path. */
  motionPath?: MotionPathVars | string;
  /** MorphSVG plugin — morph between two SVG path shapes. */
  morphSVG?: MorphSVGVars | string;

  // Transform shorthands — map to <animateTransform>
  x?: number | string;
  y?: number | string;
  z?: number | string;
  xPercent?: number | string;
  yPercent?: number | string;
  rotation?: number | string;
  /** No SMIL equivalent — logged as a warning and skipped. */
  rotationX?: number | string;
  /** No SMIL equivalent — logged as a warning and skipped. */
  rotationY?: number | string;
  scale?: number | string;
  scaleX?: number | string;
  scaleY?: number | string;
  skewX?: number | string;
  skewY?: number | string;
  /** Rotation origin as `"cx cy"` in parent coordinate space. Resolved via `getBBox()` when possible. */
  transformOrigin?: string;

  // Direct SVG presentation attributes — map to <animate>
  opacity?: number | string;
  fill?: string;
  stroke?: string;

  // Callbacks — wired to SMIL beginEvent / endEvent / repeatEvent where possible
  onStart?: (...args: unknown[]) => void;
  onStartParams?: unknown[];
  onComplete?: (...args: unknown[]) => void;
  onCompleteParams?: unknown[];
  onRepeat?: (...args: unknown[]) => void;
  onRepeatParams?: unknown[];
  onReverseComplete?: (...args: unknown[]) => void;
  onReverseCompleteParams?: unknown[];

  [key: string]: unknown;
};

/**
 * Vars object for `smil.timeline()`.
 * Same as `TweenVars` but strips per-tween-only props and adds timeline-specific ones.
 */
export type TimelineVars = Omit<
  TweenVars,
  "stagger" | "yoyoEase" | "attr" | "drawSVG" | "motionPath" | "morphSVG"
> & {
  /** Default vars applied to every child tween added to this timeline. */
  defaults?: Partial<TweenVars>;
  smoothChildTiming?: boolean;
  autoRemoveChildren?: boolean;
};
