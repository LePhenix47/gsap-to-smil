import { Animation } from "./Animation.ts";
import { SMILTween } from "./SMILTween.ts";
import type {
  TweenVars,
  TweenTarget,
  TimelineVars,
  PositionParam,
} from "@/types/index.ts";
import { TriggerResolver } from "@/utils/trigger-resolver.ts";

type ChildEntry = {
  tween: SMILTween;
  absoluteStart: number;
};

/**
 * A GSAP-style timeline that creates and coordinates multiple {@link SMILTween} instances.
 *
 * Each `.to()` creates a tween and injects SMIL elements into the DOM immediately.
 * The timeline then rewrites each tween's `begin=` attributes so all children play
 * at the correct absolute time, optionally offset from a shared trigger event.
 *
 * Sequential same-(element, attributeName) chains are automatically wired: the second
 * `<animate>` gets an explicit `from=` equal to the first's `to=` so SMIL does not
 * jump back to the element's static base value mid-sequence.
 */
export class SMILTimeline extends Animation {
  _children: ChildEntry[] = [];
  _defaults: Partial<TweenVars>;
  _labels: Record<string, number> = {};

  private timelineTrigger: string | null = null;
  private lastChildStart: number = 0;
  private lastChildEnd: number = 0;

  constructor(timelineVars?: TimelineVars) {
    super(timelineVars ?? {});
    this.durationSeconds = 0;
    this.totalDurationSeconds = 0;
    this._defaults = timelineVars?.defaults ?? {};
  }

  // ===== Public API =====

  to = (targetParam: TweenTarget, toVars: TweenVars, position?: PositionParam): this => {
    const mergedVars: TweenVars = { ...this._defaults, ...toVars, delay: 0 };
    const { trigger } = mergedVars;

    if (trigger && !this.timelineTrigger) {
      const targets = SMILTimeline.resolveTargets(targetParam);
      if (targets.length > 0) {
        this.timelineTrigger = TriggerResolver.resolve(targets[0], trigger);
      }
    }

    const absoluteStart = this.resolvePosition(position);
    const tween = new SMILTween(targetParam, mergedVars);
    const childEnd = absoluteStart + tween.durationSeconds;

    const entry: ChildEntry = { tween, absoluteStart };
    this._children.push(entry);

    this.wireSequentialChains(entry);
    this.rewriteBegin(entry);

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
    const absoluteStart = position;
    const childEnd = absoluteStart + tween.durationSeconds;
    const entry: ChildEntry = { tween, absoluteStart };

    this._children.push(entry);
    this.wireSequentialChains(entry);
    this.rewriteBegin(entry);

    if (childEnd > this.durationSeconds) {
      this.durationSeconds = childEnd;
      this.totalDurationSeconds = childEnd;
    }

    this.lastChildStart = absoluteStart;
    this.lastChildEnd = childEnd;

    return this;
  };

  addLabel = (name: string): this => {
    this._labels[name] = this.durationSeconds;
    return this;
  };

  removeLabel = (name: string): this => {
    delete this._labels[name];
    return this;
  };

  getChildren = (): SMILTween[] => this._children.map(entry => entry.tween);

  clear = (): this => {
    for (const entry of this._children) {
      entry.tween.kill();
    }
    this._children = [];
    this.durationSeconds = 0;
    this.totalDurationSeconds = 0;
    this.lastChildStart = 0;
    this.lastChildEnd = 0;
    this.hasBuilt = false;
    return this;
  };

  kill = (): this => {
    for (const entry of this._children) {
      entry.tween.kill();
    }
    this._children = [];
    return this;
  };

  revert = (): this => {
    for (const entry of this._children) {
      entry.tween.revert();
    }
    this._children = [];
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
      const labelTime = this._labels[plusMatch[1]!] ?? 0;
      return Math.max(0, labelTime + parseFloat(plusMatch[2]!));
    }

    const minusMatch = /^(.+)-=(\d+\.?\d*)$/.exec(position);
    if (minusMatch) {
      const labelTime = this._labels[minusMatch[1]!] ?? 0;
      return Math.max(0, labelTime - parseFloat(minusMatch[2]!));
    }

    return this._labels[position] ?? 0;
  };

  // ===== Begin Rewriting =====

  private rewriteBegin = (entry: ChildEntry): void => {
    const { tween, absoluteStart } = entry;
    const effectiveBegin = absoluteStart + this.delaySeconds;

    for (const animationElement of tween.animationElements) {
      if (this.timelineTrigger) {
        if (effectiveBegin === 0) {
          animationElement.setAttribute("begin", this.timelineTrigger);
        } else {
          animationElement.setAttribute("begin", `${this.timelineTrigger} + ${effectiveBegin}s`);
        }
      } else if (effectiveBegin === 0) {
        animationElement.removeAttribute("begin");
      } else {
        animationElement.setAttribute("begin", `${effectiveBegin}s`);
      }
    }
  };

  // ===== Sequential Chain Wiring =====

  /**
   * When two entries animate the same (element, attributeName) sequentially,
   * SMIL's second `<animate>` would otherwise read the element's static DOM value
   * instead of the previous animation's frozen value. Setting explicit `from=` on
   * the second element fixes this.
   */
  private wireSequentialChains = (newEntry: ChildEntry): void => {
    for (const newAnimElement of newEntry.tween.animationElements) {
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
    for (let index = this._children.length - 2; index >= 0; index--) {
      const previousEntry = this._children[index]!;
      for (const previousAnimElement of previousEntry.tween.animationElements) {
        if (previousAnimElement.parentElement !== targetElement) continue;
        if (previousAnimElement.getAttribute("attributeName") !== attributeName) continue;
        return previousAnimElement.getAttribute("to");
      }
    }
    return null;
  };

  // ===== Target Resolution =====

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
