import type { EaseString } from "./easing.ts";

/**
 * Where the stagger wave originates from across the target list.
 * A number targets a specific index.
 */
export type StaggerFrom =
  | "start"
  | "end"
  | "center"
  | "edges"
  | "random"
  | number;

/**
 * Advanced stagger config — controls how delay is distributed across multiple targets.
 *
 * Use `each` for a fixed per-target offset, or `amount` to spread a total duration
 * across all targets. `from` shifts where the wave starts.
 *
 * @example
 * smil.to(".dot", { y: -20, stagger: { each: 0.05, from: "center" } })
 */
export type StaggerObject = {
  /** Total time (seconds) distributed across all targets. Alternative to `each`. */
  amount?: number;
  /** Fixed delay (seconds) between each target. Alternative to `amount`. */
  each?: number;
  /** Where the stagger wave originates. Default: `"start"`. */
  from?: StaggerFrom;
  /** Treat targets as a 2D grid for axis-based stagger. */
  grid?: "auto" | [rows: number, cols: number];
  /** Which axis drives the stagger when `grid` is set. */
  axis?: "x" | "y";
  /** Ease applied to the stagger distribution itself, not the animation. */
  ease?: EaseString;
};
