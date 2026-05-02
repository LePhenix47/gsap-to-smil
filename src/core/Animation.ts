import type { TweenVars } from "@/types/index.ts";

/** Monotonically incrementing counter for auto-generated animation IDs (`smil-1`, `smil-2`, …). */
let animationIdCounter = 0;

/**
 * Abstract base class for {@link SMILTween} and {@link SMILTimeline}.
 *
 * Mirrors GSAP's `Animation` class. Owns all timing state and exposes the fluent
 * getter/setter API (`duration()`, `delay()`, `repeat()`, …). Each getter/setter
 * returns the current value when called with no argument, or `this` for chaining
 * when called with a value.
 *
 * Subclasses must implement {@link kill} and {@link revert}.
 */
export abstract class Animation {
  /** Unique identifier. Auto-generated as `"smil-N"` unless passed via `vars.id`. */
  readonly id: string;

  /**
   * Arbitrary user data attached to this animation instance.
   *
   * Mirrors GSAP's `Animation.data` — a free key for storing any value on an
   * animation. Populated from `vars.data` (defaults to `null`). Type is `unknown`
   * to force type-checking at the access site; consumers must narrow before use.
   */
  data: unknown;

  /**
   * Reference to the parent timeline, or `null` if this animation is standalone
   * or was added directly via `smil.to()` / `smil.from()` / `smil.fromTo()`.
   */
  parent: Animation | null = null;

  /** Start delay in seconds before the first play. Mirrors GSAP's `delay`. */
  delaySeconds: number;

  /** Duration of a single play in seconds. Does not include repeats. */
  durationSeconds: number;

  /** Total duration including all repeats and repeat delays. `Infinity` when `repeatCount === -1`. */
  totalDurationSeconds: number;

  /** Number of repeats. `-1` = infinite. Mirrors GSAP's `repeat` (0-based: `repeat: 3` → 4 total plays). */
  repeatCount: number;

  /** Delay in seconds between each repeat cycle. Mirrors GSAP's `repeatDelay`. */
  repeatDelaySeconds: number;

  /** Whether yoyo (ping-pong) mode is enabled. Each repeat alternates direction. */
  yoyoEnabled: boolean;

  /** Whether the animation is currently paused. */
  pausedState: boolean;

  /** Whether the animation plays in reverse. */
  reversedState: boolean;

  /** `true` once elements have been built (tween) or children injected (timeline). */
  hasBuilt: boolean;

  constructor(vars: TweenVars) {
    const {
      id,
      delay = 0,
      duration = 0.5,
      repeat = 0,
      repeatDelay = 0,
      yoyo = false,
      paused = false,
      reversed = false,
      data = null,
    } = vars;

    this.id = id ?? `smil-${++animationIdCounter}`;
    this.delaySeconds = delay;
    this.durationSeconds = duration;
    this.repeatCount = repeat;
    this.repeatDelaySeconds = repeatDelay;
    this.yoyoEnabled = yoyo;
    this.pausedState = paused;
    this.reversedState = reversed;
    this.hasBuilt = false;
    this.data = data;

    this.totalDurationSeconds = this.computeTotalDuration();
  }

  // ===== Fluent getters / setters =====

  /**
   * Gets or sets the per-play duration in seconds.
   *
   * Calling with no argument returns the current value. Calling with a value
   * updates `durationSeconds` and recomputes `totalDurationSeconds`, then
   * returns `this` for chaining.
   */
  duration = (value?: number): number | this => {
    if (this.isAbsent(value)) return this.durationSeconds;
    this.durationSeconds = value;
    this.totalDurationSeconds = this.computeTotalDuration();
    return this;
  };

  /**
   * Gets or sets the total duration including all repeats and repeat delays.
   *
   * Setting this back-calculates `durationSeconds` from the new total. If
   * `repeatCount > 0`, the gap time is subtracted first, then the remainder
   * is divided equally across all plays.
   */
  totalDuration = (value?: number): number | this => {
    if (this.isAbsent(value)) return this.totalDurationSeconds;

    if (this.repeatCount > 0) {
      const totalPlayCount: number = this.repeatCount + 1;
      const totalGapTimeSeconds: number =
        this.repeatDelaySeconds * this.repeatCount;
      this.durationSeconds = (value - totalGapTimeSeconds) / totalPlayCount;
    } else {
      this.durationSeconds = value;
    }

    this.totalDurationSeconds = value;
    return this;
  };

  /** Gets or sets the delay in seconds before the animation starts. */
  delay = (value?: number): number | this => {
    if (this.isAbsent(value)) return this.delaySeconds;
    this.delaySeconds = value;
    return this;
  };

  /**
   * Gets or sets the repeat count. `-1` = infinite. `0` = play once.
   *
   * Changing this recomputes `totalDurationSeconds`.
   */
  repeat = (value?: number): number | this => {
    if (this.isAbsent(value)) return this.repeatCount;
    this.repeatCount = value;
    this.totalDurationSeconds = this.computeTotalDuration();
    return this;
  };

  /** Gets or sets the delay in seconds between each repeat cycle. */
  repeatDelay = (value?: number): number | this => {
    if (this.isAbsent(value)) return this.repeatDelaySeconds;
    this.repeatDelaySeconds = value;
    this.totalDurationSeconds = this.computeTotalDuration();
    return this;
  };

  /** Gets or sets yoyo (ping-pong) mode. When `true`, each repeat alternates direction. */
  yoyo = (value?: boolean): boolean | this => {
    if (this.isAbsent(value)) return this.yoyoEnabled;
    this.yoyoEnabled = value;
    return this;
  };

  /** Gets or sets the paused state. */
  paused = (value?: boolean): boolean | this => {
    if (this.isAbsent(value)) return this.pausedState;
    this.pausedState = value;
    return this;
  };

  /** Gets or sets the reversed state. When `true`, the animation plays backward. */
  reversed = (value?: boolean): boolean | this => {
    if (this.isAbsent(value)) return this.reversedState;
    this.reversedState = value;
    return this;
  };

  // ===== State queries =====

  /** Returns `true` if the animation has been built and is not paused. */
  isActive = (): boolean => this.hasBuilt && !this.pausedState;

  /**
   * Marks the animation as unbuilt. The next call to a subclass method that
   * builds or injects elements will rebuild from scratch.
   */
  invalidate = (): this => {
    this.hasBuilt = false;
    return this;
  };

  // ===== Helpers =====

  /**
   * Type guard: returns `true` when `value` is `null` or `undefined`.
   *
   * Used by all fluent getter/setters to distinguish "caller passed no argument"
   * (return current value) from "caller passed `0`, `false`, or `""`" (set to
   * that value). Checking `typeof` avoids the `== null` shorthand and catches
   * both `null` (`typeof null === "object"`) and `undefined`.
   */
  protected isAbsent = (value: unknown): value is undefined | null =>
    !value && ["undefined", "object"].includes(typeof value);

  /**
   * Computes the absolute total duration including all repeats and repeat delays.
   *
   * `totalDurationSeconds = durationSeconds × (repeatCount + 1) + repeatDelaySeconds × repeatCount`
   *
   * When `repeatCount === -1` (infinite), returns `Infinity`.
   */
  private computeTotalDuration = (): number => {
    if (this.repeatCount === -1) return Infinity;

    const totalPlayDurationSeconds: number =
      this.durationSeconds * (this.repeatCount + 1);
    const totalGapSeconds: number = this.repeatDelaySeconds * this.repeatCount;

    return totalPlayDurationSeconds + totalGapSeconds;
  };

  // ===== Abstract — implemented by subclasses =====

  /**
   * Removes all animation elements from the DOM and resets internal state.
   *
   * After calling `kill()`, the animation is permanently stopped and cannot be
   * resumed. Subclasses must remove SMIL elements, unwrap pivot scaffolds, and
   * set `hasBuilt = false`.
   */
  abstract kill(): this;

  /**
   * Kills the animation and restores the target element to its original
   * pre-animation state.
   *
   * Subclasses must call `kill()` (to clean up DOM elements), then restore
   * any captured original attribute values (transform, opacity, fill, etc.).
   */
  abstract revert(): this;
}
