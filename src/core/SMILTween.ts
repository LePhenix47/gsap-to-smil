import { Animation } from "./Animation.ts";
import type {
  TweenVars,
  TweenTarget,
  TransformProps,
  DirectProps,
} from "@/types/index.ts";
import { routeProperties } from "@/utils/property-router.ts";
import { composeTransforms, resolveRotationOrigin } from "@/utils/transform-composer.ts";
import { resolveStaggerDelays } from "@/utils/stagger-resolver.ts";
import { buildAnimate, buildAnimateTransform, injectInto } from "@/utils/builders.ts";
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
    const kf = this._vars.keyframes;
    if (kf !== undefined) {
      this._buildKeyframes(kf);
      return;
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

    const totalPlays = this._repeat === -1 ? Infinity : this._repeat + 1;
    // When yoyo runs inside the stagger group, groupDuration must cover all plays per target:
    //   infinite or even total plays: one F+B cycle → groupDur = 2D + maxStagger
    //   odd total plays (F+B+F…):    all N plays in one SMIL cycle → groupDur = N*D + maxStagger
    const yoyoGroupFactor = this._yoyo && hasStaggerRepeat
      ? (this._repeat === -1 || totalPlays % 2 === 0 ? 2 : totalPlays)
      : 1;

    const groupDuration = hasStaggerRepeat
      ? yoyoGroupFactor * this._dur + maxStagger
      : this._dur;

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
          this._yoyo ? (this._originalValues.get(target) ?? undefined) : undefined,
        ),
      ];

      if (hasStaggerRepeat) {
        this._applyStaggerEncoding(elements, staggerOffset, groupDuration, this._yoyo);
      }

      injectInto(target, ...elements);
      this._elements.push(...elements);
    }

    if (this._yoyo && !hasStaggerRepeat) {
      this._applyYoyoEncoding(this._elements);
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
    originals?: Record<string, string | null>,
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
      } else if (originals) {
        // yoyo: set explicit from so _applyYoyoEncoding can read both from and to
        const origVal = originals[attr];
        elements.push(
          buildAnimate({
            ...shared,
            from: origVal != null ? origVal : undefined,
            to: String(value),
          }),
        );
      } else {
        elements.push(buildAnimate({ ...shared, to: String(value) }));
      }
    }

    return elements;
  };

  // ===== Keyframes =====

  private _buildKeyframes = (kf: NonNullable<TweenVars["keyframes"]>): void => {
    if (Array.isArray(kf)) {
      this._buildObjectArrayKeyframes(kf as TweenVars[]);
      return;
    }
    const keys = Object.keys(kf);
    if (keys.length === 0) return;
    if (keys[0]!.endsWith("%")) {
      this._buildPercentageKeyframes(kf as Record<string, TweenVars>);
    } else {
      this._buildPropertyArrayKeyframes(kf as Record<string, Array<number | string>>);
    }
  };

  /**
   * Object array form: `[{ x: 100, duration: 0.5 }, { opacity: 0, duration: 1 }]`
   * Each step becomes a child SMILTween with an accumulated delay. No SMILTimeline needed.
   */
  private _buildObjectArrayKeyframes = (steps: TweenVars[]): void => {
    const staggerDelays = this._vars.stagger
      ? resolveStaggerDelays(this._targets.length, this._vars.stagger)
      : null;

    for (let i = 0; i < this._targets.length; i++) {
      const target = this._targets[i]!;
      const staggerOffset = staggerDelays?.[i] ?? 0;

      // Save originals for this target across all steps.
      const originals: Record<string, string | null> = {};
      for (const step of steps) {
        const { transforms, direct } = routeProperties(step);
        if (Object.keys(transforms).length > 0 && !("transform" in originals)) {
          originals["transform"] = target.getAttribute("transform");
        }
        for (const attr of Object.keys(direct)) {
          if (!(attr in originals)) originals[attr] = target.getAttribute(attr);
        }
      }
      this._originalValues.set(target, originals);

      // Build each step as a single-target child tween with its accumulated delay.
      let accTime = this._delay + staggerOffset;
      for (const step of steps) {
        const stepDur = step.duration ?? 0.5;
        const child = new SMILTween([target], { ...step, delay: accTime });
        this._elements.push(...child._elements);
        accTime += stepDur;
      }
    }

    const totalStepDur = steps.reduce((sum, s) => sum + (s.duration ?? 0.5), 0);
    this._dur = totalStepDur;
    this._tDur =
      this._repeat === -1
        ? Infinity
        : totalStepDur * (this._repeat + 1) + this._rDelay * this._repeat;
    this._initialized = true;
  };

  private static readonly _KF_TRANSFORM_KEYS = new Set([
    "x", "y", "rotation", "scale", "scaleX", "scaleY", "skewX", "skewY",
  ]);

  /**
   * Property array form: `{ x: [0, 100, 50], opacity: [1, 0.5, 1] }`
   * Values are distributed evenly across `_dur`. x+y are merged into translate values.
   */
  private _buildPropertyArrayKeyframes = (
    kf: Record<string, Array<number | string>>,
  ): void => {
    const entries = Object.entries(kf);
    if (entries.length === 0) return;
    const frameCount = entries[0]![1].length;
    if (frameCount < 2) return;

    const xArr = kf["x"];
    const yArr = kf["y"];
    const rotationArr = kf["rotation"];
    const scaleArr = kf["scale"];
    const scaleXArr = kf["scaleX"];
    const scaleYArr = kf["scaleY"];
    const skewXArr = kf["skewX"];
    const skewYArr = kf["skewY"];

    const hasTranslate = !!(xArr || yArr);
    const hasRotation = !!rotationArr;
    const hasScale = !!(scaleArr || scaleXArr || scaleYArr);
    const hasSkewX = !!skewXArr;
    const hasSkewY = !!skewYArr;
    const hasTransforms = hasTranslate || hasRotation || hasScale || hasSkewX || hasSkewY;

    const staggerDelays = this._vars.stagger
      ? resolveStaggerDelays(this._targets.length, this._vars.stagger)
      : null;

    for (let i = 0; i < this._targets.length; i++) {
      const target = this._targets[i]!;
      const staggerOffset = staggerDelays?.[i] ?? 0;
      const delay = this._delay + staggerOffset;

      const shared = {
        dur: this._dur,
        delay: delay || undefined,
        repeat: this._repeat,
        ease: this._vars.ease,
      };

      const originals: Record<string, string | null> = {};
      const elements: SVGAnimationElement[] = [];

      if (hasTransforms) {
        originals["transform"] = target.getAttribute("transform");

        if (hasTranslate) {
          const x = xArr ?? Array<number>(frameCount).fill(0);
          const y = yArr ?? Array<number>(frameCount).fill(0);
          const values = (x as Array<number | string>).map((xi, i) => `${xi} ${(y as Array<number | string>)[i]}`).join("; ");
          elements.push(buildAnimateTransform({ type: "translate", values, additive: "sum", ...shared }));
        }

        if (hasRotation) {
          const { cx, cy } = resolveRotationOrigin(target, this._vars.transformOrigin);
          const values = rotationArr!.map(r => `${r} ${cx} ${cy}`).join("; ");
          elements.push(buildAnimateTransform({ type: "rotate", values, additive: "sum", ...shared }));
        }

        if (hasScale) {
          const sx = (scaleArr ?? scaleXArr ?? Array<number>(frameCount).fill(1)) as Array<number | string>;
          const sy = (scaleArr ?? scaleYArr ?? Array<number>(frameCount).fill(1)) as Array<number | string>;
          const values = sx.map((s, i) => `${s} ${sy[i]}`).join("; ");
          elements.push(buildAnimateTransform({ type: "scale", values, additive: "sum", ...shared }));
        }

        if (hasSkewX) {
          elements.push(buildAnimateTransform({ type: "skewX", values: skewXArr!.join("; "), additive: "sum", ...shared }));
        }

        if (hasSkewY) {
          elements.push(buildAnimateTransform({ type: "skewY", values: skewYArr!.join("; "), additive: "sum", ...shared }));
        }
      }

      for (const [attr, values] of entries) {
        if (SMILTween._KF_TRANSFORM_KEYS.has(attr)) continue;
        originals[attr] = target.getAttribute(attr);
        elements.push(buildAnimate({ attributeName: attr, values: values.join("; "), ...shared }));
      }

      this._originalValues.set(target, originals);
      injectInto(target, ...elements);
      this._elements.push(...elements);
    }

    this._initialized = true;
  };

  /**
   * Percentage object form: `{ "0%": { opacity: 0 }, "100%": { opacity: 1 } }`
   * Keys are time percentages; values are TweenVars objects. keyTimes reflect the percentages.
   * Missing properties at a stop carry forward from the previous stop (or default to 0).
   */
  private _buildPercentageKeyframes = (kf: Record<string, TweenVars>): void => {
    const stops = Object.entries(kf)
      .map(([k, v]) => ({ pct: parseFloat(k) / 100, vars: v }))
      .sort((a, b) => a.pct - b.pct);

    if (stops.length < 2) return;

    const keyTimesStr = stops.map(s => roundToFloat(s.pct, 6)).join("; ");

    // Pre-route each stop once.
    const routedStops = stops.map(({ pct, vars }) => ({ pct, ...routeProperties(vars) }));

    // Collect all property names across all stops.
    const allTransforms = new Set<string>();
    const allDirect = new Set<string>();
    for (const { transforms, direct } of routedStops) {
      for (const k of Object.keys(transforms)) allTransforms.add(k);
      for (const k of Object.keys(direct)) allDirect.add(k);
    }

    const hasTranslate = allTransforms.has("x") || allTransforms.has("y");
    const hasRotation = allTransforms.has("rotation");
    const hasScale = allTransforms.has("scale") || allTransforms.has("scaleX") || allTransforms.has("scaleY");
    const hasSkewX = allTransforms.has("skewX");
    const hasSkewY = allTransforms.has("skewY");
    const hasTransforms = hasTranslate || hasRotation || hasScale || hasSkewX || hasSkewY;

    const staggerDelays = this._vars.stagger
      ? resolveStaggerDelays(this._targets.length, this._vars.stagger)
      : null;

    for (let i = 0; i < this._targets.length; i++) {
      const target = this._targets[i]!;
      const staggerOffset = staggerDelays?.[i] ?? 0;
      const delay = this._delay + staggerOffset;

      const shared = {
        dur: this._dur,
        delay: delay || undefined,
        repeat: this._repeat,
        ease: this._vars.ease,
      };

      const originals: Record<string, string | null> = {};
      const elements: SVGAnimationElement[] = [];

      if (hasTransforms) {
        originals["transform"] = target.getAttribute("transform");

        if (hasTranslate) {
          let lastX = 0, lastY = 0;
          const values = routedStops.map(({ transforms }) => {
            if ("x" in transforms) lastX = Number(transforms.x ?? 0);
            if ("y" in transforms) lastY = Number(transforms.y ?? 0);
            return `${lastX} ${lastY}`;
          }).join("; ");
          const el = buildAnimateTransform({ type: "translate", values, additive: "sum", ...shared });
          el.setAttribute("keyTimes", keyTimesStr);
          elements.push(el);
        }

        if (hasRotation) {
          const { cx, cy } = resolveRotationOrigin(target, this._vars.transformOrigin);
          let lastR = 0;
          const values = routedStops.map(({ transforms }) => {
            if ("rotation" in transforms) lastR = Number(transforms.rotation ?? 0);
            return `${lastR} ${cx} ${cy}`;
          }).join("; ");
          const el = buildAnimateTransform({ type: "rotate", values, additive: "sum", ...shared });
          el.setAttribute("keyTimes", keyTimesStr);
          elements.push(el);
        }

        if (hasScale) {
          let lastSx = 1, lastSy = 1;
          const values = routedStops.map(({ transforms }) => {
            const sx = transforms.scale ?? transforms.scaleX;
            const sy = transforms.scale ?? transforms.scaleY;
            if (sx !== undefined) lastSx = Number(sx);
            if (sy !== undefined) lastSy = Number(sy);
            return `${lastSx} ${lastSy}`;
          }).join("; ");
          const el = buildAnimateTransform({ type: "scale", values, additive: "sum", ...shared });
          el.setAttribute("keyTimes", keyTimesStr);
          elements.push(el);
        }

        if (hasSkewX) {
          let lastV = 0;
          const values = routedStops.map(({ transforms }) => {
            if ("skewX" in transforms) lastV = Number(transforms.skewX ?? 0);
            return String(lastV);
          }).join("; ");
          const el = buildAnimateTransform({ type: "skewX", values, additive: "sum", ...shared });
          el.setAttribute("keyTimes", keyTimesStr);
          elements.push(el);
        }

        if (hasSkewY) {
          let lastV = 0;
          const values = routedStops.map(({ transforms }) => {
            if ("skewY" in transforms) lastV = Number(transforms.skewY ?? 0);
            return String(lastV);
          }).join("; ");
          const el = buildAnimateTransform({ type: "skewY", values, additive: "sum", ...shared });
          el.setAttribute("keyTimes", keyTimesStr);
          elements.push(el);
        }
      }

      for (const attr of allDirect) {
        originals[attr] = target.getAttribute(attr);
        let lastVal = "";
        const values = routedStops.map(({ direct }) => {
          if (attr in direct && direct[attr] !== undefined) lastVal = String(direct[attr]);
          return lastVal;
        }).join("; ");
        const el = buildAnimate({ attributeName: attr, values, ...shared });
        el.setAttribute("keyTimes", keyTimesStr);
        elements.push(el);
      }

      this._originalValues.set(target, originals);
      injectInto(target, ...elements);
      this._elements.push(...elements);
    }

    this._initialized = true;
  };

  // ===== Stagger + repeat synchronization =====

  /**
   * Rewrites `from`/`to` on each element to `values`/`keyTimes` so all staggered targets
   * share the same `dur = groupDuration` cycle and repeat as a synchronized group.
   *
   * Without yoyo, G = D + maxStagger:
   *   [0,S] wait → [S,S+D] forward → [S+D,G] hold at `to`
   *
   * With yoyo, even total plays (infinite or N%2=0), G = 2D + maxStagger, repeatCount halved:
   *   [0,S] wait → [S,S+D] forward → [S+D,S+2D] backward → [S+2D,G] hold at `from`
   *
   * With yoyo, odd total plays (N%2≠0), G = N*D + maxStagger, repeatCount=1:
   *   [0,S] wait → N alternating F/B plays → [S+ND,G] hold at last value
   *
   * Elements without both `from` and `to` are skipped — they keep independent timing.
   */
  private _applyStaggerEncoding = (
    elements: SVGAnimationElement[],
    staggerOffset: number,
    groupDur: number,
    yoyo = false,
  ): void => {
    for (const el of elements) {
      const fromVal = el.getAttribute("from");
      const toVal = el.getAttribute("to");
      if (fromVal === null || toVal === null) continue;

      const hasWait: boolean = staggerOffset > 0;
      const animStartRatio: number = roundToFloat(staggerOffset / groupDur, 6);

      el.removeAttribute("from");
      el.removeAttribute("to");

      if (yoyo) {
        const totalPlays = this._repeat === -1 ? Infinity : this._repeat + 1;
        const isCleanCycle = this._repeat === -1 || totalPlays % 2 === 0;

        if (isCleanCycle) {
          // G = 2D + maxStagger; last target (S=maxStagger) has no hold phase.
          const animMidRatio = roundToFloat((staggerOffset + this._dur) / groupDur, 6);
          const rawEnd = (staggerOffset + this._dur * 2) / groupDur;
          const hasHold = rawEnd < 1 - 1e-9;
          const yoyoEndRatio = hasHold ? roundToFloat(rawEnd, 6) : 1;

          const valuesArr: string[] = [fromVal];
          const keyTimesArr: number[] = [0];

          if (hasWait) { valuesArr.push(fromVal); keyTimesArr.push(animStartRatio); }
          valuesArr.push(toVal);   keyTimesArr.push(animMidRatio);
          valuesArr.push(fromVal); keyTimesArr.push(yoyoEndRatio);
          if (hasHold) { valuesArr.push(fromVal); keyTimesArr.push(1); }

          el.setAttribute("values", valuesArr.join("; "));
          el.setAttribute("keyTimes", keyTimesArr.join("; "));

          // One SMIL cycle encodes F+B, so halve repeatCount.
          const rc = el.getAttribute("repeatCount");
          if (rc !== null && rc !== "indefinite") {
            el.setAttribute("repeatCount", String(parseInt(rc) / 2));
          }

          this._applyStaggerEasing(el, this._vars.ease, hasWait, hasHold, true);
        } else {
          // G = N*D + maxStagger; encode all N plays in a single repeatCount=1 SMIL cycle.
          const valuesArr: string[] = [fromVal];
          const keyTimesArr: number[] = [0];

          if (hasWait) { valuesArr.push(fromVal); keyTimesArr.push(animStartRatio); }

          for (let p = 1; p <= totalPlays; p++) {
            const raw = (staggerOffset + p * this._dur) / groupDur;
            keyTimesArr.push(roundToFloat(Math.min(raw, 1), 6));
            valuesArr.push(p % 2 === 0 ? fromVal : toVal);
          }

          const lastKT = keyTimesArr[keyTimesArr.length - 1]!;
          const hasHold = lastKT < 1;
          if (hasHold) {
            keyTimesArr.push(1);
            valuesArr.push(valuesArr[valuesArr.length - 1]!);
          }

          el.setAttribute("values", valuesArr.join("; "));
          el.setAttribute("keyTimes", keyTimesArr.join("; "));
          el.setAttribute("repeatCount", "1");

          this._applyStaggerEasingFull(el, this._vars.ease, hasWait, hasHold, totalPlays);
        }
      } else {
        const hasHold: boolean = staggerOffset + this._dur < groupDur;
        // Where within the [0–1] cycle the animation ends and the hold phase begins.
        const animEndRatio: number = hasHold
          ? roundToFloat((staggerOffset + this._dur) / groupDur, 6)
          : 1;

        /** Keyframe states; serialized into the SMIL `values` attribute. */
        const valuesArr: string[] = [fromVal];
        /** Normalized [0–1] time positions for each keyframe; written to SMIL `keyTimes`. */
        const keyTimesArr: number[] = [0];

        if (hasWait) { keyTimesArr.push(animStartRatio); valuesArr.push(fromVal); }
        keyTimesArr.push(animEndRatio); valuesArr.push(toVal);
        if (hasHold) { keyTimesArr.push(1); valuesArr.push(toVal); }

        el.setAttribute("values", valuesArr.join("; "));
        el.setAttribute("keyTimes", keyTimesArr.join("; "));

        this._applyStaggerEasing(el, this._vars.ease, hasWait, hasHold);
      }
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
    hasYoyo = false,
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

    const [x1, y1, x2, y2] = bezier;
    const animSpline = bezier.join(" ");
    const holdSpline = "0 0 1 1";

    const splines: string[] = [];
    if (hasWait) splines.push(holdSpline);
    splines.push(animSpline);
    if (hasYoyo) {
      const revSpline = `${roundToFloat(1 - x2, 6)} ${roundToFloat(1 - y2, 6)} ${roundToFloat(1 - x1, 6)} ${roundToFloat(1 - y1, 6)}`;
      splines.push(revSpline);
    }
    if (hasHold) splines.push(holdSpline);

    el.setAttribute("calcMode", "spline");
    el.setAttribute("keySplines", splines.join("; "));
  };

  /** Like `_applyStaggerEasing` but for N alternating F/B play intervals (odd-plays yoyo case). */
  private _applyStaggerEasingFull = (
    el: SVGAnimationElement,
    ease: TweenVars["ease"],
    hasWait: boolean,
    hasHold: boolean,
    totalPlays: number,
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

    const [x1, y1, x2, y2] = bezier;
    const fwdSpline = bezier.join(" ");
    const revSpline = `${roundToFloat(1 - x2, 6)} ${roundToFloat(1 - y2, 6)} ${roundToFloat(1 - x1, 6)} ${roundToFloat(1 - y1, 6)}`;
    const holdSpline = "0 0 1 1";

    const splines: string[] = [];
    if (hasWait) splines.push(holdSpline);
    for (let i = 0; i < totalPlays; i++) splines.push(i % 2 === 0 ? fwdSpline : revSpline);
    if (hasHold) splines.push(holdSpline);

    el.setAttribute("calcMode", "spline");
    el.setAttribute("keySplines", splines.join("; "));
  };

  // ===== Yoyo =====

  /**
   * Rewrites `from`/`to` on each element to a `values` sequence that encodes the forward
   * and backward phases, so the browser plays the animation in alternating directions.
   *
   * Three sub-cases:
   *  - infinite repeat or even total plays → one yoyo cycle (from→to→from), dur×2, repeatCount halved
   *  - odd total plays > 1               → full sequence encoded (from→to→from→…), repeatCount=1
   *  - 1 total play (repeat:0)           → yoyo has no visible effect, skip
   *
   * Elements without both `from` and `to` are skipped (keyframe/stagger-encoded elements).
   */
  private _applyYoyoEncoding = (elements: SVGAnimationElement[]): void => {
    const totalPlays = this._repeat === -1 ? Infinity : this._repeat + 1;
    if (totalPlays === 1) return;

    const ease = this._vars.ease;
    const bezier = ease && ease !== "none" && ease !== "linear" ? resolveEase(ease) : null;

    const makeSplines = (intervalCount: number): string | null => {
      if (!bezier) return null;
      const [x1, y1, x2, y2] = bezier;
      const fwd = `${x1} ${y1} ${x2} ${y2}`;
      // Reversed cubic-bezier: swap and flip both control points
      const rev = `${roundToFloat(1 - x2, 6)} ${roundToFloat(1 - y2, 6)} ${roundToFloat(1 - x1, 6)} ${roundToFloat(1 - y1, 6)}`;
      const splines: string[] = [];
      for (let i = 0; i < intervalCount; i++) splines.push(i % 2 === 0 ? fwd : rev);
      return splines.join("; ");
    };

    for (const el of elements) {
      const fromVal = el.getAttribute("from");
      const toVal = el.getAttribute("to");
      if (fromVal === null || toVal === null) continue;

      const durSec = parseFloat(el.getAttribute("dur")!);
      el.removeAttribute("from");
      el.removeAttribute("to");

      if (totalPlays === Infinity || totalPlays % 2 === 0) {
        const repeatCount = totalPlays === Infinity ? "indefinite" : String(totalPlays / 2);
        el.setAttribute("values", `${fromVal}; ${toVal}; ${fromVal}`);
        el.setAttribute("dur", `${durSec * 2}s`);
        el.setAttribute("repeatCount", repeatCount);
        const splines = makeSplines(2);
        if (splines) {
          el.setAttribute("calcMode", "spline");
          el.setAttribute("keySplines", splines);
        } else {
          el.setAttribute("calcMode", "linear");
          el.removeAttribute("keySplines");
        }
      } else {
        // Odd total plays: F B F … encoded as a single values sequence
        const valuesArr = Array.from({ length: totalPlays + 1 }, (_, i) =>
          i % 2 === 0 ? fromVal : toVal,
        );
        const keyTimesArr = Array.from({ length: totalPlays + 1 }, (_, i) =>
          roundToFloat(i / totalPlays, 6),
        );
        el.setAttribute("values", valuesArr.join("; "));
        el.setAttribute("keyTimes", keyTimesArr.join("; "));
        el.setAttribute("dur", `${durSec * totalPlays}s`);
        el.setAttribute("repeatCount", "1");
        const splines = makeSplines(totalPlays);
        if (splines) {
          el.setAttribute("calcMode", "spline");
          el.setAttribute("keySplines", splines);
        } else {
          el.setAttribute("calcMode", "linear");
          el.removeAttribute("keySplines");
        }
      }
    }
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
