import type { TransformProps, AnimateTransformOptions } from "@/types/index.ts";
import { SMILBuilder } from "./builders.ts";

type TransformType = "translate" | "rotate" | "scale" | "skewX" | "skewY";
type TransformPair = { type: TransformType; from: string; to: string };

export type PivotScaffold = { outer: SVGGElement; inner: SVGGElement };

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
  outerAnims: SVGAnimateTransformElement[];
  innerAnims: SVGAnimateTransformElement[];
  needsWrapper: boolean;
  origin: { cx: number; cy: number };
};

export class TransformComposer {
  static resolveOrigin(
    el: Element,
    transformOrigin?: string,
  ): { cx: number; cy: number } {
    if (transformOrigin) return TransformComposer.parseTransformOrigin(el, transformOrigin);
    return TransformComposer.getBBoxCenter(el);
  }

  private static parseTransformOrigin(
    el: Element,
    transformOrigin: string,
  ): { cx: number; cy: number } {
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
  }

  private static getBBoxCenter(el: Element): { cx: number; cy: number } {
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
  }

  private static resolvePercent(
    value: number | string,
    dim: "width" | "height",
    el: Element,
  ): number {
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
  }

  private static translateStr(x: number | string, y: number | string): string {
    return `${x} ${y}`;
  }

  private static rotateStr(angle: number | string, cx: number, cy: number): string {
    return `${angle} ${cx} ${cy}`;
  }

  private static scaleStr(sx: number | string, sy: number | string): string {
    return `${sx} ${sy}`;
  }

  private static resolveTranslate(
    from: TransformProps,
    to: TransformProps,
    target: Element,
  ): TransformPair | null {
    if (!("x" in to || "y" in to || "xPercent" in to || "yPercent" in to))
      return null;
    const toX =
      to.xPercent !== undefined
        ? TransformComposer.resolvePercent(to.xPercent, "width", target)
        : (to.x ?? 0);
    const toY =
      to.yPercent !== undefined
        ? TransformComposer.resolvePercent(to.yPercent, "height", target)
        : (to.y ?? 0);
    const fromX =
      from.xPercent !== undefined
        ? TransformComposer.resolvePercent(from.xPercent, "width", target)
        : (from.x ?? 0);
    const fromY =
      from.yPercent !== undefined
        ? TransformComposer.resolvePercent(from.yPercent, "height", target)
        : (from.y ?? 0);
    return {
      type: "translate",
      from: TransformComposer.translateStr(fromX, fromY),
      to: TransformComposer.translateStr(toX, toY),
    };
  }

  private static resolveRotate(
    from: TransformProps,
    to: TransformProps,
    cx: number,
    cy: number,
  ): TransformPair | null {
    if (!("rotation" in to)) return null;
    return {
      type: "rotate",
      from: TransformComposer.rotateStr(from.rotation ?? 0, cx, cy),
      to: TransformComposer.rotateStr(to.rotation ?? 0, cx, cy),
    };
  }

  private static resolveScale(
    from: TransformProps,
    to: TransformProps,
  ): TransformPair | null {
    if (!("scale" in to || "scaleX" in to || "scaleY" in to)) return null;
    return {
      type: "scale",
      from: TransformComposer.scaleStr(
        from.scale ?? from.scaleX ?? 1,
        from.scale ?? from.scaleY ?? 1,
      ),
      to: TransformComposer.scaleStr(to.scale ?? to.scaleX ?? 1, to.scale ?? to.scaleY ?? 1),
    };
  }

  private static resolveSkewX(
    from: TransformProps,
    to: TransformProps,
  ): TransformPair | null {
    if (!("skewX" in to)) return null;
    return {
      type: "skewX",
      from: String(from.skewX ?? 0),
      to: String(to.skewX ?? 0),
    };
  }

  private static resolveSkewY(
    from: TransformProps,
    to: TransformProps,
  ): TransformPair | null {
    if (!("skewY" in to)) return null;
    return {
      type: "skewY",
      from: String(from.skewY ?? 0),
      to: String(to.skewY ?? 0),
    };
  }

  static buildPivotScaffold(
    el: Element,
    cx: number,
    cy: number,
  ): PivotScaffold | null {
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

    pivotOut.appendChild(el);
    inner.appendChild(pivotOut);
    pivotIn.appendChild(inner);
    outer.appendChild(pivotIn);

    parent.insertBefore(outer, nextSibling);

    return { outer, inner };
  }

  static compose(opts: ComposeOptions): ComposeResult {
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
        ? TransformComposer.resolveOrigin(target, transformOrigin)
        : { cx: 0, cy: 0 };

    const make = (pair: TransformPair) =>
      SMILBuilder.animateTransform({
        type: pair.type,
        from: pair.from,
        to: pair.to,
        additive: "sum",
        ...sharedTiming,
      });

    const translatePair = TransformComposer.resolveTranslate(from, to, target);

    if (needsWrapper) {
      const rotatePair = hasRotation ? TransformComposer.resolveRotate(from, to, 0, 0) : null;

      const innerPairs = [
        rotatePair,
        TransformComposer.resolveScale(from, to),
        TransformComposer.resolveSkewX(from, to),
        TransformComposer.resolveSkewY(from, to),
      ].filter((p): p is TransformPair => p !== null);

      return {
        outerAnims: translatePair ? [make(translatePair)] : [],
        innerAnims: innerPairs.map(make),
        needsWrapper: true,
        origin,
      };
    }

    const rotatePair = hasRotation
      ? TransformComposer.resolveRotate(from, to, origin.cx, origin.cy)
      : null;

    return {
      outerAnims: [translatePair, rotatePair]
        .filter((p): p is TransformPair => p !== null)
        .map(make),
      innerAnims: [],
      needsWrapper: false,
      origin,
    };
  }
}
