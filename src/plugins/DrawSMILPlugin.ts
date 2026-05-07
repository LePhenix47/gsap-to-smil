import type { DrawSVGValue } from "@/types/index.ts";
import type { AnimateOptions } from "@/types/builders.type.ts";
import { SMILBuilder } from "@/utils/builders.ts";

type DrawState = { start: number; end: number };
type TimingOpts = Pick<AnimateOptions, "dur" | "delay" | "repeat" | "ease">;

export class DrawSVGPlugin {
  private static parseValue(val: DrawSVGValue): DrawState {
    if (val === true) return { start: 0, end: 1 };
    if (val === false || val === 0) return { start: 0, end: 0 };

    if (typeof val === "number") {
      return { start: 0, end: Math.max(0, Math.min(1, val)) };
    }

    const parts = String(val).trim().split(/\s+/);
    const parse = (s: string) => parseFloat(s) / (s.endsWith("%") ? 100 : 1);

    if (parts.length === 1) {
      return { start: 0, end: Math.max(0, Math.min(1, parse(parts[0]!))) };
    }

    return {
      start: Math.max(0, Math.min(1, parse(parts[0]!))),
      end: Math.max(0, Math.min(1, parse(parts[1]!))),
    };
  }

  private static stateToAttrs(s: DrawState) {
    return {
      dasharray: `${Math.max(0, s.end - s.start)} 1`,
      dashoffset: s.start === 0 ? "0" : String(-s.start),
    };
  }

  static applyState(target: Element, val: DrawSVGValue): void {
    target.setAttribute("pathLength", "1");
    const state = DrawSVGPlugin.parseValue(val);
    const attrs = DrawSVGPlugin.stateToAttrs(state);
    target.setAttribute("stroke-dasharray", attrs.dasharray);
    target.setAttribute("stroke-dashoffset", attrs.dashoffset);
  }

  static buildAnimation(
    target: Element,
    toVal: DrawSVGValue,
    fromVal: DrawSVGValue | undefined,
    opts: TimingOpts,
  ): SVGAnimateElement[] {
    target.setAttribute("pathLength", "1");

    const toState = DrawSVGPlugin.parseValue(toVal);
    const fromState = (() => {
      if (fromVal !== undefined) return DrawSVGPlugin.parseValue(fromVal);
      const da = target.getAttribute("stroke-dasharray");
      if (da !== null && da !== "none" && da !== "") {
        const dashLen = parseFloat(da);
        const dashoffset = parseFloat(target.getAttribute("stroke-dashoffset") ?? "0");
        const start = dashoffset < 0 ? -dashoffset : 0;
        return { start, end: Math.max(0, start + dashLen) };
      }
      return { start: 0, end: 1 };
    })();

    const from = DrawSVGPlugin.stateToAttrs(fromState);
    const to = DrawSVGPlugin.stateToAttrs(toState);

    return [
      SMILBuilder.animate({ attributeName: "stroke-dasharray",  from: from.dasharray,  to: to.dasharray,  ...opts }),
      SMILBuilder.animate({ attributeName: "stroke-dashoffset", from: from.dashoffset, to: to.dashoffset, ...opts }),
    ];
  }
}
