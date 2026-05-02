// fallow-ignore-next-line
/// <reference lib="dom" />
import { describe, expect, it } from "bun:test";
import { resolveOrigin } from "@/utils/transform-composer";
import { SVG_NS } from "@/utils/builders";

const makeSvgEl = (tag = "rect") => document.createElementNS(SVG_NS, tag);

/*
 * NOTE: happy-dom's getBBox() always returns {x:0,y:0,width:0,height:0}.
 * Pixel values appear to pass through unchanged because offset(0) + px = px.
 * Real-browser bbox-offset behaviour (cx = bbox.x + px) is covered visually
 * in tests/integration/no-plugins.html section 3.
 * I've actually created a bug report on the happy-dom GitHub: https://github.com/capricorn86/happy-dom/issues/2145
 */

describe("transform-composer (smoke)", () => {
  describe("resolveOrigin", () => {
    it("SMOKE TEST: pixel origin is consistent across multiple element types (unrendered — bbox zero)", () => {
      const el1 = makeSvgEl("rect");
      const el2 = makeSvgEl("circle");
      const el3 = makeSvgEl("ellipse");

      expect(resolveOrigin(el1, "30 45")).toEqual({ cx: 30, cy: 45 });
      expect(resolveOrigin(el2, "100 200")).toEqual({
        cx: 100,
        cy: 200,
      });
      expect(resolveOrigin(el3, "0 0")).toEqual({ cx: 0, cy: 0 });
    });

    it("SMOKE TEST: decimal pixel values are preserved", () => {
      const result = resolveOrigin(makeSvgEl(), "12.5 37.8");

      expect(result.cx).toBeCloseTo(12.5);
      expect(result.cy).toBeCloseTo(37.8);
    });

    it("SMOKE TEST: pixel transformOrigin accepted for all common SVG graphics element types", () => {
      for (const tag of [
        "rect",
        "circle",
        "ellipse",
        "path",
        "polygon",
        "line",
        "g",
      ]) {
        const el = makeSvgEl(tag);
        const result = resolveOrigin(el, "25 75");
        expect(result).toEqual({ cx: 25, cy: 75 });
      }
    });

    it("SMOKE TEST: asymmetric pixel origin is not swapped", () => {
      const result = resolveOrigin(makeSvgEl(), "10 90");

      expect(result.cx).toBe(10);
      expect(result.cy).toBe(90);
    });

    it("SMOKE TEST: % transformOrigin returns 0 for unrendered element (happy-dom getBBox returns zeros)", () => {
      const result = resolveOrigin(makeSvgEl(), "50% 50%");

      expect(result).toEqual({ cx: 0, cy: 0 });
    });
  });
});
