import type { EaseString } from "./easing.ts";

export type AnimateOptions = {
  attributeName: string;
  from?: string;
  to?: string;
  values?: string;
  dur: number;
  delay?: number;
  repeat?: number;
  repeatDelay?: number;
  yoyo?: boolean;
  ease?: EaseString | number[];
  fill?: "freeze" | "remove";
  additive?: "sum" | "replace";
};

export type AnimateTransformOptions = Omit<AnimateOptions, "attributeName"> & {
  type: "translate" | "rotate" | "scale" | "skewX" | "skewY";
};
