/// <reference lib="dom" />
import { describe, expect, it } from "bun:test";
import { resolveRotationOrigin } from "@/utils/transform-composer";
import { SVG_NS } from "@/utils/builders";

const makeSvgEl = (tag = "rect") => document.createElementNS(SVG_NS, tag);

describe("transform-composer (smoke)", () => {
  describe("resolveRotationOrigin", () => {
    it("SMOKE TEST: pixel origin survives across multiple calls with different elements", () => {
      const el1 = makeSvgEl("rect");
      const el2 = makeSvgEl("circle");
      const el3 = makeSvgEl("ellipse");

      expect(resolveRotationOrigin(el1, "30 45")).toEqual({ cx: 30, cy: 45 });
      expect(resolveRotationOrigin(el2, "100 200")).toEqual({ cx: 100, cy: 200 });
      expect(resolveRotationOrigin(el3, "0 0")).toEqual({ cx: 0, cy: 0 });
    });

    it("SMOKE TEST: decimal pixel values are preserved", () => {
      const result = resolveRotationOrigin(makeSvgEl(), "12.5 37.8");

      expect(result.cx).toBeCloseTo(12.5);
      expect(result.cy).toBeCloseTo(37.8);
    });

    it("SMOKE TEST: pixel transformOrigin works for all common SVG graphics element types", () => {
      for (const tag of ["rect", "circle", "ellipse", "path", "polygon", "line", "g"]) {
        const el = makeSvgEl(tag);
        const result = resolveRotationOrigin(el, "25 75");
        expect(result).toEqual({ cx: 25, cy: 75 });
      }
    });

    it("SMOKE TEST: asymmetric pixel origin is not swapped", () => {
      const result = resolveRotationOrigin(makeSvgEl(), "10 90");

      expect(result.cx).toBe(10);
      expect(result.cy).toBe(90);
    });

    it("SMOKE TEST: % transformOrigin falls back to 0 in happy-dom (getBBox returns empty box)", () => {
      // In a real browser with a rendered element, getBBox returns actual dimensions and
      // the % would resolve to a meaningful pixel value. happy-dom always returns zeros.
      const result = resolveRotationOrigin(makeSvgEl(), "50% 50%");

      expect(result).toEqual({ cx: 0, cy: 0 });
    });
  });
});
