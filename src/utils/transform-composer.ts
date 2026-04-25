import type { TransformProps, AnimateTransformOptions } from "@/types/index.ts";
import { buildAnimateTransform } from "./builders.ts";

type TransformType = "translate" | "rotate" | "scale" | "skewX" | "skewY";

// ===== Rotation origin =====

/**
 * Resolves the rotation center `(cx, cy)` in the parent's coordinate space.
 * Priority: parsed `transformOrigin` string → `getBBox()` center → `(0, 0)` fallback.
 */
export const resolveRotationOrigin = (
  el: Element,
  transformOrigin?: string,
): { cx: number; cy: number } => {
  if (transformOrigin) {
    return parseTransformOrigin(el, transformOrigin);
  }

  return getBBoxCenter(el);
};

const parseTransformOrigin = (
  el: Element,
  transformOrigin: string,
): { cx: number; cy: number } => {
  const [rawX = "50%", rawY = rawX] = transformOrigin.trim().split(/\s+/);

  const resolve = (raw: string, dim: "width" | "height"): number => {
    if (!raw.endsWith("%")) {
      return parseFloat(raw);
    }

    const pct = parseFloat(raw) / 100;
    if (!(el instanceof SVGGraphicsElement)) {
      return 0;
    }
    try {
      const bbox = el.getBBox();
      return bbox[dim === "width" ? "x" : "y"] + pct * bbox[dim];
    } catch {
      // not in rendered DOM
      console.warn(
        "[gsap-to-smil] Cannot determine rotation center — element not in rendered DOM. Falling back to 0.",
      );
      return 0;
    }
  };

  return { cx: resolve(rawX, "width"), cy: resolve(rawY, "height") };
};

const getBBoxCenter = (el: Element): { cx: number; cy: number } => {
  if (!(el instanceof SVGGraphicsElement)) {
    console.warn(
      "[gsap-to-smil] Cannot determine rotation center — element not in rendered DOM. Falling back to (0, 0).",
    );
    return { cx: 0, cy: 0 };
  }

  try {
    const bbox = el.getBBox();
    return { cx: bbox.x + bbox.width / 2, cy: bbox.y + bbox.height / 2 };
  } catch {
    // not in rendered DOM
    console.warn(
      "[gsap-to-smil] Cannot determine rotation center — element not in rendered DOM. Falling back to (0, 0).",
    );
    return { cx: 0, cy: 0 };
  }
};

// ===== xPercent / yPercent resolution =====

/**
 * Converts `xPercent` / `yPercent` to pixel values via `getBBox()`.
 * Falls back to 0 if the element is not in the rendered DOM.
 */
const resolvePercent = (
  value: number | string,
  dim: "width" | "height",
  el: Element,
): number => {
  if (typeof value !== "string" || !value.endsWith("%")) {
    return typeof value === "string" ? parseFloat(value) : value;
  }

  if (!(el instanceof SVGGraphicsElement)) {
    return 0;
  }
  try {
    const bbox = el.getBBox();
    return (parseFloat(value) / 100) * bbox[dim];
  } catch {
    // not in rendered DOM
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
// Each returns { type, from, to } if the transform is active in `to`, or null if not.
// Canonical order is enforced by the array in composeTransforms — not here.

type TransformPair = { type: TransformType; from: string; to: string };

const resolveTranslate = (
  from: TransformProps,
  to: TransformProps,
  target: Element,
): TransformPair | null => {
  if (!("x" in to || "y" in to || "xPercent" in to || "yPercent" in to)) return null;

  const toX = to.xPercent !== undefined ? resolvePercent(to.xPercent, "width", target) : (to.x ?? 0);
  const toY = to.yPercent !== undefined ? resolvePercent(to.yPercent, "height", target) : (to.y ?? 0);
  const fromX = from.xPercent !== undefined ? resolvePercent(from.xPercent, "width", target) : (from.x ?? 0);
  const fromY = from.yPercent !== undefined ? resolvePercent(from.yPercent, "height", target) : (from.y ?? 0);

  return { type: "translate", from: translateStr(fromX, fromY), to: translateStr(toX, toY) };
};

const resolveRotate = (
  from: TransformProps,
  to: TransformProps,
  target: Element,
  transformOrigin?: string,
): TransformPair | null => {
  if (!("rotation" in to)) return null;

  const { cx, cy } = resolveRotationOrigin(target, transformOrigin);

  return {
    type: "rotate",
    from: rotateStr(from.rotation ?? 0, cx, cy),
    to: rotateStr(to.rotation ?? 0, cx, cy),
  };
};

const resolveScale = (from: TransformProps, to: TransformProps): TransformPair | null => {
  if (!("scale" in to || "scaleX" in to || "scaleY" in to)) return null;

  return {
    type: "scale",
    from: scaleStr(from.scale ?? from.scaleX ?? 1, from.scale ?? from.scaleY ?? 1),
    to: scaleStr(to.scale ?? to.scaleX ?? 1, to.scale ?? to.scaleY ?? 1),
  };
};

const resolveSkewX = (from: TransformProps, to: TransformProps): TransformPair | null => {
  if (!("skewX" in to)) return null;
  return { type: "skewX", from: String(from.skewX ?? 0), to: String(to.skewX ?? 0) };
};

const resolveSkewY = (from: TransformProps, to: TransformProps): TransformPair | null => {
  if (!("skewY" in to)) return null;
  return { type: "skewY", from: String(from.skewY ?? 0), to: String(to.skewY ?? 0) };
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

/**
 * Converts a `TransformProps` bucket into stacked `<animateTransform>` elements.
 *
 * One element per active transform type, in canonical order
 * (translate → rotate → scale → skewX → skewY), all with `additive="sum"`.
 */
export const composeTransforms = (opts: ComposeOptions): SVGAnimateTransformElement[] => {
  const { toTransforms: to, fromTransforms, target, transformOrigin } = opts;
  const from = fromTransforms ?? {};

  if ("rotationX" in to || "rotationY" in to) {
    console.warn("[gsap-to-smil] rotationX / rotationY have no SMIL equivalent — skipped.");
  }

  const sharedTiming = {
    dur: opts.dur,
    delay: opts.delay,
    repeat: opts.repeat,
    ease: opts.ease,
  } satisfies Partial<AnimateTransformOptions>;

  // Array order = canonical transform order
  const pairs = [
    resolveTranslate(from, to, target),
    resolveRotate(from, to, target, transformOrigin),
    resolveScale(from, to),
    resolveSkewX(from, to),
    resolveSkewY(from, to),
  ];

  return pairs
    .filter((pair): pair is TransformPair => pair !== null)
    .map(({ type, from, to }) =>
      buildAnimateTransform({ type, from, to, additive: "sum", ...sharedTiming }),
    );
};
