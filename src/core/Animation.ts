import type { TweenVars } from "@/types/index.ts";

let _idCounter = 0;

/**
 * Base class for `SMILTween` and `SMILTimeline`.
 * Owns all timing state and exposes the fluent getter/setter API that mirrors GSAP's `Animation`.
 *
 * Concrete subclasses must implement `kill()` and `revert()`.
 */
export abstract class Animation {
  readonly id: string;

  _delay: number;
  _repeat: number;
  _rDelay: number;
  _yoyo: boolean;
  _ts: number;
  _dur: number;
  _tDur: number;
  _start: number;
  _paused: boolean;
  _reversed: boolean;
  _initialized: boolean;

  data: unknown;
  /** Will be typed as `SMILTimeline | null` once that class is written. */
  parent: Animation | null;

  private _calcTotalDuration = (): number => {
    if (this._repeat === -1) return Infinity;
    const playCount = this._repeat + 1;
    const gapTime = this._rDelay * this._repeat;
    return this._dur * playCount + gapTime;
  };

  constructor(vars: TweenVars) {
    this.id = vars.id ?? `smil-${++_idCounter}`;
    this._delay = vars.delay ?? 0;
    this._repeat = vars.repeat ?? 0;
    this._rDelay = vars.repeatDelay ?? 0;
    this._yoyo = vars.yoyo ?? false;
    this._ts = 1;
    this._dur = vars.duration ?? 0.5;
    this._start = 0;
    this._paused = vars.paused ?? false;
    this._reversed = vars.reversed ?? false;
    this._initialized = false;
    this.data = vars.data ?? null;
    this.parent = null;
    this._tDur = this._calcTotalDuration();
  }

  // ===== Fluent getters / setters =====
  // Each method returns the current value when called with no argument,
  // or `this` (for chaining) when called with a value.

  /** Gets or sets the animation duration in seconds. */
  duration = (value?: number): number | this => {
    if (value === undefined) return this._dur;
    this._dur = value;
    this._tDur = this._calcTotalDuration();
    return this;
  };

  /**
   * Gets or sets the total duration including all repeats and repeat delays.
   * Setting this adjusts `_dur` proportionally.
   */
  totalDuration = (value?: number): number | this => {
    if (value === undefined) return this._tDur;
    if (this._repeat > 0) {
      const plays = this._repeat + 1;
      const gapTime = this._rDelay * this._repeat;
      this._dur = (value - gapTime) / plays;
    } else {
      this._dur = value;
    }
    this._tDur = value;
    return this;
  };

  /** Gets or sets the delay in seconds before the animation starts. */
  delay = (value?: number): number | this => {
    if (value === undefined) return this._delay;
    this._delay = value;
    return this;
  };

  /** Gets or sets the repeat count. `-1` = infinite. */
  repeat = (value?: number): number | this => {
    if (value === undefined) return this._repeat;
    this._repeat = value;
    this._tDur = this._calcTotalDuration();
    return this;
  };

  /** Gets or sets the delay between repeats in seconds. */
  repeatDelay = (value?: number): number | this => {
    if (value === undefined) return this._rDelay;
    this._rDelay = value;
    this._tDur = this._calcTotalDuration();
    return this;
  };

  /** Gets or sets yoyo (ping-pong) mode. */
  yoyo = (value?: boolean): boolean | this => {
    if (value === undefined) return this._yoyo;
    this._yoyo = value;
    return this;
  };

  /** Gets or sets the time scale (playback speed multiplier). */
  timeScale = (value?: number): number | this => {
    if (value === undefined) return this._ts;
    this._ts = value;
    return this;
  };

  /** Gets or sets the paused state. */
  paused = (value?: boolean): boolean | this => {
    if (value === undefined) return this._paused;
    this._paused = value;
    return this;
  };

  /** Gets or sets the reversed state. */
  reversed = (value?: boolean): boolean | this => {
    if (value === undefined) return this._reversed;
    this._reversed = value;
    return this;
  };

  // ===== State queries =====

  /** Returns `true` if the animation has been initialized and is not paused. */
  isActive = (): boolean => this._initialized && !this._paused;

  /** Marks the animation as uninitialized so it will re-render on next play. */
  invalidate = (): this => {
    this._initialized = false;
    return this;
  };

  // ===== Promise interface =====

  /**
   * Returns a Promise that resolves when the animation completes.
   * Timeout-based — does not account for seek, pause, or timeScale changes.
   */
  then = (onFulfilled?: (value: this) => void): Promise<this> => {
    const totalMs =
      (this._tDur === Infinity ? 0 : this._tDur + this._delay) * 1000;
    return new Promise((resolve) => {
      setTimeout(() => {
        onFulfilled?.(this);
        resolve(this);
      }, totalMs);
    });
  };

  // ===== Abstract — implemented by subclasses =====

  abstract kill(): this;
  abstract revert(): this;
}
