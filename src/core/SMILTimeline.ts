import { Animation } from "./Animation.ts";
import type {
  TweenTarget,
  TweenVars,
  TimelineVars,
  PositionParam,
} from "@/types/index.ts";
import { SMILTween } from "./SMILTween.ts";

type ChildEntry = { tween: SMILTween; absoluteStart: number };

/**
 * A sequence of SMILTweens with declaratively resolved timing.
 *
 * When a child is added, its SMIL elements' `begin=` attributes are rewritten to
 * `timeline._delay + absoluteStart + element_local_begin` so the browser's SMIL
 * engine drives everything with no per-frame loop.
 */
export class SMILTimeline extends Animation {
  _children: ChildEntry[] = [];
  _labels: Record<string, number> = {};
  _defaults: Partial<TweenVars>;

  /** Start time of the most recently added child (for `<` position param). */
  private _prevStart: number = 0;
  /** End time of the most recently added child, excluding its delay (for `>` position param). */
  private _prevEnd: number = 0;

  constructor(vars: TimelineVars = {}) {
    super(vars);
    this._defaults = vars.defaults ?? {};
    // An empty timeline has no content yet — override Animation's default 0.5s
    this._dur = 0;
    this._tDur = 0;
  }

  // ===== Internal helpers =====

  private _setContentDur(dur: number): void {
    this._dur = dur;
    this._tDur =
      this._repeat === -1
        ? Infinity
        : dur * (this._repeat + 1) + this._rDelay * this._repeat;
  }

  /**
   * Resolves a GSAP position param to an absolute time in seconds from the timeline start.
   *
   * Supported forms:
   *   undefined / ">"   → after previous child ends (sequential default)
   *   number            → absolute time
   *   "<"               → same start as previous child
   *   "<N"              → N seconds after previous child's start
   *   ">N"              → N seconds after previous child's end (e.g. ">-0.5" = overlap by 0.5s)
   *   "+=N"             → N seconds after the timeline's current end
   *   "-=N"             → N seconds before the timeline's current end
   *   "label"           → at a named label
   *   "label+=N"        → N seconds after a label
   *   "label-=N"        → N seconds before a label
   */
  private _resolvePosition = (position?: PositionParam): number => {
    if (position === undefined || position === ">") return this._prevEnd;
    if (typeof position === "number") return Math.max(0, position);

    const str = String(position);

    if (str in this._labels) return this._labels[str];
    if (str === "<") return this._prevStart;

    if (str.startsWith("<") && str.length > 1)
      return Math.max(0, this._prevStart + parseFloat(str.slice(1)));

    if (str.startsWith(">") && str.length > 1)
      return Math.max(0, this._prevEnd + parseFloat(str.slice(1)));

    if (str.startsWith("+=")) return this._dur + parseFloat(str.slice(2));

    if (str.startsWith("-="))
      return Math.max(0, this._dur - parseFloat(str.slice(2)));

    // "label+=N" or "label-=N"
    const labelMatch = str.match(/^(.+?)([+\-]=)(\d+\.?\d*)$/);
    if (labelMatch) {
      const labelTime = this._labels[labelMatch[1]] ?? 0;
      const offset = parseFloat(labelMatch[3]);
      return labelMatch[2] === "+="
        ? labelTime + offset
        : Math.max(0, labelTime - offset);
    }

    return this._prevEnd;
  };

  /**
   * Rewrites every SMIL element's `begin=` to its absolute document time:
   * `timeline._delay + absoluteStart + element_local_begin`.
   * The element's local begin already includes the child tween's own delay and stagger offset.
   */
  private _rewriteBegin = (tween: SMILTween, absoluteStart: number): void => {
    for (const el of tween._elements) {
      const current = el.getAttribute("begin");
      const localSec = current ? parseFloat(current) : 0;
      const newBegin = this._delay + absoluteStart + localSec;

      if (newBegin === 0) {
        el.removeAttribute("begin");
      } else {
        el.setAttribute("begin", `${newBegin}s`);
      }
    }
  };

  private _addChild = (tween: SMILTween, absoluteStart: number): void => {
    this._rewriteBegin(tween, absoluteStart);
    this._children.push({ tween, absoluteStart });

    this._prevStart = absoluteStart;
    // Sequential end excludes child delay (matches GSAP's position model)
    const sequentialEnd =
      absoluteStart + (tween._tDur === Infinity ? tween._dur : tween._tDur);
    this._prevEnd = sequentialEnd;

    // Content boundary includes child delay so the timeline's _dur reflects actual span
    const contentEnd = absoluteStart + tween._delay + (tween._tDur === Infinity ? tween._dur : tween._tDur);
    if (contentEnd > this._dur) this._setContentDur(contentEnd);

    this._initialized = true;
  };

  // ===== Child insertion =====

  to = (targets: TweenTarget, vars: TweenVars, position?: PositionParam): this => {
    const absoluteStart = this._resolvePosition(position);
    const tween = new SMILTween(targets, { ...this._defaults, ...vars });
    this._addChild(tween, absoluteStart);
    return this;
  };

  from = (targets: TweenTarget, vars: TweenVars, position?: PositionParam): this => {
    const absoluteStart = this._resolvePosition(position);
    const tween = new SMILTween(targets, { ...this._defaults, ...vars }, null, true);
    this._addChild(tween, absoluteStart);
    return this;
  };

  fromTo = (
    targets: TweenTarget,
    fromVars: TweenVars,
    toVars: TweenVars,
    position?: PositionParam,
  ): this => {
    const absoluteStart = this._resolvePosition(position);
    const tween = new SMILTween(targets, { ...this._defaults, ...toVars }, fromVars);
    this._addChild(tween, absoluteStart);
    return this;
  };

  set = (targets: TweenTarget, vars: TweenVars, position?: PositionParam): this =>
    this.to(targets, { ...vars, duration: 0, ease: "none" }, position);

  add = (child: SMILTween, position?: PositionParam): this => {
    const absoluteStart = this._resolvePosition(position);
    this._addChild(child, absoluteStart);
    return this;
  };

  addLabel = (label: string, position?: PositionParam): this => {
    this._labels[label] = this._resolvePosition(position);
    return this;
  };

  removeLabel = (label: string): this => {
    delete this._labels[label];
    return this;
  };

  getChildren = (): SMILTween[] => this._children.map((c) => c.tween);

  clear = (): this => {
    for (const { tween } of this._children) tween.kill();
    this._children = [];
    this._labels = {};
    this._prevStart = 0;
    this._prevEnd = 0;
    this._setContentDur(0);
    this._initialized = false;
    return this;
  };

  // ===== Playback =====

  play = (): this => {
    this._paused = false;
    for (const { tween } of this._children) tween.play();
    return this;
  };

  pause = (): this => {
    this._paused = true;
    // SMIL pause is document-wide — delegate to the SVG element
    const firstEl = this._children[0]?.tween._elements[0];
    firstEl?.ownerSVGElement?.pauseAnimations();
    return this;
  };

  resume = (): this => {
    this._paused = false;
    const firstEl = this._children[0]?.tween._elements[0];
    firstEl?.ownerSVGElement?.unpauseAnimations();
    return this;
  };

  // ===== Cleanup =====

  kill = (): this => {
    for (const { tween } of this._children) tween.kill();
    this._children = [];
    this._initialized = false;
    return this;
  };

  revert = (): this => {
    for (const { tween } of this._children) tween.revert();
    this._children = [];
    this._initialized = false;
    return this;
  };
}
