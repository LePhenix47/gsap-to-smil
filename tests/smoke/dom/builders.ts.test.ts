/// <reference lib="dom" />
import { describe, expect, it } from "bun:test";
import { buildAnimate, buildAnimateTransform } from "@/utils/builders";

describe("builders (smoke)", () => {
  describe("buildAnimate", () => {
    it("SMOKE TEST: repeat:-1 + ease + delay + dur do not corrupt each other", () => {
      const result = buildAnimate({
        attributeName: "opacity",
        to: "0",
        dur: 2,
        repeat: -1,
        ease: "power1.out",
        delay: 0.5,
      });

      expect(result.getAttribute("repeatCount")).toBe("indefinite");
      expect(result.getAttribute("dur")).toBe("2s");
      expect(result.getAttribute("fill")).toBe("freeze");
      expect(result.getAttribute("begin")).toBe("0.5s");
      expect(result.getAttribute("calcMode")).toBe("spline");
      expect(result.getAttribute("keySplines")).not.toBeNull();
      expect(result.getAttribute("keyTimes")).not.toBeNull();
    });

    it("SMOKE TEST: repeat:N + ease + from/to sets all spline attributes alongside repeat", () => {
      const gsapRepeat = 3;

      const result = buildAnimate({
        attributeName: "fill",
        from: "red",
        to: "blue",
        dur: 1.5,
        repeat: gsapRepeat,
        ease: "power2.inOut",
      });

      expect(result.getAttribute("repeatCount")).toBe(String(gsapRepeat + 1));
      expect(result.getAttribute("from")).toBe("red");
      expect(result.getAttribute("to")).toBe("blue");
      expect(result.getAttribute("dur")).toBe("1.5s");
      expect(result.getAttribute("calcMode")).toBe("spline");
      expect(result.getAttribute("keySplines")).not.toBeNull();
      expect(result.getAttribute("keyTimes")).not.toBeNull();
    });

    it("SMOKE TEST: values + ease + delay — values wins over from/to, spline attrs still set", () => {
      const result = buildAnimate({
        attributeName: "opacity",
        values: "0; 0.5; 1",
        dur: 2,
        ease: "power1.in",
        delay: 1,
      });

      expect(result.getAttribute("values")).toBe("0; 0.5; 1");
      expect(result.getAttribute("from")).toBeNull();
      expect(result.getAttribute("to")).toBeNull();
      expect(result.getAttribute("begin")).toBe("1s");
      expect(result.getAttribute("calcMode")).toBe("spline");
    });

    it("SMOKE TEST: ease=none + repeat + delay — linear calcMode, no keySplines, correct repeat and begin", () => {
      const gsapRepeat = 1;

      const result = buildAnimate({
        attributeName: "opacity",
        to: "1",
        dur: 0.8,
        ease: "none",
        repeat: gsapRepeat,
        delay: 0.2,
      });

      expect(result.getAttribute("calcMode")).toBe("linear");
      expect(result.getAttribute("keySplines")).toBeNull();
      expect(result.getAttribute("repeatCount")).toBe(String(gsapRepeat + 1));
      expect(result.getAttribute("begin")).toBe("0.2s");
      expect(result.getAttribute("dur")).toBe("0.8s");
    });
  });

  describe("buildAnimateTransform", () => {
    it("SMOKE TEST: fixed attrs (attributeName, attributeType, additive) survive alongside repeat + ease + delay", () => {
      const gsapRepeat = 2;

      const result = buildAnimateTransform({
        type: "rotate",
        from: "0 60 60",
        to: "360 60 60",
        dur: 2,
        repeat: gsapRepeat,
        ease: "power1.out",
        delay: 0.5,
      });

      expect(result.getAttribute("attributeName")).toBe("transform");
      expect(result.getAttribute("attributeType")).toBe("XML");
      expect(result.getAttribute("additive")).toBe("sum");
      expect(result.getAttribute("type")).toBe("rotate");
      expect(result.getAttribute("repeatCount")).toBe(String(gsapRepeat + 1));
      expect(result.getAttribute("begin")).toBe("0.5s");
      expect(result.getAttribute("calcMode")).toBe("spline");
    });

    it("SMOKE TEST: additive=replace + repeat:-1 + ease=none — override and linear calcMode coexist", () => {
      const result = buildAnimateTransform({
        type: "scale",
        from: "1",
        to: "2",
        dur: 1,
        additive: "replace",
        repeat: -1,
        ease: "none",
      });

      expect(result.getAttribute("additive")).toBe("replace");
      expect(result.getAttribute("repeatCount")).toBe("indefinite");
      expect(result.getAttribute("calcMode")).toBe("linear");
      expect(result.getAttribute("keySplines")).toBeNull();
      expect(result.getAttribute("dur")).toBe("1s");
      expect(result.getAttribute("type")).toBe("scale");
    });
  });
});
