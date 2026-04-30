/// <reference lib="dom" />
import { describe, expect, it, spyOn } from "bun:test";
import { composeTransforms, resolveOrigin } from "@/utils/transform-composer";
import { SVG_NS } from "@/utils/builders";

const makeSvgEl = () => document.createElementNS(SVG_NS, "rect");

describe("transform-composer", () => {
  describe("composeTransforms", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: x+y → outerAnims has one translate, no wrapper needed", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { x: 100, y: 50 },
        target,
        dur: 1,
      });

      expect(result.needsWrapper).toBe(false);
      expect(result.outerAnims).toHaveLength(1);
      expect(result.innerAnims).toHaveLength(0);
      expect(result.outerAnims[0].getAttribute("type")).toBe("translate");
      expect(result.outerAnims[0].getAttribute("from")).toBe("0 0");
      expect(result.outerAnims[0].getAttribute("to")).toBe("100 50");
    });

    it("HAPPY PATH: rotation → outerAnims has one rotate, center falls back to 0 0 when not in DOM", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { rotation: 90 },
        target,
        dur: 1,
      });

      expect(result.needsWrapper).toBe(false);
      expect(result.outerAnims).toHaveLength(1);
      expect(result.outerAnims[0].getAttribute("type")).toBe("rotate");
      expect(result.outerAnims[0].getAttribute("from")).toBe("0 0 0");
      expect(result.outerAnims[0].getAttribute("to")).toBe("90 0 0");
    });

    it("HAPPY PATH: transformOrigin as pixel string with rotation — passes through as-is when element is unrendered (bbox zero in happy-dom)", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { rotation: 180 },
        fromTransforms: { rotation: 0 },
        target,
        transformOrigin: "40 60",
        dur: 1,
      });

      // happy-dom getBBox() → {x:0,y:0,...} so offset+px = 0+px = px.
      // In a real browser with the element at (bx,by), cx would be bx+40, cy would be by+60.
      expect(result.needsWrapper).toBe(false);
      expect(result.outerAnims).toHaveLength(1);
      expect(result.outerAnims[0].getAttribute("from")).toBe("0 40 60");
      expect(result.outerAnims[0].getAttribute("to")).toBe("180 40 60");
    });

    it("HAPPY PATH: scale → wrapper mode; scale goes to innerAnims, no compensating translate", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { scale: 2 },
        target,
        dur: 1,
      });

      // Scale triggers wrapper mode — the pivot scaffold handles origin, no translate compensation.
      expect(result.needsWrapper).toBe(true);
      expect(result.outerAnims).toHaveLength(0);
      expect(result.innerAnims).toHaveLength(1);
      expect(result.innerAnims[0].getAttribute("type")).toBe("scale");
      expect(result.innerAnims[0].getAttribute("from")).toBe("1 1");
      expect(result.innerAnims[0].getAttribute("to")).toBe("2 2");
    });

    it("HAPPY PATH: scaleX + scaleY → wrapper mode; scale in innerAnims", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { scaleX: 3, scaleY: 0.5 },
        fromTransforms: { scaleX: 1, scaleY: 1 },
        target,
        dur: 1,
      });

      expect(result.needsWrapper).toBe(true);
      expect(result.outerAnims).toHaveLength(0);
      expect(result.innerAnims).toHaveLength(1);
      expect(result.innerAnims[0].getAttribute("type")).toBe("scale");
      expect(result.innerAnims[0].getAttribute("from")).toBe("1 1");
      expect(result.innerAnims[0].getAttribute("to")).toBe("3 0.5");
    });

    it("HAPPY PATH: skewX → wrapper mode; skewX in innerAnims", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { skewX: 30 },
        target,
        dur: 1,
      });

      expect(result.needsWrapper).toBe(true);
      expect(result.outerAnims).toHaveLength(0);
      expect(result.innerAnims).toHaveLength(1);
      expect(result.innerAnims[0].getAttribute("type")).toBe("skewX");
      expect(result.innerAnims[0].getAttribute("from")).toBe("0");
      expect(result.innerAnims[0].getAttribute("to")).toBe("30");
    });

    it("HAPPY PATH: skewY → wrapper mode; skewY in innerAnims", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { skewY: 15 },
        target,
        dur: 1,
      });

      expect(result.needsWrapper).toBe(true);
      expect(result.outerAnims).toHaveLength(0);
      expect(result.innerAnims).toHaveLength(1);
      expect(result.innerAnims[0].getAttribute("type")).toBe("skewY");
      expect(result.innerAnims[0].getAttribute("from")).toBe("0");
      expect(result.innerAnims[0].getAttribute("to")).toBe("15");
    });

    it("HAPPY PATH: compound transforms are split in canonical order (translate → rotate → scale)", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { x: 50, rotation: 45, scale: 2 },
        target,
        dur: 1,
      });

      // translate → outer lane; rotate + scale → inner pivot group
      const allAnims = [...result.outerAnims, ...result.innerAnims];
      expect(result.needsWrapper).toBe(true);
      expect(allAnims).toHaveLength(3);
      expect(allAnims[0].getAttribute("type")).toBe("translate");
      expect(allAnims[1].getAttribute("type")).toBe("rotate");
      expect(allAnims[2].getAttribute("type")).toBe("scale");
    });

    it("HAPPY PATH: all five types are split in canonical order", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { x: 10, rotation: 30, scale: 1.5, skewX: 10, skewY: 5 },
        target,
        dur: 1,
      });

      const allAnims = [...result.outerAnims, ...result.innerAnims];
      expect(result.needsWrapper).toBe(true);
      expect(allAnims).toHaveLength(5);
      expect(allAnims[0].getAttribute("type")).toBe("translate");
      expect(allAnims[1].getAttribute("type")).toBe("rotate");
      expect(allAnims[2].getAttribute("type")).toBe("scale");
      expect(allAnims[3].getAttribute("type")).toBe("skewX");
      expect(allAnims[4].getAttribute("type")).toBe("skewY");
    });

    it("HAPPY PATH: fromTransforms omitted → from values default to zero / one", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { x: 80, scale: 3 },
        target,
        dur: 1,
      });

      // translate in outerAnims, scale in innerAnims
      expect(result.outerAnims[0].getAttribute("from")).toBe("0 0");
      expect(result.innerAnims[0].getAttribute("from")).toBe("1 1");
    });

    it("HAPPY PATH: timing options are forwarded to every element", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { x: 50, scale: 2 },
        target,
        dur: 2,
        delay: 0.5,
        repeat: 1,
        ease: "power1.out",
      });

      const allAnims = [...result.outerAnims, ...result.innerAnims];
      for (const el of allAnims) {
        expect(el.getAttribute("dur")).toBe("2s");
        expect(el.getAttribute("begin")).toBe("0.5s");
        expect(el.getAttribute("repeatCount")).toBe("2");
        expect(el.getAttribute("calcMode")).toBe("spline");
      }
    });

    it("HAPPY PATH: every element has additive=sum", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { x: 10, rotation: 45, scale: 2 },
        target,
        dur: 1,
      });

      const allAnims = [...result.outerAnims, ...result.innerAnims];
      for (const el of allAnims) {
        expect(el.getAttribute("additive")).toBe("sum");
      }
    });

    // ===== EDGE CASES =====

    it("EDGE CASE: empty toTransforms → outerAnims and innerAnims are both empty", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: {},
        target,
        dur: 1,
      });

      expect(result.outerAnims).toHaveLength(0);
      expect(result.innerAnims).toHaveLength(0);
    });

    it("EDGE CASE: only y in toTransforms → still produces a translate element in outerAnims", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { y: 30 },
        target,
        dur: 1,
      });

      expect(result.needsWrapper).toBe(false);
      expect(result.outerAnims).toHaveLength(1);
      expect(result.outerAnims[0].getAttribute("type")).toBe("translate");
      expect(result.outerAnims[0].getAttribute("to")).toBe("0 30");
    });

    it("EDGE CASE: transformOrigin with % resolves to 0 when element is unrendered — happy-dom getBBox returns zeros so offset+pct*dim = 0", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { rotation: 90 },
        target,
        transformOrigin: "50% 50%",
        dur: 1,
      });

      // happy-dom getBBox() → {x:0,y:0,width:0,height:0} → cx = 0+0.5*0 = 0, cy = 0+0.5*0 = 0.
      // In a real browser the element center would be used. Visual coverage: no-plugins.html.
      expect(result.outerAnims[0].getAttribute("from")).toBe("0 0 0");
      expect(result.outerAnims[0].getAttribute("to")).toBe("90 0 0");
    });

    it("EDGE CASE: rotationX/rotationY warns and produces no elements", () => {
      const target = makeSvgEl();
      const warnSpy = spyOn(console, "warn");

      const result = composeTransforms({
        toTransforms: { rotationX: 45 } as any,
        target,
        dur: 1,
      });

      const allAnims = [...result.outerAnims, ...result.innerAnims];
      expect(allAnims).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("rotationX"),
      );

      warnSpy.mockRestore();
    });
  });

  describe("resolveOrigin", () => {
    // ===== HAPPY PATHS =====

    // NOTE: happy-dom's getBBox() always returns {x:0,y:0,width:0,height:0} regardless of
    // element attributes or DOM attachment. All tests here operate on unrendered elements,
    // so offset+px = 0+px = px. Real bbox-aware behavior (cx = bbox.x + px) is exercised
    // visually in tests/integration/no-plugins.html.

    it("HAPPY PATH: two pixel values — passes through as-is when bbox is zero (unrendered element)", () => {
      const result = resolveOrigin(makeSvgEl(), "40 60");

      expect(result).toEqual({ cx: 40, cy: 60 });
    });

    it("HAPPY PATH: single pixel value → both axes use that value", () => {
      const result = resolveOrigin(makeSvgEl(), "50");

      expect(result).toEqual({ cx: 50, cy: 50 });
    });

    it("HAPPY PATH: negative pixel values are accepted", () => {
      const result = resolveOrigin(makeSvgEl(), "-10 -20");

      expect(result).toEqual({ cx: -10, cy: -20 });
    });

    it("HAPPY PATH: no transformOrigin → getBBoxCenter; returns {0,0} for unrendered element", () => {
      const result = resolveOrigin(makeSvgEl());

      expect(result).toEqual({ cx: 0, cy: 0 });
    });

    // ===== EDGE CASES =====

    it("EDGE CASE: % transformOrigin resolves to 0 for unrendered element (bbox dimensions are zero)", () => {
      const result = resolveOrigin(makeSvgEl(), "50% 50%");

      // cx = 0 + 0.5*0 = 0, cy = 0 + 0.5*0 = 0
      expect(result).toEqual({ cx: 0, cy: 0 });
    });

    it("EDGE CASE: non-SVGGraphicsElement with no transformOrigin → warns and returns {0, 0}", () => {
      const el = document.createElement("div"); // definitely not SVGGraphicsElement
      const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

      const result = resolveOrigin(el);

      expect(result).toEqual({ cx: 0, cy: 0 });
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });
});
