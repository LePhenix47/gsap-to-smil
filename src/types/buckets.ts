import type { EaseString } from "./easing.ts";
import type { AttrVars } from "./attr.ts";
import type { StaggerObject } from "./stagger.ts";
import type { DrawSVGValue, MotionPathVars, MorphSVGVars } from "./plugins.ts";

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

export type DirectProps = {
  opacity?: number | string;
  fill?: string;
  stroke?: string;
  [key: string]: number | string | undefined;
};

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

export type PropertyBuckets = {
  transforms: TransformProps;
  direct: DirectProps;
  attrs: AttrVars;
  special: SpecialProps;
  plugins: {
    drawSVG?: DrawSVGValue;
    motionPath?: MotionPathVars | string;
    morphSVG?: MorphSVGVars | string;
  };
};
