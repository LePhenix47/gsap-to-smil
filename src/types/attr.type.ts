/**
 * SVG presentation attributes you can animate directly via the `attr: {}` bucket in `TweenVars`.
 *
 * Maps 1:1 to SMIL `<animate attributeName="...">`.
 * Use this instead of top-level keys when you want to animate the actual SVG attribute
 * rather than a CSS transform — e.g. `attr: { cx: 50 }` moves a circle's center point,
 * while top-level `x: 50` would produce a `<animateTransform type="translate">`.
 */
export type AttrVars = {
  x?: number | string;
  y?: number | string;
  cx?: number | string;
  cy?: number | string;
  r?: number | string;
  rx?: number | string;
  ry?: number | string;
  x1?: number | string;
  y1?: number | string;
  x2?: number | string;
  y2?: number | string;
  width?: number | string;
  height?: number | string;
  fill?: string;
  stroke?: string;
  opacity?: number | string;
  fillOpacity?: number | string;
  strokeOpacity?: number | string;
  strokeWidth?: number | string;
  strokeDashoffset?: number | string;
  strokeDasharray?: string;
  points?: string;
  d?: string;
  viewBox?: string;
  stdDeviation?: number | string;
  offset?: number | string;
  [key: string]: number | string | undefined;
};
