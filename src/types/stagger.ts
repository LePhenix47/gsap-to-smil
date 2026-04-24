import type { EaseString } from "./easing.ts";

export type StaggerFrom =
  | "start"
  | "end"
  | "center"
  | "edges"
  | "random"
  | number;

export type StaggerObject = {
  amount?: number;
  each?: number;
  from?: StaggerFrom;
  grid?: "auto" | [rows: number, cols: number];
  axis?: "x" | "y";
  ease?: EaseString;
};
