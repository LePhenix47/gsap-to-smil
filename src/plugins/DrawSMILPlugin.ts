import type { DrawSVGValue } from "@/types/index.ts";
import type { AnimateOptions } from "@/types/builders.ts";
import { buildAnimate } from "@/utils/builders.ts";

type DrawState = { start: number; end: number };
type TimingOpts = Pick<AnimateOptions, "dur" | "delay" | "repeat" | "ease">;

const parseDrawSVGValue = (val: DrawSVGValue): DrawState => {
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
};

const stateToAttrs = (s: DrawState) => ({
  dasharray: `${Math.max(0, s.end - s.start)} 1`,
  dashoffset: s.start === 0 ? "0" : String(-s.start),
});

/**
 * Writes the DrawSVG state directly as element attributes.
 * Called by `smil.set()` (duration=0) so a subsequent `smil.to()` can read the
 * base attribute value as its implicit `from`.
 */
export const applyDrawSVGState = (target: Element, val: DrawSVGValue): void => {
  target.setAttribute("pathLength", "1");
  const state = parseDrawSVGValue(val);
  const attrs = stateToAttrs(state);
  target.setAttribute("stroke-dasharray", attrs.dasharray);
  target.setAttribute("stroke-dashoffset", attrs.dashoffset);
};

/**
 * Builds the two `<animate>` elements that implement DrawSVG in SMIL.
 *
 * Sets `pathLength="1"` on the target so all values are normalized fractions (0–1),
 * then emits `stroke-dasharray` (the visible length) and `stroke-dashoffset` (the start offset).
 *
 * `toVal`  — the target DrawSVG state (`true` = fully drawn, `false`/`0` = hidden,
 *             `"50%"` = first half, `"25% 75%"` = middle window).
 * `fromVal` — the starting DrawSVG state. When undefined, reads the element's current
 *             `stroke-dasharray`/`stroke-dashoffset` attributes (written by a prior
 *             `applyDrawSVGState` / `smil.set()`) and falls back to fully-drawn.
 */
export const buildDrawSVGAnimation = (
  target: Element,
  toVal: DrawSVGValue,
  fromVal: DrawSVGValue | undefined,
  opts: TimingOpts,
): SVGAnimateElement[] => {
  target.setAttribute("pathLength", "1");

  const toState = parseDrawSVGValue(toVal);
  const fromState = (() => {
    if (fromVal !== undefined) return parseDrawSVGValue(fromVal);
    const da = target.getAttribute("stroke-dasharray");
    if (da !== null && da !== "none" && da !== "") {
      const dashLen = parseFloat(da);
      const dashoffset = parseFloat(target.getAttribute("stroke-dashoffset") ?? "0");
      const start = dashoffset < 0 ? -dashoffset : 0;
      return { start, end: Math.max(0, start + dashLen) };
    }
    return { start: 0, end: 1 };
  })();

  const from = stateToAttrs(fromState);
  const to = stateToAttrs(toState);

  return [
    buildAnimate({ attributeName: "stroke-dasharray",  from: from.dasharray,  to: to.dasharray,  ...opts }),
    buildAnimate({ attributeName: "stroke-dashoffset", from: from.dashoffset, to: to.dashoffset, ...opts }),
  ];
};
