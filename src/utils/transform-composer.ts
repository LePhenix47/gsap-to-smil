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
    if (transformOrigin) {
      return TransformComposer.parseTransformOrigin(el, transformOrigin);
    }

    // ? If no transform origin is specified, use the element's center
    return TransformComposer.getBBoxCenter(el);
  }

  private static isElementAnSvg(
    element: Element,
  ): element is SVGGraphicsElement {
    return element instanceof SVGGraphicsElement;
  }

  private static parseTransformOrigin(
    el: Element,
    transformOrigin: string,
  ): { cx: number; cy: number } {
    // ? ex: "20 50%" → { cx: 20, cy: 50% }
    const [rawX = "50%", rawY = rawX] = transformOrigin.trim().split(/\s+/);

    function resolveOriginFrom(raw: string, dim: "width" | "height"): number {
      if (!TransformComposer.isElementAnSvg(el)) {
        return 0;
      }

      const bbox: DOMRect = el.getBBox();

      const offset: number = dim === "width" ? bbox.x : bbox.y;

      const isPercentage: boolean = raw.endsWith("%");
      if (isPercentage) {
        return offset + (parseFloat(raw) / 100) * bbox[dim]; // ! Repetition of code from `resolvePercent` method
      }

      return offset + parseFloat(raw);
    }

    return {
      cx: resolveOriginFrom(rawX, "width"),
      cy: resolveOriginFrom(rawY, "height"),
    };
  }

  private static getBBoxCenter(el: Element): { cx: number; cy: number } {
    if (!TransformComposer.isElementAnSvg(el)) {
      console.warn(
        "[gsap-to-smil] Cannot determine center — element not in rendered DOM. Falling back to (0, 0).",
      );
      return { cx: 0, cy: 0 };
    }

    const bbox: DOMRect = el.getBBox();
    const cx: number = bbox.x + bbox.width / 2;
    const cy: number = bbox.y + bbox.height / 2;
    return { cx, cy };
  }

  private static resolvePercent(
    value: number | string,
    dim: "width" | "height",
    el: Element,
  ): number {
    if (typeof value !== "string" || !value.endsWith("%")) {
      return typeof value === "string" ? parseFloat(value) : value;
    }

    if (!TransformComposer.isElementAnSvg(el)) {
      console.warn(
        "[gsap-to-smil] Cannot determine percent value — element not in rendered DOM. Falling back to 0.",
      );
      return 0;
    }

    const bbox = el.getBBox();
    return (parseFloat(value) / 100) * bbox[dim];
  }

  private static translateStr(x: number | string, y: number | string): string {
    return `${x} ${y}`;
  }

  private static rotateStr(
    angle: number | string,
    cx: number,
    cy: number,
  ): string {
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
    const positionalProperties: Array<
      keyof Pick<TransformProps, "x" | "y" | "xPercent" | "yPercent">
    > = ["x", "y", "xPercent", "yPercent"];

    if (!positionalProperties.some((p) => p in to)) return null;

    /** Resolved % coordinates to pixel values from the element's bbox*/
    function resolveCoord(
      prop: TransformProps,
      dim: "width" | "height",
      defaultValue: number = 0,
    ): number {
      if (typeof prop.xPercent !== "undefined") {
        return TransformComposer.resolvePercent(prop.xPercent, dim, target);
      } else if (typeof prop.yPercent !== "undefined") {
        return TransformComposer.resolvePercent(prop.yPercent, dim, target);
      }
      return Number(prop.x ?? prop.y ?? defaultValue);
    }

    const fromX = resolveCoord(from, "width");
    const fromY = resolveCoord(from, "height");

    const toX = resolveCoord(to, "width");
    const toY = resolveCoord(to, "height");

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

    const fromRotation = from.rotation || 0;
    const toRotation = to.rotation || 0;

    return {
      type: "rotate",
      from: TransformComposer.rotateStr(fromRotation, cx, cy),
      to: TransformComposer.rotateStr(toRotation, cx, cy),
    };
  }

  private static resolveScale(
    from: TransformProps,
    to: TransformProps,
  ): TransformPair | null {
    const scaleProperties: Array<
      keyof Pick<TransformProps, "scale" | "scaleX" | "scaleY">
    > = ["scale", "scaleX", "scaleY"];

    if (!scaleProperties.some((p) => p in to)) return null;

    const fromSx = from.scale ?? from.scaleX ?? 1;
    const fromSy = from.scale ?? from.scaleY ?? 1;
    const toSx = to.scale ?? to.scaleX ?? 1;
    const toSy = to.scale ?? to.scaleY ?? 1;

    return {
      type: "scale",
      from: TransformComposer.scaleStr(fromSx, fromSy),
      to: TransformComposer.scaleStr(toSx, toSy),
    };
  }

  private static resolveSkewX(
    from: TransformProps,
    to: TransformProps,
  ): TransformPair | null {
    if (!("skewX" in to)) return null;

    return {
      type: "skewX",
      from: String(from.skewX || 0),
      to: String(to.skewX || 0),
    };
  }

  private static resolveSkewY(
    from: TransformProps,
    to: TransformProps,
  ): TransformPair | null {
    if (!("skewY" in to)) return null;

    return {
      type: "skewY",
      from: String(from.skewY || 0),
      to: String(to.skewY || 0),
    };
  }

  static buildPivotScaffold(
    el: Element,
    cx: number,
    cy: number,
  ): PivotScaffold | null {
    const parent: ParentNode | null = el.parentNode;
    if (!parent) {
      console.warn(
        "[gsap-to-smil] Cannot build pivot scaffold — element not in DOM. Scale/skew origin ignored.",
      );
      return null;
    }

    const nextSibling: ChildNode | null = el.nextSibling;

    // ? We're using createElementNS instead of createElement because it's for SVG elements, not HTML (browser could misinterpret an SVG tag as an HTML tag)
    const outer = document.createElementNS(
      SMILBuilder.SVG_NS,
      "g",
    ) as SVGGElement;

    const pivotIn = document.createElementNS(
      SMILBuilder.SVG_NS,
      "g",
    ) as SVGGElement;

    const inner = document.createElementNS(
      SMILBuilder.SVG_NS,
      "g",
    ) as SVGGElement;

    const pivotOut = document.createElementNS(
      SMILBuilder.SVG_NS,
      "g",
    ) as SVGGElement;

    pivotIn.setAttribute("transform", `translate(${cx},${cy})`);
    pivotOut.setAttribute("transform", `translate(${-cx},${-cy})`);

    pivotOut.appendChild(el);
    inner.appendChild(pivotOut);
    pivotIn.appendChild(inner);
    outer.appendChild(pivotIn);

    parent.insertBefore(outer, nextSibling);

    return { outer, inner };
  }

  // ! What's this method's purpose ? I guess only for testing but at the very least it should be explicit
  static compose(opts: ComposeOptions): ComposeResult {
    // ! Wtf are the "opts" ? Terrible parameter name
    const { toTransforms: to, fromTransforms, target, transformOrigin } = opts;

    // ! Useless nullish coalescing here
    const from = fromTransforms ?? {};

    // * SVGs do not support rotationX / rotationY unfortunately
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

    // ! Should be an inner static method, here it's just to check if we need to wrap it with a <g> or not
    const hasScale = "scale" in to || "scaleX" in to || "scaleY" in to;
    const hasSkew = "skewX" in to || "skewY" in to;
    const hasRotation = "rotation" in to;
    const needsWrapper = hasScale || hasSkew;

    const origin =
      needsWrapper || hasRotation
        ? TransformComposer.resolveOrigin(target, transformOrigin)
        : { cx: 0, cy: 0 };

    // ! Code beyond this looks atrocious
    const make = (pair: TransformPair) =>
      SMILBuilder.animateTransform({
        type: pair.type,
        from: pair.from,
        to: pair.to,
        additive: "sum",
        ...sharedTiming,
      });

    // * Translate from-to pair
    const translatePair = TransformComposer.resolveTranslate(from, to, target);

    if (needsWrapper) {
      // ! Uh why are cx & cy 0 here ? This is a very serious code smell
      const rotatePair = hasRotation
        ? TransformComposer.resolveRotate(from, to, 0, 0)
        : null;

      // ! Atrocious looking code, The intent is clear: collect all inner transform pairs (rotate, scale, skewX, skewY), filter nulls, map to SMIL.
      // ! but the code is too fucking dense you can't read JACK SHIT
      const innerPairs = [
        rotatePair,
        TransformComposer.resolveScale(from, to),
        TransformComposer.resolveSkewX(from, to),
        TransformComposer.resolveSkewY(from, to),
      ].filter((p): p is TransformPair => p !== null);

      return {
        // ! Atrocious looking code part 2
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
      // ! Atrocious looking code part 3
      outerAnims: [translatePair, rotatePair]
        .filter((p): p is TransformPair => p !== null)
        .map(make),
      innerAnims: [],
      needsWrapper: false,
      origin,
    };
  }
}
