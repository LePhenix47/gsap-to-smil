import type { TweenVars } from "@/types/index.ts";

// TODO: Fix this, this ain't right we should have a proper way to generate unique ids
let animationIdCounter = 0;

export abstract class Animation {
  readonly id: string;
  data: unknown;
  parent: Animation | null = null;

  delaySeconds: number;
  durationSeconds: number;
  totalDurationSeconds: number;
  repeatCount: number;
  repeatDelaySeconds: number;
  yoyoEnabled: boolean;
  pausedState: boolean;
  reversedState: boolean;
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
      data = null, // ! WTF's the "data" ? What's its type ??
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

  duration = (value?: number): number | this => {
    if (this.isAbsent(value)) return this.durationSeconds;
    this.durationSeconds = value;
    this.totalDurationSeconds = this.computeTotalDuration();
    return this;
  };

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

  delay = (value?: number): number | this => {
    if (this.isAbsent(value)) return this.delaySeconds;
    this.delaySeconds = value;
    return this;
  };

  repeat = (value?: number): number | this => {
    if (this.isAbsent(value)) return this.repeatCount;
    this.repeatCount = value;
    this.totalDurationSeconds = this.computeTotalDuration();
    return this;
  };

  repeatDelay = (value?: number): number | this => {
    if (this.isAbsent(value)) return this.repeatDelaySeconds;
    this.repeatDelaySeconds = value;
    this.totalDurationSeconds = this.computeTotalDuration();
    return this;
  };

  yoyo = (value?: boolean): boolean | this => {
    if (this.isAbsent(value)) return this.yoyoEnabled;
    this.yoyoEnabled = value;
    return this;
  };

  paused = (value?: boolean): boolean | this => {
    if (this.isAbsent(value)) return this.pausedState;
    this.pausedState = value;
    return this;
  };

  reversed = (value?: boolean): boolean | this => {
    if (this.isAbsent(value)) return this.reversedState;
    this.reversedState = value;
    return this;
  };

  // ===== State queries =====

  isActive = (): boolean => this.hasBuilt && !this.pausedState;

  invalidate = (): this => {
    this.hasBuilt = false;
    return this;
  };

  // ===== Helpers =====

  private isAbsent = (value: unknown): value is undefined | null =>
    !value && ["undefined", "object"].includes(typeof value);

  private computeTotalDuration = (): number => {
    if (this.repeatCount === -1) return Infinity;

    const totalPlayDurationSeconds: number =
      this.durationSeconds * (this.repeatCount + 1);
    const totalGapSeconds: number = this.repeatDelaySeconds * this.repeatCount;

    return totalPlayDurationSeconds + totalGapSeconds;
  };

  // ===== Abstract — implemented by subclasses =====

  abstract kill(): this;
  abstract revert(): this;
}
