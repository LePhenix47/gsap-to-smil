export type DrawSVGValue = boolean | number | string;

export type MotionPathVars = {
  path: string | SVGPathElement;
  align?: string | SVGPathElement;
  alignOrigin?: [x: number, y: number];
  autoRotate?: boolean | number;
  start?: number;
  end?: number;
};

export type MorphSVGVars = {
  shape: string | SVGPathElement;
  shapeIndex?: number | "auto";
  map?: "size" | "position" | "complexity";
  type?: "rotational" | "linear";
  origin?: string;
};
