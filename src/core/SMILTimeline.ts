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
  /** All child entries in insertion order, each pairing a tween with its absolute start time. */
  children: ChildEntry[] = [];

  /** Default `TweenVars` merged into every child created via `to()`. */
  defaults: Partial<TweenVars>;

  /** Named time markers. Stored as `{ name: absoluteTimeSeconds }`. */
  labels: Record<string, number> = {};

  /** Resolved SMIL `begin=` base string from the first child that carries a `trigger`. Shared by all children. */
  private timelineTrigger: string | null = null;

  /** Absolute start time of the most recently added child, used to resolve `"<"` position. */
  private lastChildStart: number = 0;

  /** Absolute end time of the most recently added child, used to resolve `">"` and sequential positions. */
  private lastChildEnd: number = 0;

  constructor(timelineVars?: TimelineVars) {
    super(timelineVars ?? {});
    this.durationSeconds = 0;
    this.totalDurationSeconds = 0;
    this.defaults = timelineVars?.defaults ?? {};
  }

  // ===== Public API =====

  /**
   * Animates `targetParam` to `toVars`, appending a new {@link SMILTween} to the timeline.
   *
   * - `defaults` are merged under `toVars` (child vars win).
   * - `delay` is always forced to `0` — the timeline owns all timing via `begin=`.
   * - The first `trigger` found in any entry becomes the shared `begin=` base for the whole timeline.
   * - Sequential entries on the same `(element, attributeName)` are automatically chained:
   *   the second `<animate>` gets an explicit `from=` equal to the first's `to=`.
   */
  to = (targetParam: TweenTarget, toVars: TweenVars, position?: PositionParam): this => {
    const mergedVars: TweenVars = { ...this.defaults, ...toVars, delay: 0 };
    const { trigger } = mergedVars;

    if (trigger && !this.timelineTrigger) {
      const targets = SMILTimeline.resolveTargets(targetParam);
      if (targets.length > 0) {
        const firstTarget = targets[0]!;
        this.timelineTrigger = TriggerResolver.resolve(firstTarget, trigger);
      }
    }

    const absoluteStart = this.resolvePosition(position);
    const tween = new SMILTween(targetParam, mergedVars);
    const childEnd = absoluteStart + tween.durationSeconds;

    const entry: ChildEntry = { tween, absoluteStart };
    this.children.push(entry);

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

  /**
   * Adds a pre-built `SMILTween` at an exact absolute `position` in seconds.
   *
   * Unlike `to()`, no `defaults` merging or trigger capture occurs — the caller owns those.
   * Prefer `to()` when constructing tweens from scratch.
   */
  add = (tween: SMILTween, position: number): this => {
    const absoluteStart = position;
    const childEnd = absoluteStart + tween.durationSeconds;
    const entry: ChildEntry = { tween, absoluteStart };

    this.children.push(entry);
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

  /**
   * Marks the current timeline end (`durationSeconds`) with `name`.
   *
   * Use the label as a `position` param in subsequent `to()` calls, e.g. `"label"`,
   * `"label+=0.5"`, or `"label-=0.3"`.
   */
  addLabel = (name: string): this => {
    this.labels[name] = this.durationSeconds;
    return this;
  };

  /** Deletes `name` from `labels`. Silently no-ops if the label does not exist. */
  removeLabel = (name: string): this => {
    delete this.labels[name];
    return this;
  };

  /**
   * Returns the flat `SMILTween` array without position metadata.
   *
   * Read-only view — mutating the returned array has no effect on the timeline.
   */
  getChildren = (): SMILTween[] => this.children.map(entry => entry.tween);

  /**
   * Kills all child tweens (removes injected SMIL elements) and resets all timing state.
   *
   * Equivalent to a fresh timeline. Use `kill()` when you only want to remove DOM elements
   * without resetting `durationSeconds` or `hasBuilt`.
   */
  clear = (): this => {
    for (const entry of this.children) {
      entry.tween.kill();
    }
    this.children = [];
    this.durationSeconds = 0;
    this.totalDurationSeconds = 0;
    this.lastChildStart = 0;
    this.lastChildEnd = 0;
    this.hasBuilt = false;
    return this;
  };

  /**
   * Removes all injected SMIL elements from the DOM and empties `children`.
   *
   * Does not reset `durationSeconds` or `hasBuilt`. Use `clear()` for a full state reset.
   */
  kill = (): this => {
    for (const entry of this.children) {
      entry.tween.kill();
    }
    this.children = [];
    return this;
  };

  /** Restores every target's attributes to their pre-animation values and removes injected SMIL elements. */
  revert = (): this => {
    for (const entry of this.children) {
      entry.tween.revert();
    }
    this.children = [];
    return this;
  };

  // ===== Position Resolution =====

  /**
   * Maps a raw `PositionParam` (undefined, number, or string) to an absolute time in seconds.
   *
   * Absent/undefined → sequential (appends after the last child ends).
   * Negative results are clamped to `0`.
   */
  private resolvePosition = (position: PositionParam | undefined): number => {
    if (this.isAbsent(position)) return this.lastChildEnd;
    if (typeof position === "number") return Math.max(0, position);
    return this.resolveStringPosition(position);
  };

  /**
   * Handles the full GSAP string-position syntax:
   * `">"` / `"<"`, `">±N"` / `"<±N"`, `"+=N"` / `"-=N"`, `"label"`, `"label+=N"` / `"label-=N"`.
   *
   * Unknown strings fall back to `0`.
   */
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

  // ===== Begin Rewriting =====

  /**
   * Returns the SMIL `begin=` string for `effectiveBegin` seconds, incorporating
   * `timelineTrigger` when present.
   *
   * Returns `null` when `effectiveBegin` is `0` and there is no trigger, which causes
   * the `begin=` attribute to be removed entirely (SMIL default: begin immediately).
   */
  private computeBeginValue = (effectiveBegin: number): string | null => {
    if (this.timelineTrigger && effectiveBegin === 0) return this.timelineTrigger;
    if (this.timelineTrigger) return `${this.timelineTrigger} + ${effectiveBegin}s`;
    if (effectiveBegin === 0) return null;
    return `${effectiveBegin}s`;
  };

  /**
   * Rewrites the `begin=` attribute on every `<animate>` element owned by `entry.tween`.
   *
   * Adds `delaySeconds` to `absoluteStart` before computing the SMIL begin value so the
   * timeline-level delay is honoured uniformly across all children.
   */
  private rewriteBegin = (entry: ChildEntry): void => {
    const { tween, absoluteStart } = entry;
    const effectiveBegin: number = absoluteStart + this.delaySeconds;
    const beginValue = this.computeBeginValue(effectiveBegin);

    for (const animationElement of tween.animationElements) {
      if (beginValue === null) {
        animationElement.removeAttribute("begin");
      } else {
        animationElement.setAttribute("begin", beginValue);
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
    const { tween } = newEntry;
    for (const newAnimElement of tween.animationElements) {
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

  /**
   * Scans `children` in reverse (excluding the last entry) for the most recent `<animate>`
   * on `(targetElement, attributeName)` and returns its `to=` value.
   *
   * Returns `null` when no preceding entry animates that attribute on that element.
   */
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

  // ===== Target Resolution =====

  /** Normalizes a `TweenTarget` (CSS selector, `NodeList`, `Element[]`, or single `Element`) to `Element[]`. */
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
