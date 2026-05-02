/// <reference lib="dom" />
// fallow-ignore-file
import { describe, expect, it } from "bun:test";
import {
  buildAnimate,
  buildAnimateTransform,
  buildSet,
  injectInto,
} from "@/utils/builders";

import { SVG_NS } from "@/utils/builders";

describe("builders", () => {
  describe("buildAnimate", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: creates an <animate> element", () => {
      const result = buildAnimate({
        attributeName: "opacity",
        to: "0.5",
        dur: 1,
      });
      const expected = "animate";

      expect(result.tagName.toLowerCase()).toBe(expected);
    });

    it("HAPPY PATH: sets attributeName, to, dur, and fill=freeze by default", () => {
      const result = buildAnimate({
        attributeName: "opacity",
        to: "0.5",
        dur: 1,
      });

      expect(result.getAttribute("attributeName")).toBe("opacity");
      expect(result.getAttribute("to")).toBe("0.5");
      expect(result.getAttribute("dur")).toBe("1s");
      expect(result.getAttribute("fill")).toBe("freeze");
    });

    it("HAPPY PATH: sets both from and to when both are provided", () => {
      const result = buildAnimate({
        attributeName: "fill",
        from: "red",
        to: "blue",
        dur: 1,
      });

      expect(result.getAttribute("from")).toBe("red");
      expect(result.getAttribute("to")).toBe("blue");
    });

    it("HAPPY PATH: uses values attribute instead of from/to when provided", () => {
      const result = buildAnimate({
        attributeName: "opacity",
        values: "0; 0.5; 1",
        dur: 1,
      });

      expect(result.getAttribute("values")).toBe("0; 0.5; 1");
      expect(result.getAttribute("from")).toBeNull();
      expect(result.getAttribute("to")).toBeNull();
    });

    it("HAPPY PATH: sets begin attribute from delay", () => {
      const delay = 0.5;

      const result = buildAnimate({
        attributeName: "opacity",
        to: "0",
        dur: 1,
        delay,
      });
      const expected = `${delay}s`;

      expect(result.getAttribute("begin")).toBe(expected);
    });

    it("HAPPY PATH: GSAP repeat:N maps to SMIL repeatCount:N+1", () => {
      const gsapRepeat = 2;

      const result = buildAnimate({
        attributeName: "opacity",
        to: "0",
        dur: 1,
        repeat: gsapRepeat,
      });
      const expected = String(gsapRepeat + 1);

      expect(result.getAttribute("repeatCount")).toBe(expected);
    });

    it("HAPPY PATH: GSAP repeat:-1 maps to SMIL repeatCount=indefinite", () => {
      const result = buildAnimate({
        attributeName: "opacity",
        to: "0",
        dur: 1,
        repeat: -1,
      });
      const expected = "indefinite";

      expect(result.getAttribute("repeatCount")).toBe(expected);
    });

    it("HAPPY PATH: cubic bezier ease sets calcMode=spline with keyTimes and keySplines", () => {
      const result = buildAnimate({
        attributeName: "opacity",
        to: "0",
        dur: 1,
        ease: "power1.out",
      });

      expect(result.getAttribute("calcMode")).toBe("spline");
      expect(result.getAttribute("keySplines")).not.toBeNull();
      expect(result.getAttribute("keyTimes")).not.toBeNull();
    });

    it("HAPPY PATH: ease=none sets calcMode=linear with no keySplines", () => {
      const result = buildAnimate({
        attributeName: "opacity",
        to: "0",
        dur: 1,
        ease: "none",
      });

      expect(result.getAttribute("calcMode")).toBe("linear");
      expect(result.getAttribute("keySplines")).toBeNull();
    });

    // ===== EDGE CASES =====

    it("EDGE CASE: delay=0 does not emit a begin attribute", () => {
      const result = buildAnimate({
        attributeName: "opacity",
        to: "0",
        dur: 1,
        delay: 0,
      });

      expect(result.getAttribute("begin")).toBeNull();
    });

    it("EDGE CASE: repeat=0 does not emit a repeatCount attribute", () => {
      const result = buildAnimate({
        attributeName: "opacity",
        to: "0",
        dur: 1,
        repeat: 0,
      });

      expect(result.getAttribute("repeatCount")).toBeNull();
    });

  });

  describe("buildAnimateTransform", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: creates an <animateTransform> element", () => {
      const result = buildAnimateTransform({
        type: "translate",
        from: "0 0",
        to: "100 0",
        dur: 1,
      });
      const expected = "animatetransform";

      expect(result.tagName.toLowerCase()).toBe(expected);
    });

    it("HAPPY PATH: always sets attributeName=transform, attributeType=XML, and additive=sum", () => {
      const result = buildAnimateTransform({
        type: "translate",
        from: "0 0",
        to: "100 0",
        dur: 1,
      });

      expect(result.getAttribute("attributeName")).toBe("transform");
      expect(result.getAttribute("attributeType")).toBe("XML");
      expect(result.getAttribute("additive")).toBe("sum");
    });

    it("HAPPY PATH: sets the transform type", () => {
      const transformType = "rotate";

      const result = buildAnimateTransform({
        type: transformType,
        from: "0 60 60",
        to: "360 60 60",
        dur: 2,
      });
      const expected = transformType;

      expect(result.getAttribute("type")).toBe(expected);
    });

    it("HAPPY PATH: additive can be overridden from the default sum", () => {
      const result = buildAnimateTransform({
        type: "translate",
        from: "0 0",
        to: "100 0",
        dur: 1,
        additive: "replace",
      });
      const expected = "replace";

      expect(result.getAttribute("additive")).toBe(expected);
    });

    // ===== EDGE CASES =====

    it("EDGE CASE: GSAP repeat:1 maps to SMIL repeatCount:2", () => {
      const gsapRepeat = 1;

      const result = buildAnimateTransform({
        type: "translate",
        from: "0 0",
        to: "100 0",
        dur: 1,
        repeat: gsapRepeat,
      });
      const expected = String(gsapRepeat + 1);

      expect(result.getAttribute("repeatCount")).toBe(expected);
    });

  });

  describe("buildSet", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: creates a <set> element", () => {
      const result = buildSet("opacity", "0");
      const expected = "set";

      expect(result.tagName.toLowerCase()).toBe(expected);
    });

    it("HAPPY PATH: sets attributeName and to", () => {
      const result = buildSet("fill", "red");

      expect(result.getAttribute("attributeName")).toBe("fill");
      expect(result.getAttribute("to")).toBe("red");
    });

    it("HAPPY PATH: sets begin when a delay is provided", () => {
      const delay = 1.5;

      const result = buildSet("opacity", "0", delay);
      const expected = `${delay}s`;

      expect(result.getAttribute("begin")).toBe(expected);
    });

    // ===== EDGE CASES =====

    it("EDGE CASE: no delay argument produces no begin attribute", () => {
      const result = buildSet("opacity", "0");

      expect(result.getAttribute("begin")).toBeNull();
    });

    it("EDGE CASE: delay=0 produces no begin attribute", () => {
      const result = buildSet("opacity", "0", 0);

      expect(result.getAttribute("begin")).toBeNull();
    });
  });

  describe("injectInto", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: appends a single animation element as a child of the target", () => {
      const target = document.createElementNS(SVG_NS, "circle");
      const anim = buildAnimate({ attributeName: "opacity", to: "0", dur: 1 });

      injectInto(target, anim);

      expect(target.childElementCount).toBe(1);
      expect(target.firstElementChild).toBe(anim);
    });

    it("HAPPY PATH: appends multiple animations in order", () => {
      const target = document.createElementNS(SVG_NS, "rect");
      const anim1 = buildAnimate({ attributeName: "opacity", to: "0", dur: 1 });
      const anim2 = buildAnimateTransform({
        type: "translate",
        from: "0 0",
        to: "100 0",
        dur: 1,
      });

      injectInto(target, anim1, anim2);

      expect(target.childElementCount).toBe(2);
      expect(target.firstElementChild).toBe(anim1);
      expect(target.lastElementChild).toBe(anim2);
    });

    // ===== EDGE CASES =====

    it("EDGE CASE: calling with no animations leaves the target unchanged", () => {
      const target = document.createElementNS(SVG_NS, "circle");

      injectInto(target);

      expect(target.childElementCount).toBe(0);
    });
  });
});
