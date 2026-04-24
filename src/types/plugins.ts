/**
 * Value accepted by the `drawSVG` property.
 * - `true` / `false` — draw full stroke or erase it
 * - `"0% 50%"` — draw between two percentages of total path length
 * - `"50%"` — shorthand for `"0% 50%"`
 * - `0` — collapse to nothing (use in `smil.from()` to reveal)
 */
export type DrawSVGValue = boolean | number | string;

/**
 * Config for the `motionPath` property.
 * Maps to SMIL `<animateMotion>` with an `<mpath>` reference.
 */
export type MotionPathVars = {
  /** CSS selector or path element to move along. */
  path: string | SVGPathElement;
  /** Element or selector to align the registration point to the path. */
  align?: string | SVGPathElement;
  /** `[x, y]` anchor point on the element that tracks the path (0–1). Default: `[0.5, 0.5]`. */
  alignOrigin?: [x: number, y: number];
  /** `true` = face direction of travel. A number offsets the auto-rotation by that many degrees. */
  autoRotate?: boolean | number;
  /** 0–1 progress point on the path to start from. Default: `0`. */
  start?: number;
  /** 0–1 progress point on the path to end at. Default: `1`. */
  end?: number;
};

/**
 * Config for the `morphSVG` property.
 * Maps to SMIL `<animate attributeName="d">`.
 * Both paths must have the same number and type of commands — SMIL cannot subdivide beziers.
 */
export type MorphSVGVars = {
  /** Target shape: CSS selector, path data string, or element. */
  shape: string | SVGPathElement;
  /** How to match anchor points between the two paths. */
  shapeIndex?: number | "auto";
  /** Anchor matching strategy. */
  map?: "size" | "position" | "complexity";
  /** Interpolation type. */
  type?: "rotational" | "linear";
  /** Transform origin for rotational morphing. */
  origin?: string;
};
