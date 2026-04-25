import { Animation } from "./Animation.ts";
import type {
  TweenVars,
  TweenTarget,
  TransformProps,
  DirectProps,
} from "@/types/index.ts";
import { routeProperties } from "@/utils/property-router.ts";
import { composeTransforms } from "@/utils/transform-composer.ts";
import { resolveStaggerDelays } from "@/utils/stagger-resolver.ts";
import { buildAnimate, injectInto } from "@/utils/builders.ts";
import { resolveEase } from "@/utils/easing.ts";
import { roundToFloat } from "@/utils/helpers/math.functions.ts";

/**
 * A single GSAP-style tween that generates SMIL elements and injects them into the DOM.
 * Instantiated by `smil.to()`, `smil.from()`, and `smil.fromTo()`.
 *
 * Pass `fromVars` for `fromTo()`, or `isFrom = true` for `from()`.
 */
export class SMILTween extends Animation {
  _targets: Element[];
  _vars: TweenVars;
  _fromVars: TweenVars | null;
  _isFrom: boolean;
  _elements: SVGAnimationElement[] = [];

  private _originalValues = new Map<Element, Record<string, string | null>>();

  constructor(
    targets: TweenTarget,
    vars: TweenVars,
    fromVars?: TweenVars | null,
    isFrom = false,
  ) {
    super(vars);
    this._vars = vars;
    this._fromVars = fromVars ?? null;
    this._isFrom = isFrom;
    this._targets = this._resolveTargets(targets);
    this._build();
  }

  // ===== Target resolution =====

  /** Normalizes any TweenTarget form into a flat `Element[]`. */
  private _resolveTargets = (targets: TweenTarget): Element[] => {
    if (typeof targets === "string") {
      return Array.from(document.querySelectorAll<Element>(targets));
    }

    if (targets instanceof Element) {
      return [targets];
    }

    if (targets instanceof NodeList) {
      return Array.from(targets) as Element[];
    }

    if (Array.isArray(targets)) {
      return targets.flatMap((t) =>
        typeof t === "string"
          ? Array.from(document.querySelectorAll<Element>(t))
          : [t as Element],
      );
    }

    return [];
  };

  // ===== Build =====

  /**
   * Derives identity transform values from the active keys of a `TransformProps` object.
   * Used by `from()` to produce the "animate TO neutral state" endpoint.
   */
  private _identityFor = (transforms: TransformProps): TransformProps => {
    const identity: TransformProps = {};
    if ("x" in transforms || "xPercent" in transforms) identity.x = 0;
    if ("y" in transforms || "yPercent" in transforms) identity.y = 0;
    if ("rotation" in transforms) identity.rotation = 0;
    if (
      "scale" in transforms ||
      "scaleX" in transforms ||
      "scaleY" in transforms
    )
      identity.scale = 1;
    if ("skewX" in transforms) identity.skewX = 0;
    if ("skewY" in transforms) identity.skewY = 0;
    return identity;
  };

  /** Iterates targets, resolves per-target delays, builds and injects all SMIL elements. */
  private _build = (): void => {
    if (this._yoyo) {
      console.warn("[gsap-to-smil] yoyo is not yet supported — ignored.");
    }

    const { transforms, direct } = routeProperties(this._vars);
    const fromRouted = this._fromVars ? routeProperties(this._fromVars) : null;

    const staggerDelays = this._vars.stagger
      ? resolveStaggerDelays(this._targets.length, this._vars.stagger)
      : null;

    const maxStagger = staggerDelays ? Math.max(...staggerDelays) : 0;
    // When stagger+repeat is active, each target's cycle is extended to groupDuration so they
    // all restart together. The stagger offset is encoded in values/keyTimes instead of begin.
    const hasStaggerRepeat =
      staggerDelays !== null && this._repeat !== 0 && maxStagger > 0;
    const groupDuration = hasStaggerRepeat ? this._dur + maxStagger : this._dur;

    for (let i = 0; i < this._targets.length; i++) {
      const target = this._targets[i]!;
      const staggerOffset = staggerDelays?.[i] ?? 0;
      const beginDelay = this._delay + (hasStaggerRepeat ? 0 : staggerOffset);

      this._saveOriginals(target, transforms, direct);

      const elements: SVGAnimationElement[] = [
        ...this._buildTransforms(
          target,
          transforms,
          fromRouted?.transforms,
          beginDelay,
          groupDuration,
        ),
        ...this._buildDirect(
          direct,
          fromRouted?.direct,
          beginDelay,
          groupDuration,
        ),
      ];

      if (hasStaggerRepeat) {
        this._applyStaggerEncoding(elements, staggerOffset, groupDuration);
      }

      injectInto(target, ...elements);
      this._elements.push(...elements);
    }

    this._initialized = true;
  };

  /** Captures current attribute values before animating so `revert()` can restore them. */
  private _saveOriginals = (
    target: Element,
    transforms: TransformProps,
    direct: DirectProps,
  ): void => {
    const originals: Record<string, string | null> = {};

    if (Object.keys(transforms).length > 0) {
      originals["transform"] = target.getAttribute("transform");
    }
    for (const attr of Object.keys(direct)) {
      originals[attr] = target.getAttribute(attr);
    }

    this._originalValues.set(target, originals);
  };

  /** Creates `<animateTransform>` elements for all active transform keys. */
  private _buildTransforms = (
    target: Element,
    transforms: TransformProps,
    fromTransforms: TransformProps | undefined,
    delay: number,
    dur: number,
  ): SVGAnimateTransformElement[] => {
    const timing = {
      dur,
      delay: delay || undefined,
      repeat: this._repeat,
      ease: this._vars.ease,
    };

    if (this._isFrom) {
      return composeTransforms({
        target,
        fromTransforms: transforms,
        toTransforms: this._identityFor(transforms),
        transformOrigin: this._vars.transformOrigin,
        ...timing,
      });
    }

    if (fromTransforms) {
      return composeTransforms({
        target,
        fromTransforms,
        toTransforms: transforms,
        transformOrigin: this._vars.transformOrigin,
        ...timing,
      });
    }

    return composeTransforms({
      target,
      toTransforms: transforms,
      transformOrigin: this._vars.transformOrigin,
      ...timing,
    });
  };

  /** Creates `<animate>` elements for opacity, fill, stroke, and other direct SVG attributes. */
  private _buildDirect = (
    direct: DirectProps,
    fromDirect: DirectProps | undefined,
    delay: number,
    dur: number,
  ): SVGAnimateElement[] => {
    const elements: SVGAnimateElement[] = [];

    for (const [attr, value] of Object.entries(direct)) {
      if (value === undefined) continue;

      const shared = {
        attributeName: attr,
        dur,
        delay: delay || undefined,
        repeat: this._repeat,
        ease: this._vars.ease,
      };

      if (this._isFrom) {
        elements.push(buildAnimate({ ...shared, from: String(value) }));
      } else if (fromDirect) {
        const fromValue = fromDirect[attr];
        elements.push(
          buildAnimate({
            ...shared,
            from: fromValue !== undefined ? String(fromValue) : undefined,
            to: String(value),
          }),
        );
      } else {
        elements.push(buildAnimate({ ...shared, to: String(value) }));
      }
    }

    return elements;
  };

  // ===== Stagger + repeat synchronization =====

  /**
   * Rewrites `from`/`to` on each element to `values`/`keyTimes` so all staggered targets
   * share the same `dur = groupDuration` cycle and repeat as a synchronized group.
   *
   * For a target with stagger offset S, animation dur D, group dur G:
   *   - [0, S]     → hold at `from`  (wait)
   *   - [S, S+D]   → animate from → to
   *   - [S+D, G]   → hold at `to`   (pad)
   *
   * Elements without both `from` and `to` are skipped — they keep independent timing.
   */
  private _applyStaggerEncoding = (
    elements: SVGAnimationElement[],
    staggerOffset: number,
    groupDur: number,
  ): void => {
    for (const el of elements) {
      const fromVal = el.getAttribute("from");
      const toVal = el.getAttribute("to");
      if (fromVal === null || toVal === null) continue;

      const hasWait: boolean = staggerOffset > 0;
      const hasHold: boolean = staggerOffset + this._dur < groupDur;

      // Where within the [0–1] cycle the wait phase ends and the animation begins.
      const animStartRatio: number = roundToFloat(staggerOffset / groupDur, 6);
      // Where within the [0–1] cycle the animation ends and the hold phase begins.
      const animEndRatio: number = hasHold
        ? roundToFloat((staggerOffset + this._dur) / groupDur, 6)
        : 1;

      /** Keyframe states; serialized into the SMIL `values` attribute. */
      const valuesArr: string[] = [fromVal];
      /** Normalized [0–1] time positions for each keyframe; written to SMIL `keyTimes`. */
      const keyTimesArr: number[] = [0];

      if (hasWait) {
        keyTimesArr.push(animStartRatio);
        valuesArr.push(fromVal);
      }

      keyTimesArr.push(animEndRatio);
      valuesArr.push(toVal);

      if (hasHold) {
        keyTimesArr.push(1);
        valuesArr.push(toVal);
      }

      el.removeAttribute("from");
      el.removeAttribute("to");
      el.setAttribute("values", valuesArr.join("; "));
      el.setAttribute("keyTimes", keyTimesArr.join("; "));

      this._applyStaggerEasing(el, this._vars.ease, hasWait, hasHold);
    }
  };

  /**
   * Sets `calcMode` and `keySplines` on an element whose `keyTimes` encodes
   * wait/animate/hold intervals. Hold and wait intervals get a linear bezier (`0 0 1 1`);
   * the animate interval gets the actual ease curve.
   */
  private _applyStaggerEasing = (
    el: SVGAnimationElement,
    ease: TweenVars["ease"],
    hasWait: boolean,
    hasHold: boolean,
  ): void => {
    if (!ease || ease === "none" || ease === "linear") {
      el.setAttribute("calcMode", "linear");
      el.removeAttribute("keySplines");
      return;
    }

    const bezier = resolveEase(ease);
    if (!bezier) {
      el.setAttribute("calcMode", "linear");
      el.removeAttribute("keySplines");
      return;
    }

    const animSpline = bezier.join(" ");
    const holdSpline = "0 0 1 1";

    const splines: string[] = [];
    if (hasWait) splines.push(holdSpline);
    splines.push(animSpline);
    if (hasHold) splines.push(holdSpline);

    el.setAttribute("calcMode", "spline");
    el.setAttribute("keySplines", splines.join("; "));
  };

  // ===== Playback =====

  private _svgOwner = (): SVGSVGElement | null =>
    this._elements[0]?.ownerSVGElement ?? null;

  play = (): this => {
    this._paused = false;
    for (const el of this._elements) el.beginElement();
    return this;
  };

  pause = (): this => {
    this._paused = true;
    this._svgOwner()?.pauseAnimations();
    return this;
  };

  resume = (): this => {
    this._paused = false;
    this._svgOwner()?.unpauseAnimations();
    return this;
  };

  seek = (time: number): this => {
    this._svgOwner()?.setCurrentTime(time);
    return this;
  };

  restart = (): this => {
    for (const el of this._elements) el.beginElement();
    return this;
  };

  // ===== Cleanup =====

  kill = (): this => {
    for (const el of this._elements) el.remove();
    this._elements = [];
    this._initialized = false;
    return this;
  };

  revert = (): this => {
    this.kill();
    for (const [target, originals] of this._originalValues) {
      for (const [attr, value] of Object.entries(originals)) {
        if (value === null) {
          target.removeAttribute(attr);
        } else {
          target.setAttribute(attr, value);
        }
      }
    }
    this._originalValues.clear();
    return this;
  };
}
