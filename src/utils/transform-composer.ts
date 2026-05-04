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

/**
 * Converts GSAP transform shorthand properties into SMIL
 * `<animateTransform>` elements.
 *
 * GSAP lets you animate multiple transforms in one call:
 * `{ x: 100, rotation: 45, scale: 1.5 }`. SMIL can only animate
 * one transform type per `<animateTransform>` element. This
 * composer splits compound transforms into one element per type,
 * in canonical order (translate → rotate → scale → skewX → skewY),
 * all with `additive="sum"` so they stack instead of replacing
 * each other.
 *
 * When `scale` or `skew` is present, a "pivot scaffold" — nested
 * `<g>` elements that translate to the transform origin and back —
 * is built via {@link buildPivotScaffold}. This replicates CSS
 * `transform-origin` behavior. Inside the scaffold, rotation uses
 * `(0, 0)` as its center because the outer `<g>` already handles
 * the origin offset.
 *
 * Example: `{ x: 100, rotation: 45, scale: 1.5 }` produces:
 * ```xml
 * <!-- outer (translate) -->
 * <animateTransform type="translate" from="0 0" to="100 0" additive="sum" />
 * <!-- inner pivot group (rotate + scale) -->
 * <g transform="translate(cx,cy)">
 *   <g>
 *     <animateTransform type="rotate" from="0 0 0" to="45 0 0" additive="sum" />
 *     <animateTransform type="scale" from="1 1" to="1.5 1.5" additive="sum" />
 *     <g transform="translate(-cx,-cy)">
 *       <!-- original element -->
 *     </g>
 *   </g>
 * </g>
 * ```
 */
export class TransformComposer {
  /** Keys that trigger the translate resolver. */
  private static readonly TRANSLATE_KEYS = [
    "x",
    "y",
    "xPercent",
    "yPercent",
  ] as const;

  /** Keys that trigger the scale resolver. */
  private static readonly SCALE_KEYS = ["scale", "scaleX", "scaleY"] as const;

  /** Keys that require the pivot scaffold wrapper. */
  private static readonly WRAPPER_TRIGGER_KEYS = [
    "scale",
    "scaleX",
    "scaleY",
    "skewX",
    "skewY",
  ] as const;

  /**
   * Returns `true` if any of the given property keys exist in `target`.
   *
   * Shared by `resolveTranslate`, `resolveScale`, and `compose`
   * to avoid repeating the same `.some()` pattern.
   */
  private static hasAnyKey(
    target: Record<string, unknown>,
    keys: readonly string[],
  ): boolean {
    return keys.some((key) => key in target);
  }

  /**
   * Resolves the rotation/scale origin for an element.
   *
   * If `transformOrigin` is provided (e.g. `"50% 50%"` or `"40 60"`),
   * it is parsed via {@link parseTransformOrigin}. Otherwise the
   * element's geometric center is used via {@link getBBoxCenter}.
   */
  static resolveOrigin(
    element: Element,
    transformOrigin?: string,
  ): { cx: number; cy: number } {
    if (transformOrigin) {
      return TransformComposer.parseTransformOrigin(element, transformOrigin);
    }

    return TransformComposer.getBBoxCenter(element);
  }

  /**
   * Type guard: narrows `Element` to `SVGGraphicsElement` for
   * `getBBox()` access.
   */
  private static isElementAnSvg(
    element: Element,
  ): element is SVGGraphicsElement {
    return element instanceof SVGGraphicsElement;
  }

  /**
   * Parses a `transformOrigin` string into `{ cx, cy }` coordinates
   * in the parent's coordinate space.
   *
   * Accepts pixel values (`"40 60"`), percentage values (`"50% 50%"`),
   * or a single value used for both axes (`"50"` → `{ cx: 50, cy: 50 }`).
   */
  private static parseTransformOrigin(
    element: Element,
    transformOrigin: string,
  ): { cx: number; cy: number } {
    const [rawXValue = "50%", rawYValue = rawXValue] = transformOrigin
      .trim()
      .split(/\s+/);

    function resolveCoordinate(
      rawValue: string,
      dimension: "width" | "height",
    ): number {
      if (!TransformComposer.isElementAnSvg(element)) {
        return 0;
      }

      const boundingBox: DOMRect = element.getBBox();

      const offset: number =
        dimension === "width" ? boundingBox.x : boundingBox.y;

      const percentValue = TransformComposer.resolvePercent(
        rawValue,
        dimension,
        element,
      );

      return offset + percentValue;
    }

    return {
      cx: resolveCoordinate(rawXValue, "width"),
      cy: resolveCoordinate(rawYValue, "height"),
    };
  }

  /**
   * Returns the geometric center of an SVG element via `getBBox()`.
   * Falls back to `(0, 0)` with a warning if the element is not in
   * the rendered DOM.
   */
  private static getBBoxCenter(element: Element): { cx: number; cy: number } {
    if (!TransformComposer.isElementAnSvg(element)) {
      console.warn(
        "[gsap-to-smil] Cannot determine center — element not in rendered DOM. Falling back to (0, 0).",
      );
      return { cx: 0, cy: 0 };
    }

    const boundingBox: DOMRect = element.getBBox();
    const originX: number = boundingBox.x + boundingBox.width / 2;
    const originY: number = boundingBox.y + boundingBox.height / 2;
    return { cx: originX, cy: originY };
  }

  /**
   * Converts a percentage string (e.g. `"50%"`) to a pixel value
   * using the element's bounding box.
   *
   * Non-percentage values are returned as-is (parsed to a number).
   * Returns 0 with a warning if the element is not an SVG graphics
   * element.
   */
  private static resolvePercent(
    value: number | string,
    dimension: "width" | "height",
    element: Element,
  ): number {
    if (typeof value !== "string" || !value.endsWith("%")) {
      return typeof value === "string" ? parseFloat(value) : value;
    }

    if (!TransformComposer.isElementAnSvg(element)) {
      console.warn(
        "[gsap-to-smil] Cannot determine percent value — element not in rendered DOM. Falling back to 0.",
      );
      return 0;
    }

    const boundingBox = element.getBBox();
    return (parseFloat(value) / 100) * boundingBox[dimension];
  }

  /** Formats a translate value pair for the SMIL `from`/`to` attribute. */
  private static translateStr(
    translateX: number | string,
    translateY: number | string,
  ): string {
    return `${translateX} ${translateY}`;
  }

  /** Formats a rotate value with origin for the SMIL `from`/`to` attribute. */
  private static rotateStr(
    angle: number | string,
    originX: number,
    originY: number,
  ): string {
    return `${angle} ${originX} ${originY}`;
  }

  /** Formats a scale value pair for the SMIL `from`/`to` attribute. */
  private static scaleStr(
    scaleX: number | string,
    scaleY: number | string,
  ): string {
    return `${scaleX} ${scaleY}`;
  }

  /**
   * Builds a translate `TransformPair` from `from`/`to` transform props.
   *
   * `xPercent`/`yPercent` are resolved to pixel values via
   * {@link resolvePercent} using the element's bounding box.
   * Returns `null` if no translate-related key is present in `to`.
   */
  private static resolveTranslate(
    from: TransformProps,
    to: TransformProps,
    target: Element,
  ): TransformPair | null {
    if (!TransformComposer.hasAnyKey(to, TransformComposer.TRANSLATE_KEYS)) {
      return null;
    }

    function resolveCoordinate(
      transforms: TransformProps,
      dimension: "width" | "height",
      defaultValue: number = 0,
    ): number {
      if (transforms.xPercent !== undefined) {
        return TransformComposer.resolvePercent(
          transforms.xPercent,
          dimension,
          target,
        );
      } else if (transforms.yPercent !== undefined) {
        return TransformComposer.resolvePercent(
          transforms.yPercent,
          dimension,
          target,
        );
      }

      return dimension === "width"
        ? Number(transforms.x ?? defaultValue)
        : Number(transforms.y ?? defaultValue);
    }

    const fromTranslateX = resolveCoordinate(from, "width");
    const fromTranslateY = resolveCoordinate(from, "height");

    const toTranslateX = resolveCoordinate(to, "width");
    const toTranslateY = resolveCoordinate(to, "height");

    return {
      type: "translate",
      from: TransformComposer.translateStr(fromTranslateX, fromTranslateY),
      to: TransformComposer.translateStr(toTranslateX, toTranslateY),
    };
  }

  /**
   * Builds a rotate `TransformPair` from `from`/`to` transform props.
   *
   * Returns `null` if `rotation` is not present in `to`.
   */
  private static resolveRotate(
    from: TransformProps,
    to: TransformProps,
    originX: number,
    originY: number,
  ): TransformPair | null {
    if (!("rotation" in to)) return null;

    const fromRotation = from.rotation || 0;
    const toRotation = to.rotation || 0;

    return {
      type: "rotate",
      from: TransformComposer.rotateStr(fromRotation, originX, originY),
      to: TransformComposer.rotateStr(toRotation, originX, originY),
    };
  }

  /**
   * Builds a scale `TransformPair` from `from`/`to` transform props.
   *
   * `scale` acts as a shorthand for both `scaleX` and `scaleY`.
   * Returns `null` if no scale-related key is present in `to`.
   */
  private static resolveScale(
    from: TransformProps,
    to: TransformProps,
  ): TransformPair | null {
    if (!TransformComposer.hasAnyKey(to, TransformComposer.SCALE_KEYS)) {
      return null;
    }

    const fromScaleX = from.scale ?? from.scaleX ?? 1;
    const fromScaleY = from.scale ?? from.scaleY ?? 1;
    const toScaleX = to.scale ?? to.scaleX ?? 1;
    const toScaleY = to.scale ?? to.scaleY ?? 1;

    return {
      type: "scale",
      from: TransformComposer.scaleStr(fromScaleX, fromScaleY),
      to: TransformComposer.scaleStr(toScaleX, toScaleY),
    };
  }

  /**
   * Builds a skewX `TransformPair` from `from`/`to` transform props.
   * Returns `null` if `skewX` is not present in `to`.
   */
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

  /**
   * Builds a skewY `TransformPair` from `from`/`to` transform props.
   * Returns `null` if `skewY` is not present in `to`.
   */
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

  /**
   * Builds the pivot scaffold — nested `<g>` elements that replicate
   * CSS `transform-origin` for scale and skew transforms.
   *
   * Structure:
   * ```xml
   * <g>                              ← outer (returned)
   *   <g transform="translate(cx,cy)">   ← translate-in
   *     <g>                              ← inner (returned)
   *       <g transform="translate(-cx,-cy)"> ← translate-out
   *         <!-- original element -->
   *       </g>
   *     </g>
   *   </g>
   * </g>
   * ```
   *
   * Scale/skew `<animateTransform>` elements go inside `inner`.
   * Translate elements go on `outer` so they aren't affected by
   * the origin offset.
   *
   * Returns `null` with a warning if the element has no parent.
   */
  static buildPivotScaffold(
    element: Element,
    originX: number,
    originY: number,
  ): PivotScaffold | null {
    const parent: ParentNode | null = element.parentNode;
    if (!parent) {
      console.warn(
        "[gsap-to-smil] Cannot build pivot scaffold — element not in DOM. Scale/skew origin ignored.",
      );
      return null;
    }

    const nextSibling: ChildNode | null = element.nextSibling;

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

    pivotIn.setAttribute("transform", `translate(${originX},${originY})`);
    pivotOut.setAttribute("transform", `translate(${-originX},${-originY})`);

    pivotOut.appendChild(element);
    inner.appendChild(pivotOut);
    pivotIn.appendChild(inner);
    outer.appendChild(pivotIn);

    parent.insertBefore(outer, nextSibling);

    return { outer, inner };
  }

  /**
   * Converts GSAP transform properties into `<animateTransform>` elements.
   *
   * Splits compound transforms (e.g. `x` + `rotation` + `scale`) into one
   * element per type, each with `additive="sum"`. When scale or skew is
   * present, a {@link buildPivotScaffold | pivot scaffold} is needed to
   * replicate CSS `transform-origin` — the return's `needsWrapper` flag
   * tells the caller to build one.
   *
   * Canonical order: translate → rotate → scale → skewX → skewY.
   *
   * @returns `outerAnims` (before the pivot scaffold) and `innerAnims`
   * (inside it), plus `needsWrapper` and the resolved `origin`.
   */
  static compose(composeOptions: ComposeOptions): ComposeResult {
    const {
      toTransforms: to,
      fromTransforms,
      target,
      transformOrigin,
    } = composeOptions;

    const from = fromTransforms ?? {};

    if ("rotationX" in to || "rotationY" in to) {
      console.warn(
        "[gsap-to-smil] rotationX / rotationY have no SMIL equivalent — skipped.",
      );
    }

    const sharedTiming = {
      dur: composeOptions.dur,
      delay: composeOptions.delay,
      repeat: composeOptions.repeat,
      ease: composeOptions.ease,
    } satisfies Partial<AnimateTransformOptions>;

    const needsWrapper = TransformComposer.hasAnyKey(
      to,
      TransformComposer.WRAPPER_TRIGGER_KEYS,
    );
    const hasRotation = "rotation" in to;

    const origin =
      needsWrapper || hasRotation
        ? TransformComposer.resolveOrigin(target, transformOrigin)
        : { cx: 0, cy: 0 };

    const buildAnimationElement = (pair: TransformPair) =>
      SMILBuilder.animateTransform({
        type: pair.type,
        from: pair.from,
        to: pair.to,
        additive: "sum",
        ...sharedTiming,
      });

    const translatePair = TransformComposer.resolveTranslate(from, to, target);

    if (needsWrapper) {
      // Inside the pivot scaffold, rotation uses (0, 0) as its center
      // because the scaffold's outer <g> already handles the origin offset
      // via translate(originX, originY) / translate(-originX, -originY).
      // The rotation runs in the translated coordinate space.
      const rotatePair = hasRotation
        ? TransformComposer.resolveRotate(from, to, 0, 0)
        : null;

      const innerPairs = [
        rotatePair,
        TransformComposer.resolveScale(from, to),
        TransformComposer.resolveSkewX(from, to),
        TransformComposer.resolveSkewY(from, to),
      ].filter((pair): pair is TransformPair => pair !== null);

      const innerAnimationElements = innerPairs.map(buildAnimationElement);

      const outerAnimationElements = translatePair
        ? [buildAnimationElement(translatePair)]
        : [];

      return {
        outerAnims: outerAnimationElements,
        innerAnims: innerAnimationElements,
        needsWrapper: true,
        origin,
      };
    }

    const rotatePair = hasRotation
      ? TransformComposer.resolveRotate(from, to, origin.cx, origin.cy)
      : null;

    const outerAnimationElements = [translatePair, rotatePair]
      .filter((pair): pair is TransformPair => pair !== null)
      .map(buildAnimationElement);

    return {
      outerAnims: outerAnimationElements,
      innerAnims: [],
      needsWrapper: false,
      origin,
    };
  }
}
