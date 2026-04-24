import type { EaseString } from "./easing.ts";
import type { AttrVars } from "./attr.ts";
import type { StaggerObject } from "./stagger.ts";
import type { DrawSVGValue, MotionPathVars, MorphSVGVars } from "./plugins.ts";

export type PositionParam = number | string;

export type TweenVars = {
  duration?: number;
  delay?: number;
  ease?: EaseString | number[];
  repeat?: number;
  repeatDelay?: number;
  yoyo?: boolean;
  yoyoEase?: EaseString | boolean;
  stagger?: number | StaggerObject;
  paused?: boolean;
  reversed?: boolean;
  id?: string;
  data?: unknown;
  immediateRender?: boolean;

  // SVG attr bucket
  attr?: AttrVars;

  // Plugins
  drawSVG?: DrawSVGValue;
  motionPath?: MotionPathVars | string;
  morphSVG?: MorphSVGVars | string;

  // Transform shorthands → <animateTransform>
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
  transformOrigin?: string;

  // Direct SVG presentation attributes → <animate>
  opacity?: number | string;
  fill?: string;
  stroke?: string;

  // Callbacks
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

export type TimelineVars = Omit<
  TweenVars,
  "stagger" | "yoyoEase" | "attr" | "drawSVG" | "motionPath" | "morphSVG"
> & {
  defaults?: Partial<TweenVars>;
  smoothChildTiming?: boolean;
  autoRemoveChildren?: boolean;
};
