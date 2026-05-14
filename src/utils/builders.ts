// fallow-ignore-file
import type {
  AnimateOptions,
  AnimateTransformOptions,
} from "@/types/builders.type.ts";
import type { EaseString } from "@/types/easing.type.ts";
import { Easing } from "./easing.ts";

/**
 * Factory for creating fully-configured SMIL animation elements
 * (`<animate>`, `<animateTransform>`, `<set>`).
 *
 * Encapsulates all SMIL attribute rules: GSAP repeat off-by-one,
 * ease → calcMode / keySplines / keyTimes, delay → begin.
 * Stateless — every method is static.
 */
export class SMILBuilder {
  /** SVG namespace URI. */
  static readonly SVG_NS: SVGElement["namespaceURI"] =
    "http://www.w3.org/2000/svg";

  /**
   * Resolves an ease to `calcMode`, `keyTimes`, and `keySplines`
   * and sets them on the element.
   *
   * When `calcMode` is not `"spline"` the method returns early
   * without setting `keySplines` or `keyTimes`.
   */
  private static applyEasing(
    element: SVGAnimationElement,
    ease: EaseString | number[] | undefined,
    intervalCount: number,
  ): void {
    const calcMode = Easing.resolveCalcMode(ease);

    element.setAttribute("calcMode", calcMode);

    if (calcMode !== "spline") {
      return;
    }

    const keyTimes = Easing.resolveKeyTimes(intervalCount);
    const keySplines = Easing.resolveKeySplines(ease!, intervalCount);

    if (keyTimes) element.setAttribute("keyTimes", keyTimes);
    if (keySplines) element.setAttribute("keySplines", keySplines);
  }

  /**
   * Sets `dur`, `fill` (default `"freeze"`), `delay` → `begin`,
   * and `repeat` → `repeatCount` on the element.
   *
   * GSAP repeat off-by-one: `repeatCount = repeat + 1`.
   * `-1` maps to `"indefinite"`.
   */
  private static applyTiming(
    element: SVGAnimationElement,
    timingOptions: Pick<AnimateOptions, "dur" | "delay" | "repeat" | "fill">,
  ): void {
    element.setAttribute("dur", `${timingOptions.dur}s`);
    element.setAttribute("fill", timingOptions.fill ?? "freeze");

    if (timingOptions.delay) {
      element.setAttribute("begin", `${timingOptions.delay}s`);
    }

    if (timingOptions.repeat !== undefined && timingOptions.repeat !== 0) {
      const repeatCountValue: string =
        timingOptions.repeat === -1
          ? "indefinite"
          : String(timingOptions.repeat + 1);

      element.setAttribute("repeatCount", repeatCountValue);
    }
  }

  /**
   * Sets `from`/`to` or `values` on the element.
   *
   * When `values` is provided the interval count is derived from the
   * semicolon-separated list. Otherwise `from` and `to` are set
   * individually and easing uses `intervalCount = 1`.
   */
  private static applyValues(
    element: SVGAnimationElement,
    valuesOptions: Pick<AnimateOptions, "from" | "to" | "values" | "ease">,
  ): void {
    if (valuesOptions.values !== undefined) {
      element.setAttribute("values", valuesOptions.values);
      const intervalCount: number = valuesOptions.values.split(";").length - 1;
      SMILBuilder.applyEasing(element, valuesOptions.ease, intervalCount);

      return;
    }

    if (valuesOptions.from !== undefined) {
      element.setAttribute("from", valuesOptions.from);
    }
    if (valuesOptions.to !== undefined) {
      element.setAttribute("to", valuesOptions.to);
    }

    SMILBuilder.applyEasing(element, valuesOptions.ease, 1);
  }

  /**
   * Creates an `<animate>` element from the given options.
   *
   * The returned element has `attributeName`, value/timing/easing
   * attributes, and an optional `additive` attribute set.
   */
  static animate(animationOptions: AnimateOptions): SVGAnimateElement {
    const element = document.createElementNS(
      SMILBuilder.SVG_NS,
      "animate",
    ) as SVGAnimateElement;

    element.setAttribute("attributeName", animationOptions.attributeName);
    SMILBuilder.applyValues(element, animationOptions);
    SMILBuilder.applyTiming(element, animationOptions);

    if (animationOptions.additive) {
      element.setAttribute("additive", animationOptions.additive);
    }

    return element;
  }

  /**
   * Creates an `<animateTransform>` element from the given options.
   *
   * Always sets `attributeName="transform"` and `attributeType="XML"`.
   * Defaults `additive` to `"sum"` so compound transforms stack
   * correctly — override with `additive: "replace"` when needed.
   */
  static animateTransform(
    transformOptions: AnimateTransformOptions,
  ): SVGAnimateTransformElement {
    const element = document.createElementNS(
      SMILBuilder.SVG_NS,
      "animateTransform",
    ) as SVGAnimateTransformElement;

    element.setAttribute("attributeName", "transform");
    element.setAttribute("attributeType", "XML");
    element.setAttribute("type", transformOptions.type);
    element.setAttribute("additive", transformOptions.additive ?? "sum");

    SMILBuilder.applyValues(element, transformOptions);
    SMILBuilder.applyTiming(element, transformOptions);

    return element;
  }

  /**
   * Creates a `<set>` element for non-interpolated property assignment
   * at an optional delay.
   */
  // fallow-ignore-next-line unused-class-members
  static set(attributeName: string, to: string, delay?: number): SVGSetElement {
    const element = document.createElementNS(
      SMILBuilder.SVG_NS,
      "set",
    ) as SVGSetElement;

    element.setAttribute("attributeName", attributeName);
    element.setAttribute("to", to);

    if (delay) element.setAttribute("begin", `${delay}s`);

    return element;
  }

  /**
   * Appends one or more animation elements as children of the target.
   */
  static injectInto(
    target: Element,
    ...animationElements: SVGAnimationElement[]
  ): void {
    for (const animationElement of animationElements) {
      target.appendChild(animationElement);
    }
  }
}
