import type {
  AnimateOptions,
  AnimateTransformOptions,
} from "@/types/builders.ts";
import type { EaseString } from "@/types/easing.ts";
import { resolveCalcMode } from "./easing.ts";

const SVG_NS: SVGElement["namespaceURI"] = "http://www.w3.org/2000/svg";

// ===== Shared helpers =====

/**
 * Resolves an ease and sets `calcMode`, `keyTimes`, and `keySplines` on the element.
 * `intervalCount` = number of keyframe intervals (keyframes - 1).
 */
const applyEasing = (
  el: SVGAnimationElement,
  ease: EaseString | number[] | undefined,
  intervalCount: number,
): void => {
  const { calcMode, keySplines, keyTimes } = resolveCalcMode(
    ease,
    intervalCount,
  );

  el.setAttribute("calcMode", calcMode);
  if (keyTimes) el.setAttribute("keyTimes", keyTimes);
  if (keySplines) el.setAttribute("keySplines", keySplines);
};

/**
 * Sets `dur`, `begin`, `repeatCount`, and `fill` on the element.
 * Handles the GSAP repeat off-by-one: `repeat: N` → `repeatCount = N + 1`.
 */
const applyTiming = (
  el: SVGAnimationElement,
  opts: Pick<AnimateOptions, "dur" | "delay" | "repeat" | "fill">,
): void => {
  el.setAttribute("dur", `${opts.dur}s`);
  el.setAttribute("fill", opts.fill ?? "freeze");

  if (opts.delay) {
    el.setAttribute("begin", `${opts.delay}s`);
  }

  if (opts.repeat !== undefined && opts?.repeat !== 0) {
    // GSAP repeat:N = N+1 total plays. SMIL repeatCount=N = N total plays.
    el.setAttribute(
      "repeatCount",
      opts.repeat === -1 ? "indefinite" : String(opts.repeat + 1),
    );
  }
};

/**
 * Sets animated values on the element — either `values` (multi-keyframe) or `from`/`to`.
 * Also wires easing based on the number of intervals derived from the value count.
 */
const applyValues = (
  el: SVGAnimationElement,
  opts: Pick<AnimateOptions, "from" | "to" | "values" | "ease">,
): void => {
  if (opts.values !== undefined) {
    el.setAttribute("values", opts.values);
    const intervalCount = opts.values.split(";").length - 1;
    applyEasing(el, opts.ease, intervalCount);
  } else {
    if (opts.from !== undefined) el.setAttribute("from", opts.from);
    if (opts.to !== undefined) el.setAttribute("to", opts.to);
    applyEasing(el, opts.ease, 1);
  }
};

// ===== buildAnimate =====

/**
 * Creates a `<animate>` element targeting a single SVG presentation attribute.
 * Handles easing, timing, repeat, and fill — caller only passes what varies.
 */
export const buildAnimate = (opts: AnimateOptions): SVGAnimateElement => {
  const el = document.createElementNS(SVG_NS, "animate") as SVGAnimateElement;

  el.setAttribute("attributeName", opts.attributeName);
  applyValues(el, opts);
  applyTiming(el, opts);

  if (opts.additive) el.setAttribute("additive", opts.additive);

  return el;
};

// ===== buildAnimateTransform =====

/**
 * Creates a `<animateTransform>` element.
 * Always sets `attributeName="transform"`, `attributeType="XML"`, and `additive="sum"`
 * so compound transforms stack correctly — callers never need to touch these.
 */
export const buildAnimateTransform = (
  opts: AnimateTransformOptions,
): SVGAnimateTransformElement => {
  const el = document.createElementNS(
    SVG_NS,
    "animateTransform",
  ) as SVGAnimateTransformElement;

  el.setAttribute("attributeName", "transform");
  el.setAttribute("attributeType", "XML");
  el.setAttribute("type", opts.type);
  el.setAttribute("additive", opts.additive ?? "sum");

  applyValues(el, opts);
  applyTiming(el, opts);

  return el;
};

// ===== buildSet =====

/**
 * Creates a `<set>` element — instant value jump with no interpolation.
 * Useful for visibility toggles or snapping to a value at a given time.
 */
export const buildSet = (
  attributeName: string,
  to: string,
  delay?: number,
): SVGSetElement => {
  const el = document.createElementNS(SVG_NS, "set") as SVGSetElement;

  el.setAttribute("attributeName", attributeName);
  el.setAttribute("to", to);
  if (delay) el.setAttribute("begin", `${delay}s`);

  return el;
};

// ===== injectInto =====

/**
 * Appends one or more animation elements into a target SVG element.
 * The animations become children of the target and begin running immediately
 * (unless `begin` is set on them).
 */
export const injectInto = (
  target: Element,
  ...animations: SVGAnimationElement[]
): void => {
  for (const anim of animations) {
    target.appendChild(anim);
  }
};
