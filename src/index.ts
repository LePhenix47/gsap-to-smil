import { SMILTween } from "./core/SMILTween.ts";
import { SMILTimeline } from "./core/SMILTimeline.ts";
import type { TweenTarget, TweenVars, TimelineVars } from "./types/index.ts";

const smil = {
  to: (targets: TweenTarget, vars: TweenVars): SMILTween =>
    new SMILTween(targets, vars),

  from: (targets: TweenTarget, vars: TweenVars): SMILTween =>
    new SMILTween(targets, vars, null, true),

  fromTo: (
    targets: TweenTarget,
    fromVars: TweenVars,
    toVars: TweenVars,
  ): SMILTween => new SMILTween(targets, toVars, fromVars),

  set: (targets: TweenTarget, vars: TweenVars): SMILTween =>
    new SMILTween(targets, { ...vars, duration: 0, ease: "none" }),

  timeline: (vars?: TimelineVars): SMILTimeline => new SMILTimeline(vars),
};

export default smil;

// Public API re-exports
export { AnimationDebugger } from "./utils/animation-debugger.ts";
export type { FrameSample, SampleOptions } from "./utils/animation-debugger.ts";
export { writeDebugLog } from "./utils/log-writer.ts";
export { Easing } from "./utils/easing.ts";
export { SMILTween } from "./core/SMILTween.ts";
export { SMILTimeline } from "./core/SMILTimeline.ts";
export { Animation } from "./core/Animation.ts";
export type {
  TweenVars,
  TimelineVars,
  TweenTarget,
  StaggerObject,
  EaseString,
  PositionParam,
} from "./types/index.ts";
