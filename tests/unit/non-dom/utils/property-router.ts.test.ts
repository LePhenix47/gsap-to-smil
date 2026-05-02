// fallow-ignore-file
import { expect, describe, it } from "bun:test";
import { routeProperties } from "@/utils/property-router.ts";

describe("property-router", () => {
  describe("routeProperties", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: routes transform keys to the transforms bucket", () => {
      const { transforms, direct, plugins } = routeProperties({
        x: 100,
        y: -40,
        rotation: 90,
        scale: 1.5,
        skewX: 10,
      });

      expect(transforms).toEqual({ x: 100, y: -40, rotation: 90, scale: 1.5, skewX: 10 });
      expect(direct).toEqual({});
      expect(plugins).toEqual({});
    });

    it("HAPPY PATH: routes direct SVG attribute keys to the direct bucket", () => {
      const { transforms, direct } = routeProperties({
        opacity: 0.5,
        fill: "#ff0000",
        stroke: "blue",
        strokeWidth: 2,
      });

      expect(direct).toEqual({ opacity: 0.5, fill: "#ff0000", stroke: "blue", strokeWidth: 2 });
      expect(transforms).toEqual({});
    });

    it("HAPPY PATH: special keys are captured in the special bucket with provided values", () => {
      const { special } = routeProperties({
        duration: 2,
        delay: 0.5,
        ease: "power2.inOut",
        repeat: 3,
        repeatDelay: 1,
      });

      expect(special.duration).toBe(2);
      expect(special.delay).toBe(0.5);
      expect(special.ease).toBe("power2.inOut");
      expect(special.repeat).toBe(3);
      expect(special.repeatDelay).toBe(1);
    });

    it("HAPPY PATH: routes plugin keys to the plugins bucket", () => {
      const { plugins, transforms, direct } = routeProperties({
        drawSVG: "0% 50%",
      });

      expect(plugins).toEqual({ drawSVG: "0% 50%" });
      expect(transforms).toEqual({});
      expect(direct).toEqual({});
    });

    it("HAPPY PATH: routes attr:{} contents to the attrs bucket", () => {
      const { attrs, transforms, direct } = routeProperties({
        attr: { cx: 50, r: 20 },
      });

      expect(attrs).toEqual({ cx: 50, r: 20 });
      expect(transforms).toEqual({});
      expect(direct).toEqual({});
    });

    it("HAPPY PATH: correctly splits mixed vars across all buckets simultaneously", () => {
      const { transforms, direct, special, attrs, plugins } = routeProperties({
        x: 100,
        opacity: 0.8,
        duration: 1.5,
        attr: { r: 30 },
        motionPath: "/path",
      });

      expect(transforms).toEqual({ x: 100 });
      expect(direct).toEqual({ opacity: 0.8 });
      expect(special.duration).toBe(1.5);
      expect(attrs).toEqual({ r: 30 });
      expect(plugins).toEqual({ motionPath: "/path" });
    });

    // ===== EDGE CASES =====

    it("EDGE CASE: empty vars produce empty transform/direct/attrs/plugin buckets and default special values", () => {
      const { transforms, direct, attrs, plugins, special } = routeProperties({});

      expect(transforms).toEqual({});
      expect(direct).toEqual({});
      expect(attrs).toEqual({});
      expect(plugins).toEqual({});

      // Defaults applied
      expect(special.duration).toBe(0.5);
      expect(special.delay).toBe(0);
      expect(special.ease).toBe("power1.out");
      expect(special.repeat).toBe(0);
      // TODO: add dedicated yoyo tests once yoyo is implemented in SMILTween
      expect(special.yoyo).toBe(false);
    });

    it("EDGE CASE: unknown key falls into the direct bucket as a best-effort SVG attribute", () => {
      const { direct, transforms } = routeProperties({
        "data-custom": "expected",
      } as never);

      expect(direct["data-custom"]).toBe("expected");
      expect(transforms).toEqual({});
    });

    it("EDGE CASE: attr:{} is deep-cloned — mutating the original does not affect the returned attrs", () => {
      const attrInput = { cx: 10 };
      const { attrs } = routeProperties({ attr: attrInput });

      attrInput.cx = 999;

      expect(attrs["cx"]).toBe(10);
    });

    it("EDGE CASE: special defaults fill in keys not present in vars", () => {
      const { special } = routeProperties({ duration: 2 });

      // duration was provided
      expect(special.duration).toBe(2);
      // everything else gets its default
      expect(special.delay).toBe(0);
      expect(special.repeat).toBe(0);
      expect(special.yoyo).toBe(false);
      expect(special.paused).toBe(false);
    });

    // ===== PENDING — yoyo not yet implemented in SMILTween =====

    it.todo("HAPPY PATH: yoyo: true routes to special bucket and SMILTween produces ping-pong animation");
    it.todo("HAPPY PATH: yoyo: false (default) produces a normal forward-only animation");
    it.todo("EDGE CASE: yoyoEase overrides the return-trip ease when yoyo is active");
  });
});
