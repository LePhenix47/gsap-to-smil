import { Animation } from "./Animation.ts";
import type {
  TweenVars,
  TweenTarget,
  PropertyBuckets,
} from "@/types/index.ts";
import { PropertyRouter } from "@/utils/property-router.ts";
import { TransformComposer } from "@/utils/transform-composer.ts";
import type { PivotScaffold } from "@/utils/transform-composer.ts";
import { SMILBuilder } from "@/utils/builders.ts";
import type { AnimateOptions } from "@/types/builders.type.ts";
import { Easing } from "@/utils/easing.ts";
import { TriggerResolver } from "@/utils/trigger-resolver.ts";

type ScaffoldRecord = PivotScaffold & {
  parent: ParentNode;
  nextSibling: ChildNode | null;
};

/**
 * A single GSAP-style tween that generates SMIL elements and injects them into the DOM.
 * Instantiated by `smil.to()`, `smil.from()`, and `smil.fromTo()`.
 *
 * Pass `fromVars` for `fromTo()`, or `isFrom = true` for `from()`.
 */
export class SMILTween extends Animation {
  /** Resolved target elements (always an array). */
  readonly targetElements: Element[];

  /** All SMIL animation elements created by this tween. */
  readonly animationElements: SVGAnimationElement[] = [];

  /** fromVars for fromTo(), or null. */
  readonly fromVarsRecord: TweenVars | null;

  /** True when this is a from() tween. */
  readonly isFromTween: boolean;

  /** Pre-animation attribute values for each target (used by revert()). */
  private readonly originalAttributes = new Map<
    Element,
    Map<string, string | null>
  >();

  /** Pivot scaffolds created by TransformComposer (used by kill() to unwrap). */
  private readonly pivotScaffolds: ScaffoldRecord[] = [];

  constructor(
    targetParam: TweenTarget,
    toVars: TweenVars,
    fromVarsInput?: TweenVars | null,
    isFromFlag?: boolean,
  ) {
    super(toVars);

    this.isFromTween = isFromFlag ?? false;
    this.fromVarsRecord = fromVarsInput ?? null;

    const resolved = SMILTween.resolveTargets(targetParam);
    this.targetElements = resolved;

    if (resolved.length === 0) return;

    this.originalAttributes = SMILTween.snapshotAttributes(resolved);

    const buckets = PropertyRouter.route(toVars);

    this.buildElements(toVars, buckets);
    this.hasBuilt = true;
  }

  // ===== Target Resolution =====

  /** Normalises TweenTarget to Element[]. */
  private static resolveTargets = (targetParam: TweenTarget): Element[] => {
    if (typeof targetParam === "string") {
      return Array.from(document.querySelectorAll(targetParam));
    }

    if (targetParam instanceof NodeList) {
      return Array.from(targetParam) as Element[];
    }

    if (Array.isArray(targetParam)) return targetParam;

    return [targetParam as Element];
  };

  // ===== Attribute Snapshot (for revert) =====

  private static readonly ANIMATABLE_ATTRIBUTES = new Set([
    "opacity", "fill", "stroke", "strokeWidth", "strokeOpacity", "fillOpacity",
  ]);

  private static snapshotAttributes = (
    targets: Element[],
  ): Map<Element, Map<string, string | null>> => {
    const snapshot = new Map<Element, Map<string, string | null>>();

    for (const target of targets) {
      const attributeMap = new Map<string, string | null>();

      for (const attributeName of SMILTween.ANIMATABLE_ATTRIBUTES) {
        attributeMap.set(attributeName, target.getAttribute(attributeName));
      }

      snapshot.set(target, attributeMap);
    }

    return snapshot;
  };

  // ===== Build Pipeline =====

  private buildElements = (
    toVars: TweenVars,
    buckets: PropertyBuckets,
  ): void => {
    const {
      delay = 0,
      ease,
      yoyo,
      transformOrigin,
      trigger,
    } = toVars;

    const fromBuckets: PropertyBuckets | null = this.fromVarsRecord
      ? PropertyRouter.route(this.fromVarsRecord)
      : null;

    const triggerBegin = this.targetElements.length > 0
      ? TriggerResolver.resolve(this.targetElements[0], trigger)
      : null;

    const hasYoyo = yoyo === true
      && this.repeatCount !== 0;

    if (hasYoyo) {
      this.buildYoyoElements(toVars, buckets, fromBuckets, triggerBegin);
      return;
    }

    // Resolve transform direction
    let fromTransforms: PropertyBuckets["transforms"] | undefined;
    let toTransforms: PropertyBuckets["transforms"];

    if (this.isFromTween) {
      // from(): animate FROM given values TO identity
      // Pass from values as toTransforms, set fromTransforms to identity
      toTransforms = buckets.transforms;
      fromTransforms = {};
    } else {
      toTransforms = buckets.transforms;
      fromTransforms = fromBuckets?.transforms;
    }

    const hasTransforms = Object.keys(toTransforms).length > 0
      || Object.keys(fromTransforms ?? {}).length > 0;

    for (const target of this.targetElements) {
      // TODO: StaggerResolver (Step 6)
      const staggerDelay = 0;

      const totalDelay = delay + staggerDelay;

      this.buildDirectProperties(
        target, buckets, fromBuckets, totalDelay, { ease }, triggerBegin,
      );

      // attr: {} — SVG presentation attributes (Phase 2, minimal support for demo)
      this.buildAttrElements(
        target, buckets.attrs, fromBuckets?.attrs, totalDelay, { ease }, triggerBegin,
      );

      if (hasTransforms) {
        this.buildTransformElements(
          target,
          toTransforms,
          fromTransforms ?? undefined,
          totalDelay,
          transformOrigin,
          { ease },
          this.isFromTween,
          triggerBegin,
        );
      }
    }
  };

  // ===== Yoyo Build Path =====

  private buildYoyoElements = (
    toVars: TweenVars,
    buckets: PropertyBuckets,
    fromBuckets: PropertyBuckets | null,
    triggerBegin: string | null,
  ): void => {
    const { delay = 0, ease, transformOrigin } = toVars;

    const totalPlays = this.repeatCount + 1;
    const durationSeconds = this.durationSeconds;

    // Per-property yoyo encoding
    for (const target of this.targetElements) {
      // Direct properties
      for (const [attributeName, toValue] of Object.entries(buckets.direct)) {
        if (toValue === undefined) continue;

        const fromValue = target.getAttribute(attributeName) ?? "1";

        const { values, dur, repeatCount } = SMILTween.computeYoyoEncoding(
          fromValue, String(toValue), totalPlays, durationSeconds, this.repeatCount,
        );

        const animationOptions: AnimateOptions = {
          attributeName,
          dur,
          delay,
          ease,
        };
        // Override from/to with values
        const element = SMILBuilder.animate(animationOptions);
        // Override SMILBuilder's repeatCount (GSAP off-by-one) with our computed yoyo value
        element.setAttribute("repeatCount", String(repeatCount));
        element.setAttribute("values", values);
        element.removeAttribute("from");
        element.removeAttribute("to");

        // Recompute keyTimes for the actual interval count (values may have been overridden)
        const yoyoIntervalCount = values.split(";").length - 1;
        const keyTimes = Easing.resolveKeyTimes(yoyoIntervalCount);
        element.setAttribute("keyTimes", keyTimes);

        // Yoyo easing: alternating forward/reversed keySplines
        SMILTween.applyYoyoEasing(element, ease, values);

        if (triggerBegin) {
          const existingBegin = element.getAttribute("begin");
          element.setAttribute("begin", existingBegin ? `${triggerBegin}; ${existingBegin}` : triggerBegin);
        }

        SMILBuilder.injectInto(target, element);
        this.animationElements.push(element);
      }

      // Transform properties
      const hasTransforms = Object.keys(buckets.transforms).length > 0;
      if (!hasTransforms) continue;

      // Build identity-to-to for yoyo encoding
      const fromTransforms: PropertyBuckets["transforms"] = {};
      const result = TransformComposer.compose({
        toTransforms: buckets.transforms,
        fromTransforms,
        target,
        dur: durationSeconds,
        delay,
        repeat: this.repeatCount,
        ease,
        transformOrigin,
      });

      // Get identity and target values
      for (const element of [...result.outerAnims, ...result.innerAnims]) {
        const from = element.getAttribute("from") ?? "";
        const to = element.getAttribute("to") ?? "";

        const { values, dur, repeatCount } = SMILTween.computeYoyoEncoding(
          from, to, totalPlays, durationSeconds, this.repeatCount,
        );

        element.setAttribute("values", values);
        element.setAttribute("dur", `${dur}s`);
        element.setAttribute("repeatCount", String(repeatCount));
        element.removeAttribute("from");
        element.removeAttribute("to");

        const yoyoIntervalCount = values.split(";").length - 1;
        element.setAttribute("keyTimes", Easing.resolveKeyTimes(yoyoIntervalCount));

        SMILTween.applyYoyoEasing(element, ease, values);

        if (triggerBegin) {
          const existingBegin = element.getAttribute("begin");
          element.setAttribute("begin", existingBegin ? `${triggerBegin}; ${existingBegin}` : triggerBegin);
        }
      }

      // Inject into target (no pivot scaffold for yoyo yet)
      SMILBuilder.injectInto(target, ...result.outerAnims, ...result.innerAnims);
      this.animationElements.push(...result.outerAnims, ...result.innerAnims);
    }
  };

  /** Computes yoyo values, dur, and repeatCount for a single property. */
  private static computeYoyoEncoding = (
    fromValue: string,
    toValue: string,
    totalPlays: number,
    durationSeconds: number,
    gsapRepeat: number,
  ): { values: string; dur: number; repeatCount: number | string } => {
    const isEven = totalPlays % 2 === 0;
    const isInfinite = gsapRepeat === -1;

    if (isInfinite) {
      // One yoyo cycle, repeat indefinitely
      return {
        values: `${fromValue}; ${toValue}; ${fromValue}`,
        dur: durationSeconds * 2,
        repeatCount: "indefinite",
      };
    }

    if (isEven) {
      // Clean F+B cycles
      return {
        values: `${fromValue}; ${toValue}; ${fromValue}`,
        dur: durationSeconds * 2,
        repeatCount: totalPlays / 2,
      };
    }

    // Odd plays: full F+B+F sequence in one cycle
    const sequenceLength = totalPlays + 1;
    const sequenceParts: string[] = [];
    for (let index = 0; index < sequenceLength; index++) {
      const isEvenPlay = index % 2 === 0;
      sequenceParts.push(isEvenPlay ? fromValue : toValue);
    }

    return {
      values: sequenceParts.join("; "),
      dur: durationSeconds * totalPlays,
      repeatCount: 1,
    };
  };

  /** Applies alternating forward/reversed keySplines for yoyo. */
  private static applyYoyoEasing = (
    element: SVGAnimationElement,
    ease: TweenVars["ease"],
    values: string,
  ): void => {
    if (!ease || ease === "linear" || ease === "none") return;

    const bezier = Easing.resolveEase(ease);
    if (!bezier) return;

    const forwardBezier = bezier.join(" ");
    const [x1, y1, x2, y2] = bezier;
    const reversedBezier = `${1 - x2} ${1 - y2} ${1 - x1} ${1 - y1}`;

    const intervalCount = values.split(";").length - 1;
    const splines: string[] = [];
    for (let index = 0; index < intervalCount; index++) {
      // Alternating: even intervals = forward, odd intervals = reversed
      splines.push(index % 2 === 0 ? forwardBezier : reversedBezier);
    }

    element.setAttribute("keySplines", splines.join("; "));
  };

  // ===== attr: {} Properties =====

  private buildAttrElements = (
    target: Element,
    attrs: PropertyBuckets["attrs"],
    fromAttrs: PropertyBuckets["attrs"] | undefined,
    delay: number,
    timing: { ease?: TweenVars["ease"] },
    triggerBegin: string | null,
  ): void => {
    const { ease } = timing;

    for (const [attributeName, value] of Object.entries(attrs)) {
      if (value === undefined || value === null) continue;

      const animationOptions: AnimateOptions = {
        attributeName,
        dur: this.durationSeconds,
        delay,
        repeat: this.repeatCount,
        ease,
      };

      if (fromAttrs) {
        const fromValue = fromAttrs[attributeName];
        if (fromValue !== undefined && fromValue !== null) {
          animationOptions.from = String(fromValue);
        }
      }

      animationOptions.to = String(value);
      const element = SMILBuilder.animate(animationOptions);

      if (triggerBegin) {
        const existingBegin = element.getAttribute("begin");
        element.setAttribute("begin", existingBegin ? `${existingBegin}; ${triggerBegin}` : triggerBegin);
      }

      SMILBuilder.injectInto(target, element);
      this.animationElements.push(element);
    }
  };

  // ===== Direct Properties =====

  private buildDirectProperties = (
    target: Element,
    buckets: PropertyBuckets,
    fromBuckets: PropertyBuckets | null,
    delay: number,
    timing: { ease?: TweenVars["ease"] },
    triggerBegin: string | null,
  ): void => {
    const { ease } = timing;

    for (const [attributeName, value] of Object.entries(buckets.direct)) {
      if (value === undefined) continue;

      const animationOptions: AnimateOptions = {
        attributeName,
        dur: this.durationSeconds,
        delay,
        repeat: this.repeatCount,
        ease,
      };

      if (this.isFromTween) {
        animationOptions.from = String(value);
      } else if (fromBuckets) {
        const fromValue = fromBuckets.direct[attributeName];
        if (fromValue !== undefined) {
          animationOptions.from = String(fromValue);
        }
        animationOptions.to = String(value);
      } else {
        animationOptions.to = String(value);
      }

      const element = SMILBuilder.animate(animationOptions);
      if (triggerBegin) {
        const existingBegin = element.getAttribute("begin");
        element.setAttribute("begin", existingBegin ? `${triggerBegin}; ${existingBegin}` : triggerBegin);
      }
      SMILBuilder.injectInto(target, element);
      this.animationElements.push(element);
    }
  };

  // ===== Transform Properties =====

  private buildTransformElements = (
    target: Element,
    toTransforms: PropertyBuckets["transforms"],
    fromTransforms: PropertyBuckets["transforms"] | undefined,
    delay: number,
    transformOrigin: string | undefined,
    timing: { ease?: TweenVars["ease"] },
    invertDirection = false,
    triggerBegin: string | null = null,
  ): void => {
    const { ease } = timing;

    const result = TransformComposer.compose({
      toTransforms,
      fromTransforms,
      target,
      dur: this.durationSeconds,
      delay,
      repeat: this.repeatCount,
      ease,
      transformOrigin,
    });

    // from(): flip from/to on output elements (animate FROM given values TO identity)
    if (invertDirection) {
      for (const element of result.outerAnims) {
        const from = element.getAttribute("from");
        const to = element.getAttribute("to");
        if (from !== null) element.setAttribute("to", from);
        if (to !== null) element.setAttribute("from", to);
      }
      for (const element of result.innerAnims) {
        const from = element.getAttribute("from");
        const to = element.getAttribute("to");
        if (from !== null) element.setAttribute("to", from);
        if (to !== null) element.setAttribute("from", to);
      }
    }

    const allAnims = [...result.outerAnims, ...result.innerAnims];

    // Apply trigger begin to all transform elements
    if (triggerBegin) {
      for (const element of allAnims) {
        const existingBegin = element.getAttribute("begin");
        element.setAttribute("begin", existingBegin ? `${triggerBegin}; ${existingBegin}` : triggerBegin);
      }
    }

    if (result.needsWrapper) {
      const scaffold = TransformComposer.buildPivotScaffold(
        target,
        result.origin.cx,
        result.origin.cy,
      );

      if (scaffold) {
        SMILBuilder.injectInto(scaffold.outer, ...result.outerAnims);
        SMILBuilder.injectInto(scaffold.inner, ...result.innerAnims);

        this.pivotScaffolds.push({
          ...scaffold,
          parent: target.parentNode!,
          nextSibling: target.nextSibling,
        });
      } else {
        // Scaffold unavailable (e.g. element not in DOM).
        // Fall back: inject directly. Scale/skew will use (0,0) as origin.
        SMILBuilder.injectInto(target, ...allAnims);
      }
    } else {
      SMILBuilder.injectInto(target, ...result.outerAnims);
    }

    this.animationElements.push(...allAnims);
  };

  // ===== kill() =====

  kill = (): this => {
    if (!this.hasBuilt) return this;

    for (const scaffold of this.pivotScaffolds) {
      const pivotOut = scaffold.inner.firstElementChild;
      if (pivotOut) {
        const originalElement = pivotOut.firstElementChild;
        if (originalElement && scaffold.parent) {
          scaffold.parent.insertBefore(originalElement, scaffold.nextSibling);
        }
      }
      scaffold.outer.remove();
    }

    this.pivotScaffolds.length = 0;

    for (const element of this.animationElements) {
      element.remove();
    }

    this.animationElements.length = 0;
    this.hasBuilt = false;

    return this;
  };

  // ===== revert() =====

  revert = (): this => {
    for (const [target, attributeMap] of this.originalAttributes) {
      for (const [attributeName, originalValue] of attributeMap) {
        if (originalValue === null) {
          target.removeAttribute(attributeName);
        } else {
          target.setAttribute(attributeName, originalValue);
        }
      }
    }

    return this.kill();
  };
}
