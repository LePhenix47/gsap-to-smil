import { Animation } from "./Animation.ts";
import type {
  TweenVars,
  TweenTarget,
  TransformProps,
  DirectProps,
  PropertyBuckets,
} from "@/types/index.ts";

/**
 * A single GSAP-style tween that generates SMIL elements and injects them into the DOM.
 * Instantiated by `smil.to()`, `smil.from()`, and `smil.fromTo()`.
 *
 * Pass `fromVars` for `fromTo()`, or `isFrom = true` for `from()`.
 */
export class SMILTween extends Animation {}
