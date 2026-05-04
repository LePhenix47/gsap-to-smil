import type {
  AnimateOptions,
  AnimateTransformOptions,
} from "@/types/builders.ts";
import type { EaseString } from "@/types/easing.ts";
import { Easing } from "./easing.ts";

// ! Missing JSDoc
export class SMILBuilder {
  static readonly SVG_NS: SVGElement["namespaceURI"] =
    "http://www.w3.org/2000/svg";

  private static applyEasing(
    el: SVGAnimationElement,
    ease: EaseString | number[] | undefined,
    intervalCount: number,
  ): void {
    const { calcMode, keySplines, keyTimes } = Easing.resolveCalcMode(
      ease,
      intervalCount,
    );

    el.setAttribute("calcMode", calcMode);
    if (keyTimes) el.setAttribute("keyTimes", keyTimes);
    if (keySplines) el.setAttribute("keySplines", keySplines);
  }

  private static applyTiming(
    el: SVGAnimationElement,
    opts: Pick<AnimateOptions, "dur" | "delay" | "repeat" | "fill">,
  ): void {
    el.setAttribute("dur", `${opts.dur}s`);
    el.setAttribute("fill", opts.fill ?? "freeze");

    if (opts.delay) {
      el.setAttribute("begin", `${opts.delay}s`);
    }

    if (opts.repeat !== undefined && opts?.repeat !== 0) {
      el.setAttribute(
        "repeatCount",
        opts.repeat === -1 ? "indefinite" : String(opts.repeat + 1),
      );
    }
  }

  private static applyValues(
    el: SVGAnimationElement,
    opts: Pick<AnimateOptions, "from" | "to" | "values" | "ease">,
  ): void {
    if (opts.values !== undefined) {
      el.setAttribute("values", opts.values);
      const intervalCount = opts.values.split(";").length - 1;
      SMILBuilder.applyEasing(el, opts.ease, intervalCount);
    } else {
      if (opts.from !== undefined) el.setAttribute("from", opts.from);
      if (opts.to !== undefined) el.setAttribute("to", opts.to);
      SMILBuilder.applyEasing(el, opts.ease, 1);
    }
  }

  static animate(opts: AnimateOptions): SVGAnimateElement {
    const el = document.createElementNS(
      SMILBuilder.SVG_NS,
      "animate",
    ) as SVGAnimateElement;

    el.setAttribute("attributeName", opts.attributeName);
    SMILBuilder.applyValues(el, opts);
    SMILBuilder.applyTiming(el, opts);

    if (opts.additive) el.setAttribute("additive", opts.additive);

    return el;
  }

  static animateTransform(
    opts: AnimateTransformOptions,
  ): SVGAnimateTransformElement {
    const el = document.createElementNS(
      SMILBuilder.SVG_NS,
      "animateTransform",
    ) as SVGAnimateTransformElement;

    el.setAttribute("attributeName", "transform");
    el.setAttribute("attributeType", "XML");
    el.setAttribute("type", opts.type);
    el.setAttribute("additive", opts.additive ?? "sum");

    SMILBuilder.applyValues(el, opts);
    SMILBuilder.applyTiming(el, opts);

    return el;
  }

  static set(attributeName: string, to: string, delay?: number): SVGSetElement {
    const el = document.createElementNS(
      SMILBuilder.SVG_NS,
      "set",
    ) as SVGSetElement;

    el.setAttribute("attributeName", attributeName);
    el.setAttribute("to", to);
    if (delay) el.setAttribute("begin", `${delay}s`);

    return el;
  }

  static injectInto(
    target: Element,
    ...animations: SVGAnimationElement[]
  ): void {
    for (const anim of animations) {
      target.appendChild(anim);
    }
  }
}
