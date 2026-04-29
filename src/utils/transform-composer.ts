import type { TransformProps, AnimateTransformOptions } from "@/types/index.ts";
import { buildAnimateTransform } from "./builders.ts";

type TransformType = "translate" | "rotate" | "scale" | "skewX" | "skewY";
type TransformPair = { type: TransformType; from: string; to: string };

// ===== Origin resolution =====

export const resolveOrigin = (
  el: Element,
  transformOrigin?: string,
): { cx: number; cy: number } => {
  if (transformOrigin) return parseTransformOrigin(el, transformOrigin);
  return getBBoxCenter(el);
};

const parseTransformOrigin = (
  el: Element,
  transformOrigin: string,
): { cx: number; cy: number } => {
  const [rawX = "50%", rawY = rawX] = transformOrigin.trim().split(/\s+/);

  const resolve = (raw: string, dim: "width" | "height"): number => {
    if (!(el instanceof SVGGraphicsElement)) return 0;
    let bbox: DOMRect;
    try {
      bbox = el.getBBox();
    } catch {
      console.warn(
        "[gsap-to-smil] Cannot determine origin — element not in rendered DOM. Falling back to 0.",
      );
      return 0;
    }
    const offset = dim === "width" ? bbox.x : bbox.y;
    if (raw.endsWith("%")) return offset + (parseFloat(raw) / 100) * bbox[dim];
    return offset + parseFloat(raw);
  };

  return { cx: resolve(rawX, "width"), cy: resolve(rawY, "height") };
};

const getBBoxCenter = (el: Element): { cx: number; cy: number } => {
  if (!(el instanceof SVGGraphicsElement)) {
    console.warn(
      "[gsap-to-smil] Cannot determine center — element not in rendered DOM. Falling back to (0, 0).",
    );
    return { cx: 0, cy: 0 };
  }
  try {
    const bbox = el.getBBox();
    return { cx: bbox.x + bbox.width / 2, cy: bbox.y + bbox.height / 2 };
  } catch {
    console.warn(
      "[gsap-to-smil] Cannot determine center — element not in rendered DOM. Falling back to (0, 0).",
    );
    return { cx: 0, cy: 0 };
  }
};

// ===== xPercent / yPercent resolution =====

const resolvePercent = (
  value: number | string,
  dim: "width" | "height",
  el: Element,
): number => {
  if (typeof value !== "string" || !value.endsWith("%")) {
    return typeof value === "string" ? parseFloat(value) : value;
  }
  if (!(el instanceof SVGGraphicsElement)) return 0;
  try {
    const bbox = el.getBBox();
    return (parseFloat(value) / 100) * bbox[dim];
  } catch {
    console.warn(
      "[gsap-to-smil] Cannot determine percent value — element not in rendered DOM. Falling back to 0.",
    );
    return 0;
  }
};

// ===== Value stringifiers =====

const translateStr = (x: number | string, y: number | string): string =>
  `${x} ${y}`;

const rotateStr = (angle: number | string, cx: number, cy: number): string =>
  `${angle} ${cx} ${cy}`;

const scaleStr = (sx: number | string, sy: number | string): string =>
  `${sx} ${sy}`;

// ===== Per-type resolvers =====

const resolveTranslate = (
  from: TransformProps,
  to: TransformProps,
  target: Element,
): TransformPair | null => {
  if (!("x" in to || "y" in to || "xPercent" in to || "yPercent" in to))
    return null;
  const toX =
    to.xPercent !== undefined
      ? resolvePercent(to.xPercent, "width", target)
      : (to.x ?? 0);
  const toY =
    to.yPercent !== undefined
      ? resolvePercent(to.yPercent, "height", target)
      : (to.y ?? 0);
  const fromX =
    from.xPercent !== undefined
      ? resolvePercent(from.xPercent, "width", target)
      : (from.x ?? 0);
  const fromY =
    from.yPercent !== undefined
      ? resolvePercent(from.yPercent, "height", target)
      : (from.y ?? 0);
  return {
    type: "translate",
    from: translateStr(fromX, fromY),
    to: translateStr(toX, toY),
  };
};

const resolveRotate = (
  from: TransformProps,
  to: TransformProps,
  cx: number,
  cy: number,
): TransformPair | null => {
  if (!("rotation" in to)) return null;
  return {
    type: "rotate",
    from: rotateStr(from.rotation ?? 0, cx, cy),
    to: rotateStr(to.rotation ?? 0, cx, cy),
  };
};

const resolveScale = (
  from: TransformProps,
  to: TransformProps,
): TransformPair | null => {
  if (!("scale" in to || "scaleX" in to || "scaleY" in to)) return null;
  return {
    type: "scale",
    from: scaleStr(
      from.scale ?? from.scaleX ?? 1,
      from.scale ?? from.scaleY ?? 1,
    ),
    to: scaleStr(to.scale ?? to.scaleX ?? 1, to.scale ?? to.scaleY ?? 1),
  };
};

const resolveSkewX = (
  from: TransformProps,
  to: TransformProps,
): TransformPair | null => {
  if (!("skewX" in to)) return null;
  return {
    type: "skewX",
    from: String(from.skewX ?? 0),
    to: String(to.skewX ?? 0),
  };
};

const resolveSkewY = (
  from: TransformProps,
  to: TransformProps,
): TransformPair | null => {
  if (!("skewY" in to)) return null;
  return {
    type: "skewY",
    from: String(from.skewY ?? 0),
    to: String(to.skewY ?? 0),
  };
};

// ===== Pivot scaffold =====

export type PivotScaffold = { outer: SVGGElement; inner: SVGGElement };

/**
 * Wraps `el` in a pivot scaffold that creates a real coordinate space for
 * scale/skew animations around `(cx, cy)` in the parent's space.
 *
 * Structure inserted into the DOM in place of `el`:
 *   outer [translate anims go here]
 *     > pivotIn [translate(cx,cy)]
 *       > inner [scale/skew/rotate anims go here]
 *         > pivotOut [translate(-cx,-cy)]
 *           > el
 *
 * Returns null when `el` has no parent (not in the DOM).
 */
export const buildPivotScaffold = (
  el: Element,
  cx: number,
  cy: number,
): PivotScaffold | null => {
  const parent = el.parentNode;
  if (!parent) {
    console.warn(
      "[gsap-to-smil] Cannot build pivot scaffold — element not in DOM. Scale/skew origin ignored.",
    );
    return null;
  }

  const ns = "http://www.w3.org/2000/svg";
  const nextSibling = el.nextSibling;

  const outer = document.createElementNS(ns, "g") as SVGGElement;
  const pivotIn = document.createElementNS(ns, "g") as SVGGElement;
  const inner = document.createElementNS(ns, "g") as SVGGElement;
  const pivotOut = document.createElementNS(ns, "g") as SVGGElement;

  pivotIn.setAttribute("transform", `translate(${cx},${cy})`);
  pivotOut.setAttribute("transform", `translate(${-cx},${-cy})`);

  // Structure: outer > pivotIn > inner > pivotOut > el
  pivotOut.appendChild(el);
  inner.appendChild(pivotOut);
  pivotIn.appendChild(inner);
  outer.appendChild(pivotIn);

  parent.insertBefore(outer, nextSibling);

  return { outer, inner };
};

// ===== composeTransforms =====

type ComposeOptions = {
  toTransforms: TransformProps;
  fromTransforms?: TransformProps;
  target: Element;
  transformOrigin?: string;
  dur: number;
  delay?: number;
  repeat?: number;
  ease?: AnimateTransformOptions["ease"];
};

export type ComposeResult = {
  /** Animations destined for the outer lane group (translate). */
  outerAnims: SVGAnimateTransformElement[];
  /** Animations destined for the inner pivot group (scale, skew, rotate). */
  innerAnims: SVGAnimateTransformElement[];
  /** True when scale or skew is present — caller must build a pivot scaffold. */
  needsWrapper: boolean;
  /** Pivot center in the element's parent coordinate space (for scaffold construction). */
  origin: { cx: number; cy: number };
};

/**
 * Converts a `TransformProps` bucket into stacked `<animateTransform>` elements,
 * split by destination: outer (translate) and inner (scale/skew/rotate inside pivot space).
 *
 * When `needsWrapper` is true, the caller is responsible for:
 *   1. Calling `buildPivotScaffold(target, origin.cx, origin.cy)` to create the groups.
 *   2. Appending `outerAnims` to `scaffold.outer`.
 *   3. Appending `innerAnims` to `scaffold.inner`.
 *
 * When `needsWrapper` is false (translate/rotate only), all animations are in `outerAnims`
 * and should be appended directly to the target element.
 */
export const composeTransforms = (opts: ComposeOptions): ComposeResult => {
  const { toTransforms: to, fromTransforms, target, transformOrigin } = opts;
  const from = fromTransforms ?? {};

  if ("rotationX" in to || "rotationY" in to) {
    console.warn(
      "[gsap-to-smil] rotationX / rotationY have no SMIL equivalent — skipped.",
    );
  }

  const sharedTiming = {
    dur: opts.dur,
    delay: opts.delay,
    repeat: opts.repeat,
    ease: opts.ease,
  } satisfies Partial<AnimateTransformOptions>;

  const hasScale = "scale" in to || "scaleX" in to || "scaleY" in to;
  const hasSkew = "skewX" in to || "skewY" in to;
  const hasRotation = "rotation" in to;
  const needsWrapper = hasScale || hasSkew;

  const origin =
    needsWrapper || hasRotation
      ? resolveOrigin(target, transformOrigin)
      : { cx: 0, cy: 0 };

  const make = (pair: TransformPair) =>
    buildAnimateTransform({
      type: pair.type,
      from: pair.from,
      to: pair.to,
      additive: "sum",
      ...sharedTiming,
    });

  const translatePair = resolveTranslate(from, to, target);

  if (needsWrapper) {
    // Inside the pivot scaffold the element's bbox center maps to (0,0), so rotation
    // around the pivot is expressed as rotate(angle 0 0) = rotate(angle).
    const rotatePair = hasRotation ? resolveRotate(from, to, 0, 0) : null;

    const innerPairs = [
      rotatePair,
      resolveScale(from, to),
      resolveSkewX(from, to),
      resolveSkewY(from, to),
    ].filter((p): p is TransformPair => p !== null);

    return {
      outerAnims: translatePair ? [make(translatePair)] : [],
      innerAnims: innerPairs.map(make),
      needsWrapper: true,
      origin,
    };
  }

  // Flat mode: translate and/or rotate-only. Rotation uses native cx cy.
  const rotatePair = hasRotation
    ? resolveRotate(from, to, origin.cx, origin.cy)
    : null;

  return {
    outerAnims: [translatePair, rotatePair]
      .filter((p): p is TransformPair => p !== null)
      .map(make),
    innerAnims: [],
    needsWrapper: false,
    origin,
  };
};
