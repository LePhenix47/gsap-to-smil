import { Animation } from "./Animation.ts";
import type {
  TweenVars,
  TweenTarget,
  TransformProps,
  DirectProps,
  PropertyBuckets,
} from "@/types/index.ts";

/**
 * Accumulated absolute transform state for a single element, representing the sum
 * of all prior frozen animateTransform(additive="sum") contributions in a timeline.
 * Translate/rotation/skew are additive (subtract to get delta); scale is multiplicative (divide).
 */
export type TransformAccumState = {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
};

/**
 * Converts absolute transform target values to delta values relative to the
 * accumulated frozen sum. When applied with additive="sum", the total of all
 * frozen animations + this delta equals the desired absolute position.
 */
const computeTransformDelta = (
  absolute: TransformProps,
  accum: TransformAccumState,
): TransformProps => {
  const n = (v: number | string | undefined, fallback: number) =>
    v !== undefined ? Number(v) : fallback;
  const delta: TransformProps = {};
  if ("x" in absolute) delta.x = n(absolute.x, 0) - accum.x;
  if ("y" in absolute) delta.y = n(absolute.y, 0) - accum.y;
  if ("rotation" in absolute) delta.rotation = n(absolute.rotation, 0) - accum.rotation;
  // Scale composes multiplicatively under SVG transform concatenation.
  if ("scale" in absolute) {
    delta.scaleX = n(absolute.scale, 1) / accum.scaleX;
    delta.scaleY = n(absolute.scale, 1) / accum.scaleY;
  } else {
    if ("scaleX" in absolute) delta.scaleX = n(absolute.scaleX, 1) / accum.scaleX;
    if ("scaleY" in absolute) delta.scaleY = n(absolute.scaleY, 1) / accum.scaleY;
  }
  if ("skewX" in absolute) delta.skewX = n(absolute.skewX, 0) - accum.skewX;
  if ("skewY" in absolute) delta.skewY = n(absolute.skewY, 0) - accum.skewY;
  // xPercent/yPercent are resolved to px inside resolveTranslate; pass through as-is.
  if ("xPercent" in absolute) delta.xPercent = absolute.xPercent;
  if ("yPercent" in absolute) delta.yPercent = absolute.yPercent;
  return delta;
};
import { PropertyRouter } from "@/utils/property-router.ts";
import {
  TransformComposer,
  type PivotScaffold,
} from "@/utils/transform-composer.ts";
import { StaggerResolver } from "@/utils/stagger-resolver.ts";
import { SMILBuilder } from "@/utils/builders.ts";
import { DrawSVGPlugin } from "@/plugins/DrawSMILPlugin.ts";
import { Easing } from "@/utils/easing.ts";
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
  /** Set by SMILTimeline before build to enable per-target delta encoding. */
  _timelineAccum: Map<Element, TransformAccumState> | null = null;

  private _originalValues = new Map<Element, Record<string, string | null>>();
  private _wrapperOuters = new Map<Element, SVGGElement>();
  /** Pending (anim, dest) pairs collected in timeline mode; flushed by _injectPending(). */
  private _pendingInjections: Array<{ anim: SVGAnimationElement; dest: Element }> = [];

  constructor(
    targets: TweenTarget,
    vars: TweenVars,
    fromVars?: TweenVars | null,
    isFrom = false,
    deferBuild = false,
  ) {
    super(vars);
    this._vars = vars;
    this._fromVars = fromVars ?? null;
    this._isFrom = isFrom;
    this._targets = this._resolveTargets(targets);
    if (!deferBuild) this._build();
  }

  /** Triggers build when creation was deferred (timeline usage). No-op if already built. */
  _buildDeferred = (): void => {
    if (!this._initialized) this._build();
  };

  /**
   * Flushes elements collected in timeline mode into the DOM.
   * Must be called by SMILTimeline._addChild() after _rewriteBegin() so that
   * SMIL never sees an animation element without its correct begin= time.
   */
  _injectPending = (): void => {
    for (const { anim, dest } of this._pendingInjections) {
      dest.appendChild(anim);
    }
    this._pendingInjections = [];
  };

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
    if (this._vars.keyframes !== undefined) {
      console.warn("[gsap-to-smil] keyframes are not yet supported — skipped.");
      return;
    }

    const { transforms, direct, plugins } = PropertyRouter.route(this._vars);
    const fromRouted = this._fromVars ? PropertyRouter.route(this._fromVars) : null;

    const staggerDelays = this._vars.stagger
      ? StaggerResolver.resolveDelays(this._targets.length, this._vars.stagger)
      : null;

    const maxStagger = staggerDelays ? Math.max(...staggerDelays) : 0;
    // When stagger+repeat is active, each target's cycle is extended to groupDuration so they
    // all restart together. The stagger offset is encoded in values/keyTimes instead of begin.
    const hasStaggerRepeat =
      staggerDelays !== null && this._repeat !== 0 && maxStagger > 0;

    // For non-repeat stagger, each element's begin= is offset individually. The tween's
    // effective span in a timeline is therefore _dur + maxStagger, not just _dur.
    // Extend _tDur now so SMILTimeline._addChild computes _prevEnd correctly.
    if (!hasStaggerRepeat && maxStagger > 0) {
      this._tDur = this._tDur === Infinity ? Infinity : this._tDur + maxStagger;
    }

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

      this._saveOriginals(target, transforms, direct, plugins);

      const timingOpts = {
        dur: groupDuration,
        delay: beginDelay || undefined,
        repeat: this._repeat,
        ease: this._vars.ease,
      };

      // Resolve absolute from/to (accounting for the isFrom direction swap).
      const absoluteTo: TransformProps = this._isFrom
        ? this._identityFor(transforms)
        : transforms;
      const absoluteFrom: TransformProps | undefined = this._isFrom
        ? transforms
        : fromRouted?.transforms;

      // In a timeline context, encode deltas so that all frozen prior
      // animateTransform(additive="sum") contributions still yield the correct
      // absolute position when summed with this tween's animated value.
      const accum = this._timelineAccum?.get(target) ?? null;
      const effectiveTo = accum ? computeTransformDelta(absoluteTo, accum) : absoluteTo;
      const effectiveFrom = accum
        ? (absoluteFrom ? computeTransformDelta(absoluteFrom, accum) : undefined)
        : absoluteFrom;

      const { outerAnims, innerAnims, scaffold } = this._buildTransforms(
        target,
        effectiveTo,
        effectiveFrom,
        beginDelay,
        groupDuration,
      );

      const directAnims = this._buildDirect(
        direct,
        fromRouted?.direct,
        beginDelay,
        groupDuration,
        this._yoyo ? (this._originalValues.get(target) ?? undefined) : undefined,
      );

      const drawAnims: SVGAnimationElement[] = (() => {
        if (plugins.drawSVG === undefined) return [];
        if (this._dur === 0) {
          DrawSVGPlugin.applyState(target, this._isFrom ? true : plugins.drawSVG);
          return [];
        }
        return DrawSVGPlugin.buildAnimation(
          target,
          this._isFrom ? true : plugins.drawSVG,
          this._isFrom ? plugins.drawSVG : fromRouted?.plugins.drawSVG,
          timingOpts,
        );
      })();

      const elements: SVGAnimationElement[] = [
        ...outerAnims,
        ...innerAnims,
        ...directAnims,
        ...drawAnims,
      ];

      if (hasStaggerRepeat) {
        this._applyStaggerEncoding(elements, staggerOffset, groupDuration, this._yoyo);
      }

      // Inject transform animations into their scaffold targets or directly into the element.
      // In timeline mode (_timelineAccum set), defer injection so _rewriteBegin can set
      // correct begin= times before the SMIL engine ever sees the elements in the DOM.
      // Without this, elements with beginDelay=0 (no begin attr) start immediately on
      // insertion, and the subsequent _rewriteBegin has no effect.
      if (this._timelineAccum) {
        if (scaffold) {
          for (const anim of outerAnims) this._pendingInjections.push({ anim, dest: scaffold.outer });
          for (const anim of innerAnims) this._pendingInjections.push({ anim, dest: scaffold.inner });
        } else {
          for (const anim of outerAnims) this._pendingInjections.push({ anim, dest: target });
        }
        for (const anim of directAnims) this._pendingInjections.push({ anim, dest: target });
        for (const anim of drawAnims) this._pendingInjections.push({ anim, dest: target });
      } else {
        if (scaffold) {
          for (const anim of outerAnims) scaffold.outer.appendChild(anim);
          for (const anim of innerAnims) scaffold.inner.appendChild(anim);
        } else {
          for (const anim of outerAnims) target.appendChild(anim);
        }
        for (const anim of directAnims) target.appendChild(anim);
        for (const anim of drawAnims) target.appendChild(anim);
      }

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
    plugins: PropertyBuckets["plugins"],
  ): void => {
    const originals: Record<string, string | null> = {};

    if (Object.keys(transforms).length > 0) {
      originals["transform"] = target.getAttribute("transform");
    }
    for (const attr of Object.keys(direct)) {
      originals[attr] = target.getAttribute(attr);
    }
    if (plugins.drawSVG !== undefined) {
      originals["stroke-dasharray"] = target.getAttribute("stroke-dasharray");
      originals["stroke-dashoffset"] = target.getAttribute("stroke-dashoffset");
      originals["pathLength"] = target.getAttribute("pathLength");
    }

    this._originalValues.set(target, originals);
  };

  /**
   * Creates `<animateTransform>` elements for all active transform keys.
   *
   * When scale or skew is present, also builds a pivot scaffold around the target
   * and stores it in `_wrapperOuters`. The caller is responsible for injecting
   * `outerAnims` into `scaffold.outer` and `innerAnims` into `scaffold.inner`.
   * In flat mode (translate/rotate only), all animations are in `outerAnims`
   * and should be injected directly into the target.
   */
  private _buildTransforms = (
    target: Element,
    toTransforms: TransformProps,
    fromTransforms: TransformProps | undefined,
    delay: number,
    dur: number,
  ): { outerAnims: SVGAnimateTransformElement[]; innerAnims: SVGAnimateTransformElement[]; scaffold: PivotScaffold | null } => {
    const timing = {
      dur,
      delay: delay || undefined,
      repeat: this._repeat,
      ease: this._vars.ease,
    };

    const composeArgs = fromTransforms
      ? { target, fromTransforms, toTransforms, transformOrigin: this._vars.transformOrigin, ...timing }
      : { target, toTransforms, transformOrigin: this._vars.transformOrigin, ...timing };

    const result = TransformComposer.compose(composeArgs);

    if (result.needsWrapper) {
      const scaffold = TransformComposer.buildPivotScaffold(target, result.origin.cx, result.origin.cy);
      if (scaffold) {
        // Earlier flat-mode tweens injected translate <animateTransform> directly onto
        // the element. The element is now inside the scaffold, putting those animations
        // in the wrong coordinate space. Clone them into the outer lane (new DOM nodes so
        // the SMIL engine treats them as freshly inserted) and remove the originals.
        const existingTranslates = Array.from(target.children).filter(
          (c): c is Element =>
            c instanceof Element &&
            c.tagName === "animateTransform" &&
            c.getAttribute("type") === "translate",
        );
        for (const anim of existingTranslates) {
          scaffold.outer.prepend(anim.cloneNode(true));
          anim.remove();
        }

        this._wrapperOuters.set(target, scaffold.outer);
        return { outerAnims: result.outerAnims, innerAnims: result.innerAnims, scaffold };
      }
      // Element not in DOM — degrade gracefully: inject all anims directly onto target.
      return {
        outerAnims: [...result.outerAnims, ...result.innerAnims],
        innerAnims: [],
        scaffold: null,
      };
    }

    return { outerAnims: result.outerAnims, innerAnims: [], scaffold: null };
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
        elements.push(SMILBuilder.animate({ ...shared, from: String(value) }));
      } else if (fromDirect) {
        const fromValue = fromDirect[attr];
        elements.push(
          SMILBuilder.animate({
            ...shared,
            from: fromValue !== undefined ? String(fromValue) : undefined,
            to: String(value),
          }),
        );
      } else if (originals) {
        // yoyo: set explicit from so _applyYoyoEncoding can read both from and to
        const origVal = originals[attr];
        elements.push(
          SMILBuilder.animate({
            ...shared,
            from: origVal != null ? origVal : undefined,
            to: String(value),
          }),
        );
      } else {
        elements.push(SMILBuilder.animate({ ...shared, to: String(value) }));
      }
    }

    return elements;
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

    const bezier = Easing.resolveEase(ease);
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

    const bezier = Easing.resolveEase(ease);
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
    const bezier = ease && ease !== "none" && ease !== "linear" ? Easing.resolveEase(ease) : null;

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
        el.setAttribute("keyTimes", "0; 0.5; 1");
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

    // Removing <animateTransform> elements already un-freezes the element in SMIL
    // (fill="freeze" only holds while the element is in the DOM), so the element
    // returns to its base position regardless. Clean up the scaffold here so
    // timeline clear/kill doesn't leave empty <g> wrappers behind.
    for (const [el, outerGroup] of this._wrapperOuters) {
      const scaffoldParent = outerGroup.parentNode;
      if (scaffoldParent) {
        scaffoldParent.insertBefore(el, outerGroup);
        outerGroup.remove();
      }
    }
    this._wrapperOuters.clear();

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
