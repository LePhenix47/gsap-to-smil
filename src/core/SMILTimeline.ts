// fallow-ignore-file
import { Animation } from "./Animation.ts";
import { SMILTween } from "./SMILTween.ts";
import { SMILBuilder } from "@/utils/builders.ts";
import { TransformComposer } from "@/utils/transform-composer.ts";
import { PropertyRouter } from "@/utils/property-router.ts";
import { Easing } from "@/utils/easing.ts";
import { StaggerResolver } from "@/utils/stagger-resolver.ts";
import type {
  TweenVars,
  TweenTarget,
  TimelineVars,
  PositionParam,
  TransformProps,
} from "@/types/index.ts";
import { TriggerResolver } from "@/utils/trigger-resolver.ts";

type ChildEntry = {
  tween: SMILTween;
  absoluteStart: number;
};

/**
 * One timeline `.to()` call's transform content, deferred for Strategy 3 build.
 */
type TransformPhase = {
  targets: Element[];
  transformVars: TransformProps;
  ease: TweenVars["ease"];
  absoluteStart: number;
  tweenDurationSeconds: number;
  stagger?: TweenVars["stagger"];
};

/**
 * Per-target view of a TransformPhase after stagger offsets are resolved.
 */
type TargetPhase = {
  effectiveStart: number;
  tweenDurationSeconds: number;
  transformVars: TransformProps;
  ease: TweenVars["ease"];
};

/**
 * A pivot scaffold built by Strategy 3 build, tracked for cleanup.
 */
type PivotScaffoldEntry = {
  outer: SVGGElement;
  target: Element;
};

/**
 * One `<animateTransform>` element's keyframe data (Strategy 3).
 * Values, boundaries, and per-interval eases form one cohesive unit.
 */
type KeyframeSequence = {
  valueStrings: string[];
  easePerInterval: (TweenVars["ease"] | null)[];
  boundaries: number[];
};

const TRANSFORM_KEY_SET = new Set([
  "x", "y", "z", "xPercent", "yPercent",
  "rotation", "rotationX", "rotationY",
  "scale", "scaleX", "scaleY",
  "skewX", "skewY",
]);

/**
 * A GSAP-style timeline that creates and coordinates SMIL animations.
 *
 * Non-transform properties (opacity, fill, stroke, attr) are injected eagerly
 * via {@link SMILTween} as each `.to()` call is made.
 *
 * Transform properties (x, y, scale, rotation, skewX, skewY, …) are collected
 * and built lazily via {@link build}. Strategy 3 (values= + one element per
 * transform type per target) is used: one `<animateTransform>` per type covers
 * the entire timeline duration as keyframes, so no pivot scaffold DOM mutation
 * conflicts arise from multi-step sequences.
 *
 * Call `.build()` after all `.to()` calls are complete.
 */
export class SMILTimeline extends Animation {
  /** Non-transform tween entries, in insertion order. */
  children: ChildEntry[] = [];

  /** Default `TweenVars` merged into every child created via `to()`. */
  defaults: Partial<TweenVars>;

  /** Named time markers stored as `{ name: absoluteTimeSeconds }`. */
  labels: Record<string, number> = {};

  /** Resolved SMIL `begin=` base string shared by all children. */
  private timelineTrigger: string | null = null;

  private lastChildStart: number = 0;
  private lastChildEnd: number = 0;

  /** Transform phases awaiting Strategy 3 build. */
  private readonly transformPhases: TransformPhase[] = [];

  /** All `<animateTransform>` elements injected by `build()`. Tracked for cleanup. */
  private readonly builtTransformElements: SVGAnimateTransformElement[] = [];

  /** Pivot scaffolds injected by `build()`. Tracked for cleanup / unwrapping. */
  private readonly builtPivotScaffolds: PivotScaffoldEntry[] = [];

  constructor(timelineVars?: TimelineVars) {
    super(timelineVars ?? {});
    this.durationSeconds = 0;
    this.totalDurationSeconds = 0;
    this.defaults = timelineVars?.defaults ?? {};
  }

  // ===== Public API =====

  to = (targetParam: TweenTarget, toVars: TweenVars, position?: PositionParam): this => {
    const mergedVars: TweenVars = { ...this.defaults, ...toVars, delay: 0 };
    const { trigger } = mergedVars;

    const targets = SMILTimeline.resolveTargets(targetParam);

    if (trigger && !this.timelineTrigger && targets.length > 0) {
      this.timelineTrigger = TriggerResolver.resolve(targets[0]!, trigger);
    }

    const absoluteStart = this.resolvePosition(position);
    const buckets = PropertyRouter.route(mergedVars);

    const hasTransforms = Object.keys(buckets.transforms).length > 0;
    const hasNonTransforms =
      Object.keys(buckets.direct).length > 0 ||
      Object.keys(buckets.attrs).length > 0;

    const tweenDurationSeconds: number = buckets.special.duration;
    const stepDurationSeconds: number = SMILTimeline.computeStepDuration(
      tweenDurationSeconds,
      mergedVars.stagger,
      targets.length,
    );
    const childEnd = absoluteStart + stepDurationSeconds;

    if (hasNonTransforms) {
      const nonTransformVars: TweenVars = {
        ...SMILTimeline.stripTransformKeys(mergedVars),
        trigger: undefined,
      };
      const tween = new SMILTween(targetParam, nonTransformVars);
      const entry: ChildEntry = { tween, absoluteStart };
      this.children.push(entry);
      this.wireSequentialChains(entry);
      this.rewriteBegin(entry);
    }

    if (hasTransforms) {
      const { ease, stagger } = mergedVars;
      this.transformPhases.push({
        targets,
        transformVars: buckets.transforms,
        ease,
        absoluteStart,
        tweenDurationSeconds,
        stagger,
      });
    }

    if (childEnd > this.durationSeconds) {
      this.durationSeconds = childEnd;
      this.totalDurationSeconds = childEnd;
    }

    this.lastChildStart = absoluteStart;
    this.lastChildEnd = childEnd;
    this.hasBuilt = true;

    return this;
  };

  add = (tween: SMILTween, position: number): this => {
    const childEnd = position + tween.durationSeconds;
    const entry: ChildEntry = { tween, absoluteStart: position };

    this.children.push(entry);
    this.wireSequentialChains(entry);
    this.rewriteBegin(entry);

    if (childEnd > this.durationSeconds) {
      this.durationSeconds = childEnd;
      this.totalDurationSeconds = childEnd;
    }

    this.lastChildStart = position;
    this.lastChildEnd = childEnd;

    return this;
  };

  addLabel = (name: string): this => {
    this.labels[name] = this.durationSeconds;
    return this;
  };

  removeLabel = (name: string): this => {
    delete this.labels[name];
    return this;
  };

  getChildren = (): SMILTween[] => this.children.map(entry => entry.tween);

  /**
   * Builds all deferred transform animations using Strategy 3.
   *
   * Must be called after all `.to()` calls. For each (target, transform-type) pair,
   * one `<animateTransform>` element is created with the full timeline encoded as
   * keyframes in `values=` / `keyTimes=` / `keySplines=`. A pivot scaffold is built
   * once per target when scale or skew is present — no mid-sequence DOM mutations.
   */
  build = (): this => {
    if (this.transformPhases.length === 0) return this;

    const phasesByTarget = new Map<Element, TargetPhase[]>();

    for (const phase of this.transformPhases) {
      const staggerDelays: number[] =
        this.isAbsent(phase.stagger) || phase.targets.length <= 1
          ? phase.targets.map(() => 0)
          : StaggerResolver.resolveDelays(phase.targets.length, phase.stagger!);

      for (const [index, target] of phase.targets.entries()) {
        const staggerOffset: number = staggerDelays[index] ?? 0;
        const existingPhases: TargetPhase[] = phasesByTarget.get(target) ?? [];
        existingPhases.push({
          effectiveStart: phase.absoluteStart + staggerOffset,
          tweenDurationSeconds: phase.tweenDurationSeconds,
          transformVars: phase.transformVars,
          ease: phase.ease,
        });
        phasesByTarget.set(target, existingPhases);
      }
    }

    for (const [target, phases] of phasesByTarget) {
      const sortedPhases: TargetPhase[] = [...phases].sort(
        (phaseA, phaseB) => phaseA.effectiveStart - phaseB.effectiveStart,
      );
      this.buildTransformsForTarget(target, sortedPhases);
    }

    return this;
  };

  clear = (): this => {
    for (const entry of this.children) {
      entry.tween.kill();
    }
    this.killBuiltTransforms();
    this.children = [];
    this.transformPhases.length = 0;
    this.durationSeconds = 0;
    this.totalDurationSeconds = 0;
    this.lastChildStart = 0;
    this.lastChildEnd = 0;
    this.hasBuilt = false;
    return this;
  };

  kill = (): this => {
    for (const entry of this.children) {
      entry.tween.kill();
    }
    this.killBuiltTransforms();
    this.children = [];
    return this;
  };

  revert = (): this => {
    for (const entry of this.children) {
      entry.tween.revert();
    }
    this.killBuiltTransforms();
    this.children = [];
    return this;
  };

  // ===== Position Resolution =====

  private resolvePosition = (position: PositionParam | undefined): number => {
    if (this.isAbsent(position)) return this.lastChildEnd;
    if (typeof position === "number") return Math.max(0, position);
    return this.resolveStringPosition(position);
  };

  private resolveStringPosition = (position: string): number => {
    if (position === ">") return this.lastChildEnd;
    if (position === "<") return this.lastChildStart;

    if (position.startsWith(">")) {
      const offset = parseFloat(position.slice(1));
      return Math.max(0, this.lastChildEnd + offset);
    }

    if (position.startsWith("<")) {
      const offset = parseFloat(position.slice(1));
      return Math.max(0, this.lastChildStart + offset);
    }

    if (position.startsWith("+=")) {
      const offset = parseFloat(position.slice(2));
      return Math.max(0, this.durationSeconds + offset);
    }

    if (position.startsWith("-=")) {
      const offset = parseFloat(position.slice(2));
      return Math.max(0, this.durationSeconds - offset);
    }

    const plusMatch = /^(.+)\+=(\d+\.?\d*)$/.exec(position);
    if (plusMatch) {
      const labelName: string = plusMatch[1]!;
      const labelOffset: number = parseFloat(plusMatch[2]!);
      const labelTime: number = this.labels[labelName] ?? 0;
      return Math.max(0, labelTime + labelOffset);
    }

    const minusMatch = /^(.+)-=(\d+\.?\d*)$/.exec(position);
    if (minusMatch) {
      const labelName: string = minusMatch[1]!;
      const labelOffset: number = parseFloat(minusMatch[2]!);
      const labelTime: number = this.labels[labelName] ?? 0;
      return Math.max(0, labelTime - labelOffset);
    }

    return this.labels[position] ?? 0;
  };

  // ===== Begin Rewriting (non-transform tweens) =====

  private computeBeginValue = (effectiveBegin: number): string | null => {
    if (this.timelineTrigger && effectiveBegin === 0) return this.timelineTrigger;
    if (this.timelineTrigger) return `${this.timelineTrigger} + ${effectiveBegin}s`;
    if (effectiveBegin === 0) return null;
    return `${effectiveBegin}s`;
  };

  private rewriteBegin = (entry: ChildEntry): void => {
    const { tween, absoluteStart } = entry;

    for (const animationElement of tween.animationElements) {
      const perElementOffset: number = this.parseBeginOffset(animationElement);
      const effectiveBegin: number = absoluteStart + this.delaySeconds + perElementOffset;
      const beginValue = this.computeBeginValue(effectiveBegin);

      if (beginValue === null) {
        animationElement.removeAttribute("begin");
      } else {
        animationElement.setAttribute("begin", beginValue);
      }
    }
  };

  private parseBeginOffset = (element: SVGAnimationElement): number => {
    const begin = element.getAttribute("begin");
    if (!begin) return 0;
    const match = /^([\d.]+)s$/.exec(begin);
    if (!match) return 0;
    return parseFloat(match[1]!);
  };

  // ===== Sequential Chain Wiring (non-transform tweens) =====

  private wireSequentialChains = (newEntry: ChildEntry): void => {
    const { tween } = newEntry;
    for (const newAnimElement of tween.animationElements) {
      if (newAnimElement.nodeName === "animateTransform") continue;

      const targetElement = newAnimElement.parentElement;
      if (!targetElement) continue;

      const attributeName = newAnimElement.getAttribute("attributeName");
      if (!attributeName) continue;

      const precedingToValue = this.findPrecedingToValue(targetElement, attributeName);
      if (precedingToValue !== null) {
        newAnimElement.setAttribute("from", precedingToValue);
      }
    }
  };

  private findPrecedingToValue = (
    targetElement: Element,
    attributeName: string,
  ): string | null => {
    for (let index = this.children.length - 2; index >= 0; index--) {
      const previousEntry = this.children[index]!;
      for (const previousAnimElement of previousEntry.tween.animationElements) {
        if (previousAnimElement.parentElement !== targetElement) continue;
        if (previousAnimElement.getAttribute("attributeName") !== attributeName) continue;
        return previousAnimElement.getAttribute("to");
      }
    }
    return null;
  };

  // ===== Strategy 3: Transform Build =====

  private buildTransformsForTarget = (
    target: Element,
    sortedPhases: TargetPhase[],
  ): void => {
    const totalDuration = this.durationSeconds;

    const needsPivot = sortedPhases.some(
      phase =>
        !this.isAbsent(phase.transformVars.scale) ||
        !this.isAbsent(phase.transformVars.scaleX) ||
        !this.isAbsent(phase.transformVars.scaleY) ||
        !this.isAbsent(phase.transformVars.skewX) ||
        !this.isAbsent(phase.transformVars.skewY),
    );

    const hasTranslate = sortedPhases.some(
      phase =>
        !this.isAbsent(phase.transformVars.x) ||
        !this.isAbsent(phase.transformVars.y) ||
        !this.isAbsent(phase.transformVars.xPercent) ||
        !this.isAbsent(phase.transformVars.yPercent),
    );

    const hasScale = sortedPhases.some(
      phase =>
        !this.isAbsent(phase.transformVars.scale) ||
        !this.isAbsent(phase.transformVars.scaleX) ||
        !this.isAbsent(phase.transformVars.scaleY),
    );

    const hasRotation = sortedPhases.some(phase => !this.isAbsent(phase.transformVars.rotation));
    const hasSkewX = sortedPhases.some(phase => !this.isAbsent(phase.transformVars.skewX));
    const hasSkewY = sortedPhases.some(phase => !this.isAbsent(phase.transformVars.skewY));

    const pivotOrigin: { cx: number; cy: number } =
      needsPivot || hasRotation
        ? SMILTimeline.computePivotOrigin(target)
        : { cx: 0, cy: 0 };

    const outerElements: SVGAnimateTransformElement[] = [];
    const innerElements: SVGAnimateTransformElement[] = [];

    if (hasTranslate) {
      outerElements.push(this.buildTranslateElement(sortedPhases, totalDuration));
    }

    if (hasRotation) {
      const rotationCenterX = needsPivot ? 0 : pivotOrigin.cx;
      const rotationCenterY = needsPivot ? 0 : pivotOrigin.cy;
      innerElements.push(
        this.buildRotateElement(sortedPhases, totalDuration, rotationCenterX, rotationCenterY),
      );
    }

    if (hasScale) {
      innerElements.push(this.buildScaleElement(sortedPhases, totalDuration));
    }

    if (hasSkewX) {
      innerElements.push(this.buildSkewXElement(sortedPhases, totalDuration));
    }

    if (hasSkewY) {
      innerElements.push(this.buildSkewYElement(sortedPhases, totalDuration));
    }

    const allElements = [...outerElements, ...innerElements];
    this.applyRepeatAndTrigger(allElements);

    if (needsPivot && innerElements.length > 0) {
      const scaffold = TransformComposer.buildPivotScaffold(
        target,
        pivotOrigin.cx,
        pivotOrigin.cy,
      );
      if (scaffold) {
        const { outer, inner } = scaffold;
        for (const element of outerElements) outer.appendChild(element);
        for (const element of innerElements) inner.appendChild(element);
        this.builtPivotScaffolds.push({ outer, target });
      } else {
        for (const element of allElements) target.appendChild(element);
      }
    } else {
      for (const element of allElements) target.appendChild(element);
    }

    this.builtTransformElements.push(...allElements);
  };

  private static computePivotOrigin = (target: Element): { cx: number; cy: number } => {
    if (!(target instanceof SVGGraphicsElement)) return { cx: 0, cy: 0 };
    const bbox: DOMRect = target.getBBox();
    return { cx: bbox.x + bbox.width / 2, cy: bbox.y + bbox.height / 2 };
  };

  private applyRepeatAndTrigger = (elements: SVGAnimateTransformElement[]): void => {
    const repeatCountAttribute: string =
      this.repeatCount === -1 ? "indefinite" : String(Math.max(this.repeatCount + 1, 1));

    for (const element of elements) {
      element.setAttribute("repeatCount", repeatCountAttribute);
      if (this.timelineTrigger) {
        element.setAttribute("begin", this.timelineTrigger);
      }
    }
  };

  private killBuiltTransforms = (): void => {
    for (const scaffoldEntry of this.builtPivotScaffolds) {
      const nextSibling = scaffoldEntry.outer.nextSibling;
      scaffoldEntry.outer.parentNode?.insertBefore(scaffoldEntry.target, nextSibling);
      scaffoldEntry.outer.remove();
    }
    for (const element of this.builtTransformElements) {
      element.remove();
    }
    this.builtTransformElements.length = 0;
    this.builtPivotScaffolds.length = 0;
  };

  // ===== Keyframe Builders =====

  private buildTranslateElement = (
    sortedPhases: TargetPhase[],
    totalDuration: number,
  ): SVGAnimateTransformElement => {
    const translatePhases = sortedPhases.filter(
      phase =>
        !this.isAbsent(phase.transformVars.x) ||
        !this.isAbsent(phase.transformVars.y) ||
        !this.isAbsent(phase.transformVars.xPercent) ||
        !this.isAbsent(phase.transformVars.yPercent),
    );

    const boundaries = SMILTimeline.collectBoundaries(translatePhases, totalDuration);
    let currentX = 0;
    let currentY = 0;
    const valueStrings: string[] = [];
    const easePerInterval: (TweenVars["ease"] | null)[] = [];

    for (let index = 0; index < boundaries.length; index++) {
      const boundaryTime: number = boundaries[index]!;

      for (const phase of translatePhases) {
        const phaseEnd: number = phase.effectiveStart + phase.tweenDurationSeconds;
        if (Math.abs(phaseEnd - boundaryTime) < 0.00001) {
          if (!this.isAbsent(phase.transformVars.x)) currentX = Number(phase.transformVars.x);
          if (!this.isAbsent(phase.transformVars.y)) currentY = Number(phase.transformVars.y);
          if (!this.isAbsent(phase.transformVars.xPercent)) currentX = Number(phase.transformVars.xPercent);
          if (!this.isAbsent(phase.transformVars.yPercent)) currentY = Number(phase.transformVars.yPercent);
        }
      }

      valueStrings.push(`${currentX} ${currentY}`);

      if (index < boundaries.length - 1) {
        easePerInterval.push(
          SMILTimeline.findActiveEase(translatePhases, boundaryTime, boundaries[index + 1]!),
        );
      }
    }

    return this.buildAnimateTransformElement(
      "translate",
      { valueStrings, easePerInterval, boundaries },
      totalDuration,
    );
  };

  private buildScaleElement = (
    sortedPhases: TargetPhase[],
    totalDuration: number,
  ): SVGAnimateTransformElement => {
    const scalePhases = sortedPhases.filter(
      phase =>
        !this.isAbsent(phase.transformVars.scale) ||
        !this.isAbsent(phase.transformVars.scaleX) ||
        !this.isAbsent(phase.transformVars.scaleY),
    );

    const boundaries = SMILTimeline.collectBoundaries(scalePhases, totalDuration);
    let currentScaleX = 1;
    let currentScaleY = 1;
    const valueStrings: string[] = [];
    const easePerInterval: (TweenVars["ease"] | null)[] = [];

    for (let index = 0; index < boundaries.length; index++) {
      const boundaryTime: number = boundaries[index]!;

      for (const phase of scalePhases) {
        const phaseEnd: number = phase.effectiveStart + phase.tweenDurationSeconds;
        if (Math.abs(phaseEnd - boundaryTime) < 0.00001) {
          if (!this.isAbsent(phase.transformVars.scale)) {
            currentScaleX = Number(phase.transformVars.scale);
            currentScaleY = Number(phase.transformVars.scale);
          }
          if (!this.isAbsent(phase.transformVars.scaleX)) currentScaleX = Number(phase.transformVars.scaleX);
          if (!this.isAbsent(phase.transformVars.scaleY)) currentScaleY = Number(phase.transformVars.scaleY);
        }
      }

      valueStrings.push(`${currentScaleX} ${currentScaleY}`);

      if (index < boundaries.length - 1) {
        easePerInterval.push(
          SMILTimeline.findActiveEase(scalePhases, boundaryTime, boundaries[index + 1]!),
        );
      }
    }

    return this.buildAnimateTransformElement(
      "scale",
      { valueStrings, easePerInterval, boundaries },
      totalDuration,
    );
  };

  private buildRotateElement = (
    sortedPhases: TargetPhase[],
    totalDuration: number,
    pivotCenterX: number,
    pivotCenterY: number,
  ): SVGAnimateTransformElement => {
    const rotatePhases = sortedPhases.filter(
      phase => !this.isAbsent(phase.transformVars.rotation),
    );

    const boundaries = SMILTimeline.collectBoundaries(rotatePhases, totalDuration);
    let currentRotation = 0;
    const valueStrings: string[] = [];
    const easePerInterval: (TweenVars["ease"] | null)[] = [];

    for (let index = 0; index < boundaries.length; index++) {
      const boundaryTime: number = boundaries[index]!;

      for (const phase of rotatePhases) {
        const phaseEnd: number = phase.effectiveStart + phase.tweenDurationSeconds;
        if (Math.abs(phaseEnd - boundaryTime) < 0.00001) {
          currentRotation = Number(phase.transformVars.rotation);
        }
      }

      valueStrings.push(`${currentRotation} ${pivotCenterX} ${pivotCenterY}`);

      if (index < boundaries.length - 1) {
        easePerInterval.push(
          SMILTimeline.findActiveEase(rotatePhases, boundaryTime, boundaries[index + 1]!),
        );
      }
    }

    return this.buildAnimateTransformElement(
      "rotate",
      { valueStrings, easePerInterval, boundaries },
      totalDuration,
    );
  };

  private buildSkewXElement = (
    sortedPhases: TargetPhase[],
    totalDuration: number,
  ): SVGAnimateTransformElement => {
    const skewXPhases = sortedPhases.filter(
      phase => !this.isAbsent(phase.transformVars.skewX),
    );

    const boundaries = SMILTimeline.collectBoundaries(skewXPhases, totalDuration);
    let currentSkewX = 0;
    const valueStrings: string[] = [];
    const easePerInterval: (TweenVars["ease"] | null)[] = [];

    for (let index = 0; index < boundaries.length; index++) {
      const boundaryTime: number = boundaries[index]!;

      for (const phase of skewXPhases) {
        const phaseEnd: number = phase.effectiveStart + phase.tweenDurationSeconds;
        if (Math.abs(phaseEnd - boundaryTime) < 0.00001) {
          currentSkewX = Number(phase.transformVars.skewX);
        }
      }

      valueStrings.push(String(currentSkewX));

      if (index < boundaries.length - 1) {
        easePerInterval.push(
          SMILTimeline.findActiveEase(skewXPhases, boundaryTime, boundaries[index + 1]!),
        );
      }
    }

    return this.buildAnimateTransformElement(
      "skewX",
      { valueStrings, easePerInterval, boundaries },
      totalDuration,
    );
  };

  private buildSkewYElement = (
    sortedPhases: TargetPhase[],
    totalDuration: number,
  ): SVGAnimateTransformElement => {
    const skewYPhases = sortedPhases.filter(
      phase => !this.isAbsent(phase.transformVars.skewY),
    );

    const boundaries = SMILTimeline.collectBoundaries(skewYPhases, totalDuration);
    let currentSkewY = 0;
    const valueStrings: string[] = [];
    const easePerInterval: (TweenVars["ease"] | null)[] = [];

    for (let index = 0; index < boundaries.length; index++) {
      const boundaryTime: number = boundaries[index]!;

      for (const phase of skewYPhases) {
        const phaseEnd: number = phase.effectiveStart + phase.tweenDurationSeconds;
        if (Math.abs(phaseEnd - boundaryTime) < 0.00001) {
          currentSkewY = Number(phase.transformVars.skewY);
        }
      }

      valueStrings.push(String(currentSkewY));

      if (index < boundaries.length - 1) {
        easePerInterval.push(
          SMILTimeline.findActiveEase(skewYPhases, boundaryTime, boundaries[index + 1]!),
        );
      }
    }

    return this.buildAnimateTransformElement(
      "skewY",
      { valueStrings, easePerInterval, boundaries },
      totalDuration,
    );
  };

  private buildAnimateTransformElement = (
    type: "translate" | "scale" | "rotate" | "skewX" | "skewY",
    keyframeSequence: KeyframeSequence,
    totalDuration: number,
  ): SVGAnimateTransformElement => {
    const { valueStrings, easePerInterval, boundaries } = keyframeSequence;

    const element = document.createElementNS(
      SMILBuilder.SVG_NS,
      "animateTransform",
    ) as SVGAnimateTransformElement;

    element.setAttribute("attributeName", "transform");
    element.setAttribute("attributeType", "XML");
    element.setAttribute("type", type);
    element.setAttribute("additive", "sum");
    element.setAttribute("fill", "freeze");
    element.setAttribute("dur", `${totalDuration}s`);
    element.setAttribute("values", valueStrings.join(";"));

    const keyTimesString: string = boundaries
      .map(boundaryTime =>
        parseFloat((boundaryTime / totalDuration).toFixed(6)).toString(),
      )
      .join(";");
    element.setAttribute("keyTimes", keyTimesString);

    const hasSplineInterval: boolean = easePerInterval.some(ease => {
      if (this.isAbsent(ease)) return false;
      return Easing.resolveCalcMode(ease!) === "spline";
    });

    if (hasSplineInterval) {
      element.setAttribute("calcMode", "spline");
      const holdSpline = "0 0 1 1";
      const keySplinesString: string = easePerInterval
        .map(ease => {
          if (this.isAbsent(ease)) return holdSpline;
          const bezier = Easing.resolveEase(ease!);
          return bezier ? bezier.join(" ") : holdSpline;
        })
        .join(";");
      element.setAttribute("keySplines", keySplinesString);
    } else {
      element.setAttribute("calcMode", "linear");
    }

    return element;
  };

  // ===== Static Helpers =====

  private static collectBoundaries = (
    phases: TargetPhase[],
    totalDuration: number,
  ): number[] => {
    const boundarySet = new Set<number>([0, totalDuration]);
    for (const phase of phases) {
      boundarySet.add(phase.effectiveStart);
      boundarySet.add(phase.effectiveStart + phase.tweenDurationSeconds);
    }
    return Array.from(boundarySet).sort((a, b) => a - b);
  };

  private static findActiveEase = (
    phases: TargetPhase[],
    intervalStart: number,
    intervalEnd: number,
  ): TweenVars["ease"] | null => {
    const activePhase = phases.find(
      phase =>
        phase.effectiveStart <= intervalStart + 0.00001 &&
        phase.effectiveStart + phase.tweenDurationSeconds >= intervalEnd - 0.00001,
    );
    return activePhase?.ease ?? null;
  };

  private static computeStepDuration = (
    tweenDurationSeconds: number,
    stagger: TweenVars["stagger"] | undefined,
    targetCount: number,
  ): number => {
    if (!stagger || targetCount <= 1) return tweenDurationSeconds;
    const staggerDelays = StaggerResolver.resolveDelays(targetCount, stagger);
    const maxStaggerDelay: number = Math.max(...staggerDelays, 0);
    return maxStaggerDelay + tweenDurationSeconds;
  };

  private static stripTransformKeys = (vars: TweenVars): TweenVars => {
    const result: TweenVars = {};
    for (const [key, value] of Object.entries(vars)) {
      if (!TRANSFORM_KEY_SET.has(key)) {
        (result as Record<string, unknown>)[key] = value;
      }
    }
    return result;
  };

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
}
