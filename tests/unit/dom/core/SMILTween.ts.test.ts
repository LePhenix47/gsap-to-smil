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

  describe("yoyo", () => {
    it("HAPPY PATH: repeat:0 + yoyo → single play, no encoding applied (yoyo invisible)", () => {
      const target = makeEl();
      target.setAttribute("opacity", "1");

      new SMILTween(target, { opacity: 0, duration: 1, yoyo: true });

      const anim = target.querySelector("animate")!;
      // repeat:0 → totalPlays=1 → _applyYoyoEncoding returns early → still uses from/to
      expect(anim.getAttribute("to")).toBe("0");
      expect(anim.getAttribute("values")).toBeNull();
    });

    it("HAPPY PATH: repeat:1 + yoyo → values encodes one yoyo cycle, dur doubled, repeatCount=1", () => {
      const target = makeEl();
      target.setAttribute("opacity", "1");

      new SMILTween(target, { opacity: 0, duration: 1, repeat: 1, yoyo: true });

      const anim = target.querySelector("animate")!;
      expect(anim.getAttribute("values")).toBe("1; 0; 1");
      expect(anim.getAttribute("dur")).toBe("2s");
      expect(anim.getAttribute("repeatCount")).toBe("1");
      expect(anim.getAttribute("from")).toBeNull();
      expect(anim.getAttribute("to")).toBeNull();
    });

    it("HAPPY PATH: repeat:-1 + yoyo → values encodes one cycle, repeatCount=indefinite", () => {
      const target = makeEl();
      target.setAttribute("opacity", "1");

      new SMILTween(target, { opacity: 0, duration: 1, repeat: -1, yoyo: true });

      const anim = target.querySelector("animate")!;
      expect(anim.getAttribute("values")).toBe("1; 0; 1");
      expect(anim.getAttribute("dur")).toBe("2s");
      expect(anim.getAttribute("repeatCount")).toBe("indefinite");
    });

    it("HAPPY PATH: repeat:3 + yoyo (4 plays, even) → two clean yoyo cycles, repeatCount=2", () => {
      const target = makeEl();
      target.setAttribute("opacity", "1");

      new SMILTween(target, { opacity: 0, duration: 1, repeat: 3, yoyo: true });

      const anim = target.querySelector("animate")!;
      expect(anim.getAttribute("values")).toBe("1; 0; 1");
      expect(anim.getAttribute("dur")).toBe("2s");
      expect(anim.getAttribute("repeatCount")).toBe("2");
    });

    it("HAPPY PATH: repeat:2 + yoyo (3 plays, odd) → full sequence encoded, repeatCount=1", () => {
      const target = makeEl();
      target.setAttribute("opacity", "1");

      new SMILTween(target, { opacity: 0, duration: 1, repeat: 2, yoyo: true });

      const anim = target.querySelector("animate")!;
      expect(anim.getAttribute("values")).toBe("1; 0; 1; 0");
      expect(anim.getAttribute("keyTimes")).toBe("0; 0.333333; 0.666667; 1");
      expect(anim.getAttribute("dur")).toBe("3s");
      expect(anim.getAttribute("repeatCount")).toBe("1");
    });

    it("HAPPY PATH: linear ease + yoyo → calcMode=linear, no keySplines", () => {
      const target = makeEl();
      target.setAttribute("opacity", "1");

      new SMILTween(target, { opacity: 0, duration: 1, repeat: 1, yoyo: true, ease: "linear" });

      const anim = target.querySelector("animate")!;
      expect(anim.getAttribute("calcMode")).toBe("linear");
      expect(anim.getAttribute("keySplines")).toBeNull();
    });

    it("HAPPY PATH: spline ease + yoyo → two keySplines (forward + reversed)", () => {
      const target = makeEl();
      target.setAttribute("opacity", "1");

      new SMILTween(target, { opacity: 0, duration: 1, repeat: 1, yoyo: true, ease: "power1.out" });

      const anim = target.querySelector("animate")!;
      const splines = anim.getAttribute("keySplines")!;
      const parts = splines.split("; ");
      expect(parts).toHaveLength(2);
    });

    it("HAPPY PATH: transform + yoyo → animateTransform gets values encoding", () => {
      const target = makeEl();

      new SMILTween(target, { x: 100, duration: 1, repeat: 1, yoyo: true });

      const animT = target.querySelector("animateTransform")!;
      expect(animT.getAttribute("values")).toBe("0 0; 100 0; 0 0");
      expect(animT.getAttribute("dur")).toBe("2s");
    });

    it("EDGE CASE: yoyo + stagger + odd total plays → warns, yoyo skipped", () => {
      const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

      // GSAP repeat:N = N extra plays after the first → repeat:2 = 3 total (1+2), which is odd.
      // Odd total plays can't be encoded as whole F+B cycles in the stagger group.
      new SMILTween([makeEl(), makeEl()], {
        opacity: 0,
        duration: 1,
        repeat: 2,
        yoyo: true,
        stagger: 0.2,
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("yoyo"));
      warnSpy.mockRestore();
    });
  });

  describe("keyframes — object array form", () => {
    it("HAPPY PATH: _initialized is true after construction", () => {
      const target = makeEl();

      const tween = new SMILTween(target, {
        keyframes: [{ opacity: 0, duration: 0.5 }, { opacity: 1, duration: 0.5 }],
      });

      expect(tween._initialized).toBe(true);
    });

    it("HAPPY PATH: _dur equals the sum of step durations", () => {
      const target = makeEl();

      const tween = new SMILTween(target, {
        keyframes: [{ opacity: 0, duration: 0.5 }, { opacity: 1, duration: 1 }],
      });

      expect(tween._dur).toBe(1.5);
    });

    it("HAPPY PATH: first step has no begin attribute", () => {
      const target = makeEl();

      new SMILTween(target, {
        keyframes: [{ opacity: 0, duration: 0.5 }, { opacity: 1, duration: 0.5 }],
      });

      const anims = target.querySelectorAll("animate");
      expect(anims[0]!.getAttribute("begin")).toBeNull();
    });

    it("HAPPY PATH: second step begin = first step duration", () => {
      const target = makeEl();

      new SMILTween(target, {
        keyframes: [{ opacity: 0, duration: 0.5 }, { opacity: 1, duration: 0.5 }],
      });

      const anims = target.querySelectorAll("animate");
      expect(anims[1]!.getAttribute("begin")).toBe("0.5s");
    });

    it("HAPPY PATH: three steps accumulate begin offsets correctly", () => {
      const target = makeEl();

      new SMILTween(target, {
        keyframes: [
          { opacity: 0, duration: 0.5 },
          { opacity: 0.5, duration: 1 },
          { opacity: 1, duration: 0.3 },
        ],
      });

      const anims = target.querySelectorAll("animate");
      expect(anims[0]!.getAttribute("begin")).toBeNull();
      expect(anims[1]!.getAttribute("begin")).toBe("0.5s");
      expect(anims[2]!.getAttribute("begin")).toBe("1.5s");
    });

    it("HAPPY PATH: multiple targets each receive their own set of step elements", () => {
      const el1 = makeEl();
      const el2 = makeEl();

      new SMILTween([el1, el2], {
        keyframes: [{ opacity: 0, duration: 0.5 }, { opacity: 1, duration: 0.5 }],
      });

      expect(el1.childElementCount).toBe(2);
      expect(el2.childElementCount).toBe(2);
    });

    it("HAPPY PATH: stagger offsets each target's steps by the stagger delay", () => {
      const el1 = makeEl();
      const el2 = makeEl();

      new SMILTween([el1, el2], {
        keyframes: [{ opacity: 0, duration: 0.5 }, { opacity: 1, duration: 0.5 }],
        stagger: 0.3,
      });

      const el2Anims = el2.querySelectorAll("animate");
      expect(el2Anims[0]!.getAttribute("begin")).toBe("0.3s");
      expect(el2Anims[1]!.getAttribute("begin")).toBe("0.8s");
    });

    it("HAPPY PATH: revert() restores the original attribute and removes all elements", () => {
      const target = makeEl();
      target.setAttribute("opacity", "0.9");

      const tween = new SMILTween(target, {
        keyframes: [{ opacity: 0, duration: 0.5 }, { opacity: 1, duration: 0.5 }],
      });
      tween.revert();

      expect(target.getAttribute("opacity")).toBe("0.9");
      expect(target.childElementCount).toBe(0);
    });
  });

  describe("keyframes — property array form", () => {
    it("HAPPY PATH: _initialized is true after construction", () => {
      const target = makeEl();

      const tween = new SMILTween(target, {
        keyframes: { x: [0, 100, 50] },
        duration: 2,
      });

      expect(tween._initialized).toBe(true);
    });

    it("HAPPY PATH: _dur matches the specified duration", () => {
      const target = makeEl();

      const tween = new SMILTween(target, {
        keyframes: { x: [0, 100, 50] },
        duration: 1.5,
      });

      expect(tween._dur).toBe(1.5);
    });

    it("HAPPY PATH: x+y arrays → single translate <animateTransform> with merged values", () => {
      const target = makeEl();

      new SMILTween(target, {
        keyframes: { x: [0, 100, 50], y: [0, 0, 30] },
        duration: 2,
      });

      const animTransforms = target.querySelectorAll("animateTransform");
      expect(animTransforms).toHaveLength(1);
      expect(animTransforms[0]!.getAttribute("type")).toBe("translate");
      expect(animTransforms[0]!.getAttribute("values")).toBe("0 0; 100 0; 50 30");
    });

    it("HAPPY PATH: only x provided → translate values pad y with 0", () => {
      const target = makeEl();

      new SMILTween(target, {
        keyframes: { x: [0, 100] },
        duration: 1,
      });

      const animTransform = target.querySelector("animateTransform")!;
      expect(animTransform.getAttribute("values")).toBe("0 0; 100 0");
    });

    it("HAPPY PATH: scale array → scale <animateTransform> with uniform x/y values", () => {
      const target = makeEl();

      new SMILTween(target, {
        keyframes: { scale: [1, 2, 1] },
        duration: 1,
      });

      const animTransform = target.querySelector("animateTransform")!;
      expect(animTransform.getAttribute("type")).toBe("scale");
      expect(animTransform.getAttribute("values")).toBe("1 1; 2 2; 1 1");
    });

    it("HAPPY PATH: opacity array → <animate> with values attribute", () => {
      const target = makeEl();

      new SMILTween(target, {
        keyframes: { opacity: [1, 0, 1] },
        duration: 1,
      });

      const anim = target.querySelector("animate")!;
      expect(anim.getAttribute("attributeName")).toBe("opacity");
      expect(anim.getAttribute("values")).toBe("1; 0; 1");
    });

    it("HAPPY PATH: multiple targets each get their own elements", () => {
      const el1 = makeEl();
      const el2 = makeEl();

      new SMILTween([el1, el2], {
        keyframes: { opacity: [0, 1] },
        duration: 1,
      });

      expect(el1.querySelector("animate")).not.toBeNull();
      expect(el2.querySelector("animate")).not.toBeNull();
    });

    it("HAPPY PATH: stagger offsets each target's begin attribute", () => {
      const el1 = makeEl();
      const el2 = makeEl();

      new SMILTween([el1, el2], {
        keyframes: { opacity: [0, 1] },
        duration: 1,
        stagger: 0.5,
      });

      expect(el1.querySelector("animate")!.getAttribute("begin")).toBeNull();
      expect(el2.querySelector("animate")!.getAttribute("begin")).toBe("0.5s");
    });
  });

  describe("keyframes — percentage object form", () => {
    it("HAPPY PATH: _initialized is true after construction", () => {
      const target = makeEl();

      const tween = new SMILTween(target, {
        keyframes: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        duration: 1,
      });

      expect(tween._initialized).toBe(true);
    });

    it("HAPPY PATH: _dur matches the specified duration", () => {
      const target = makeEl();

      const tween = new SMILTween(target, {
        keyframes: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        duration: 2,
      });

      expect(tween._dur).toBe(2);
    });

    it("HAPPY PATH: keyTimes attribute reflects the stop percentages", () => {
      const target = makeEl();

      new SMILTween(target, {
        keyframes: { "0%": { opacity: 0 }, "50%": { opacity: 0.5 }, "100%": { opacity: 1 } },
        duration: 1,
      });

      const anim = target.querySelector("animate")!;
      expect(anim.getAttribute("keyTimes")).toBe("0; 0.5; 1");
    });

    it("HAPPY PATH: non-uniform stops produce correct keyTimes", () => {
      const target = makeEl();

      new SMILTween(target, {
        keyframes: { "0%": { x: 0 }, "25%": { x: 50 }, "100%": { x: 100 } },
        duration: 1,
      });

      const animTransform = target.querySelector("animateTransform")!;
      expect(animTransform.getAttribute("keyTimes")).toBe("0; 0.25; 1");
    });

    it("HAPPY PATH: carry-forward — missing property at a stop uses the last known value", () => {
      const target = makeEl();

      new SMILTween(target, {
        keyframes: { "0%": { opacity: 0 }, "50%": {}, "100%": { opacity: 1 } },
        duration: 1,
      });

      const anim = target.querySelector("animate")!;
      expect(anim.getAttribute("values")).toBe("0; 0; 1");
    });

    it("HAPPY PATH: multiple targets each get separate elements", () => {
      const el1 = makeEl();
      const el2 = makeEl();

      new SMILTween([el1, el2], {
        keyframes: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        duration: 1,
      });

      expect(el1.querySelector("animate")).not.toBeNull();
      expect(el2.querySelector("animate")).not.toBeNull();
    });

    it("HAPPY PATH: stagger offsets each target's begin attribute", () => {
      const el1 = makeEl();
      const el2 = makeEl();

      new SMILTween([el1, el2], {
        keyframes: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        duration: 1,
        stagger: 0.4,
      });

      expect(el1.querySelector("animate")!.getAttribute("begin")).toBeNull();
      expect(el2.querySelector("animate")!.getAttribute("begin")).toBe("0.4s");
    });
  });
});
