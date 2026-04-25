/// <reference lib="dom" />
import { describe, expect, it, spyOn } from "bun:test";
import { SMILTween } from "@/core/SMILTween.ts";
import { SVG_NS } from "@/utils/builders.ts";

const makeEl = (tag = "rect") => document.createElementNS(SVG_NS, tag);

describe("SMILTween", () => {
  describe("target resolution", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: single Element → _targets has one entry", () => {
      const target = makeEl();

      const tween = new SMILTween(target, { opacity: 1, duration: 1 });

      expect(tween._targets).toHaveLength(1);
      expect(tween._targets[0]).toBe(target);
    });

    it("HAPPY PATH: CSS selector string → queries document and resolves targets", () => {
      const el = makeEl("circle");
      el.setAttribute("class", "smil-test-target");
      document.body.appendChild(el);

      const tween = new SMILTween(".smil-test-target", { opacity: 1, duration: 1 });

      expect(tween._targets).toHaveLength(1);
      expect(tween._targets[0]).toBe(el);

      el.remove();
    });

    it("HAPPY PATH: Array of Elements → all are resolved", () => {
      const el1 = makeEl();
      const el2 = makeEl();

      const tween = new SMILTween([el1, el2], { opacity: 1, duration: 1 });

      expect(tween._targets).toHaveLength(2);
    });

    it("HAPPY PATH: NodeList → flattened into _targets", () => {
      const el1 = makeEl("circle");
      const el2 = makeEl("circle");
      el1.setAttribute("class", "smil-nodelist-test");
      el2.setAttribute("class", "smil-nodelist-test");
      document.body.appendChild(el1);
      document.body.appendChild(el2);

      const nodeList = document.querySelectorAll(".smil-nodelist-test");
      const tween = new SMILTween(nodeList, { opacity: 1, duration: 1 });

      expect(tween._targets).toHaveLength(2);

      el1.remove();
      el2.remove();
    });
  });

  describe("build — direct properties", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: to() — injects one <animate> per direct property", () => {
      const target = makeEl();

      new SMILTween(target, { opacity: 0.5, duration: 1 });

      const anim = target.querySelector("animate");
      expect(anim).not.toBeNull();
      expect(anim!.getAttribute("attributeName")).toBe("opacity");
      expect(anim!.getAttribute("to")).toBe("0.5");
    });

    it("HAPPY PATH: from() — <animate> has from set and no to", () => {
      const target = makeEl();

      new SMILTween(target, { opacity: 0, duration: 1 }, null, true);

      const anim = target.querySelector("animate");
      expect(anim!.getAttribute("from")).toBe("0");
      expect(anim!.getAttribute("to")).toBeNull();
    });

    it("HAPPY PATH: fromTo() — <animate> has both from and to", () => {
      const target = makeEl();

      new SMILTween(
        target,
        { opacity: 1, duration: 1 },
        { opacity: 0 },
      );

      const anim = target.querySelector("animate");
      expect(anim!.getAttribute("from")).toBe("0");
      expect(anim!.getAttribute("to")).toBe("1");
    });

    it("HAPPY PATH: multiple direct properties → one <animate> per property", () => {
      const target = makeEl();

      new SMILTween(target, { opacity: 0, fill: "blue", duration: 1 });

      const anims = target.querySelectorAll("animate");
      expect(anims).toHaveLength(2);
    });
  });

  describe("build — transform properties", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: single transform → one <animateTransform> injected", () => {
      const target = makeEl();

      new SMILTween(target, { x: 100, duration: 1 });

      const animTransforms = target.querySelectorAll("animateTransform");
      expect(animTransforms).toHaveLength(1);
      expect(animTransforms[0]!.getAttribute("type")).toBe("translate");
    });

    it("HAPPY PATH: compound transforms → one <animateTransform> per type in canonical order", () => {
      const target = makeEl();

      new SMILTween(target, { x: 50, rotation: 45, scale: 2, duration: 1 });

      const animTransforms = target.querySelectorAll("animateTransform");
      expect(animTransforms).toHaveLength(3);
      expect(animTransforms[0]!.getAttribute("type")).toBe("translate");
      expect(animTransforms[1]!.getAttribute("type")).toBe("rotate");
      expect(animTransforms[2]!.getAttribute("type")).toBe("scale");
    });

    it("HAPPY PATH: from() with transform → animates from given value to identity", () => {
      const target = makeEl();

      new SMILTween(target, { x: 100, duration: 1 }, null, true);

      const animTransform = target.querySelector("animateTransform");
      expect(animTransform!.getAttribute("from")).toBe("100 0");
      expect(animTransform!.getAttribute("to")).toBe("0 0");
    });
  });

  describe("build — initialization", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: _initialized is true after construction", () => {
      const target = makeEl();

      const tween = new SMILTween(target, { opacity: 1, duration: 1 });

      expect(tween._initialized).toBe(true);
    });

    it("HAPPY PATH: _elements contains all injected animation elements", () => {
      const target = makeEl();

      const tween = new SMILTween(target, { x: 10, opacity: 0.5, duration: 1 });

      expect(tween._elements.length).toBeGreaterThan(0);
      expect(target.childElementCount).toBe(tween._elements.length);
    });

    it("HAPPY PATH: multiple targets → each gets its own injected elements", () => {
      const el1 = makeEl();
      const el2 = makeEl();

      new SMILTween([el1, el2], { opacity: 0, duration: 1 });

      expect(el1.childElementCount).toBe(1);
      expect(el2.childElementCount).toBe(1);
    });
  });

  describe("kill()", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: removes all injected elements from the DOM", () => {
      const target = makeEl();
      const tween = new SMILTween(target, { opacity: 0, duration: 1 });

      tween.kill();

      expect(target.childElementCount).toBe(0);
    });

    it("HAPPY PATH: empties _elements array", () => {
      const target = makeEl();
      const tween = new SMILTween(target, { opacity: 0, duration: 1 });

      tween.kill();

      expect(tween._elements).toHaveLength(0);
    });

    it("HAPPY PATH: sets _initialized to false", () => {
      const target = makeEl();
      const tween = new SMILTween(target, { opacity: 0, duration: 1 });

      tween.kill();

      expect(tween._initialized).toBe(false);
    });

    it("HAPPY PATH: returns this for chaining", () => {
      const target = makeEl();
      const tween = new SMILTween(target, { opacity: 0, duration: 1 });

      const result = tween.kill();

      expect(result).toBe(tween);
    });
  });

  describe("revert()", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: restores a previously set attribute to its original value", () => {
      const target = makeEl();
      target.setAttribute("opacity", "0.8");

      const tween = new SMILTween(target, { opacity: 0, duration: 1 });
      tween.revert();

      expect(target.getAttribute("opacity")).toBe("0.8");
    });

    it("HAPPY PATH: removes an attribute that was not originally present", () => {
      const target = makeEl();

      const tween = new SMILTween(target, { opacity: 0, duration: 1 });
      tween.revert();

      expect(target.getAttribute("opacity")).toBeNull();
    });

    it("HAPPY PATH: also removes injected SMIL elements", () => {
      const target = makeEl();
      const tween = new SMILTween(target, { opacity: 0, duration: 1 });

      tween.revert();

      expect(target.childElementCount).toBe(0);
    });
  });

  describe("yoyo warning", () => {
    it("EDGE CASE: yoyo:true emits a console warning", () => {
      const target = makeEl();
      const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

      new SMILTween(target, { opacity: 0, duration: 1, yoyo: true });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("yoyo"),
      );

      warnSpy.mockRestore();
    });
  });
});
