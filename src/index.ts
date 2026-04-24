import { SMILTween } from "./core/SMILTween.ts";
import type { TweenTarget, TweenVars } from "./types/index.ts";

export const smil = {
  to: (targets: TweenTarget, vars: TweenVars): SMILTween =>
    new SMILTween(targets, vars),

  from: (targets: TweenTarget, vars: TweenVars): SMILTween =>
    new SMILTween(targets, vars, null, true),

  fromTo: (targets: TweenTarget, fromVars: TweenVars, toVars: TweenVars): SMILTween =>
    new SMILTween(targets, toVars, fromVars),

  set: (targets: TweenTarget, vars: TweenVars): SMILTween =>
    new SMILTween(targets, { ...vars, duration: 0, ease: "none" }),
};

// Public API re-exports
export { SMILTween } from "./core/SMILTween.ts";
export { Animation } from "./core/Animation.ts";
export type {
  TweenVars,
  TweenTarget,
  StaggerObject,
  EaseString,
  PositionParam,
} from "./types/index.ts";
