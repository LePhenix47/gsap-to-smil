/// <reference lib="dom" />
import { describe, expect, it, spyOn } from "bun:test";
import { composeTransforms } from "@/utils/transform-composer";
import { SVG_NS } from "@/utils/builders";

const makeSvgEl = () => document.createElementNS(SVG_NS, "rect");

describe("transform-composer", () => {
  describe("composeTransforms", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: x+y → one translate element with correct from/to", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { x: 100, y: 50 },
        target,
        dur: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0].getAttribute("type")).toBe("translate");
      expect(result[0].getAttribute("from")).toBe("0 0");
      expect(result[0].getAttribute("to")).toBe("100 50");
    });

    it("HAPPY PATH: rotation → one rotate element; center falls back to 0 0 when not in DOM", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { rotation: 90 },
        target,
        dur: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0].getAttribute("type")).toBe("rotate");
      expect(result[0].getAttribute("from")).toBe("0 0 0");
      expect(result[0].getAttribute("to")).toBe("90 0 0");
    });

    it("HAPPY PATH: transformOrigin as pixel string is used as rotation center", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { rotation: 180 },
        fromTransforms: { rotation: 0 },
        target,
        transformOrigin: "40 60",
        dur: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0].getAttribute("from")).toBe("0 40 60");
      expect(result[0].getAttribute("to")).toBe("180 40 60");
    });

    it("HAPPY PATH: scale → one scale element with uniform from/to", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { scale: 2 },
        target,
        dur: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0].getAttribute("type")).toBe("scale");
      expect(result[0].getAttribute("from")).toBe("1 1");
      expect(result[0].getAttribute("to")).toBe("2 2");
    });

    it("HAPPY PATH: scaleX + scaleY → separate axis values in from/to", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { scaleX: 3, scaleY: 0.5 },
        fromTransforms: { scaleX: 1, scaleY: 1 },
        target,
        dur: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0].getAttribute("type")).toBe("scale");
      expect(result[0].getAttribute("from")).toBe("1 1");
      expect(result[0].getAttribute("to")).toBe("3 0.5");
    });

    it("HAPPY PATH: skewX → one skewX element", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { skewX: 30 },
        target,
        dur: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0].getAttribute("type")).toBe("skewX");
      expect(result[0].getAttribute("from")).toBe("0");
      expect(result[0].getAttribute("to")).toBe("30");
    });

    it("HAPPY PATH: skewY → one skewY element", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { skewY: 15 },
        target,
        dur: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0].getAttribute("type")).toBe("skewY");
      expect(result[0].getAttribute("from")).toBe("0");
      expect(result[0].getAttribute("to")).toBe("15");
    });

    it("HAPPY PATH: compound transforms are returned in canonical order (translate → rotate → scale)", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { x: 50, rotation: 45, scale: 2 },
        target,
        dur: 1,
      });

      expect(result).toHaveLength(3);
      expect(result[0].getAttribute("type")).toBe("translate");
      expect(result[1].getAttribute("type")).toBe("rotate");
      expect(result[2].getAttribute("type")).toBe("scale");
    });

    it("HAPPY PATH: all five types are returned in canonical order", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { x: 10, rotation: 30, scale: 1.5, skewX: 10, skewY: 5 },
        target,
        dur: 1,
      });

      expect(result).toHaveLength(5);
      expect(result[0].getAttribute("type")).toBe("translate");
      expect(result[1].getAttribute("type")).toBe("rotate");
      expect(result[2].getAttribute("type")).toBe("scale");
      expect(result[3].getAttribute("type")).toBe("skewX");
      expect(result[4].getAttribute("type")).toBe("skewY");
    });

    it("HAPPY PATH: fromTransforms omitted → from values default to zero / one", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { x: 80, scale: 3 },
        target,
        dur: 1,
      });

      const translateEl = result[0];
      const scaleEl = result[1];

      expect(translateEl.getAttribute("from")).toBe("0 0");
      expect(scaleEl.getAttribute("from")).toBe("1 1");
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

      for (const el of result) {
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

      for (const el of result) {
        expect(el.getAttribute("additive")).toBe("sum");
      }
    });

    // ===== EDGE CASES =====

    it("EDGE CASE: empty toTransforms → returns empty array", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: {},
        target,
        dur: 1,
      });

      expect(result).toHaveLength(0);
    });

    it("EDGE CASE: only y in toTransforms → still produces a translate element", () => {
      const target = makeSvgEl();

      const result = composeTransforms({
        toTransforms: { y: 30 },
        target,
        dur: 1,
      });

      expect(result).toHaveLength(1);
      expect(result[0].getAttribute("type")).toBe("translate");
      expect(result[0].getAttribute("to")).toBe("0 30");
    });

    it("EDGE CASE: rotationX/rotationY warns and produces no elements", () => {
      const target = makeSvgEl();
      const warnSpy = spyOn(console, "warn");

      const result = composeTransforms({
        toTransforms: { rotationX: 45 } as any,
        target,
        dur: 1,
      });

      expect(result).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("rotationX"),
      );

      warnSpy.mockRestore();
    });
  });
});
