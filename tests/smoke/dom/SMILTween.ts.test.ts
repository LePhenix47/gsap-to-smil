/// <reference lib="dom" />
import { describe, expect, it } from "bun:test";
import { SMILTween } from "@/core/SMILTween.ts";
import { SVG_NS } from "@/utils/builders.ts";

const makeEl = (tag = "rect") => document.createElementNS(SVG_NS, tag);

describe("SMILTween (smoke)", () => {
  it("SMOKE TEST: to() — ease + repeat + delay all propagate to the injected <animate>", () => {
    const target = makeEl();
    const gsapRepeat = 2;

    new SMILTween(target, {
      opacity: 0,
      duration: 1.5,
      ease: "power2.out",
      repeat: gsapRepeat,
      delay: 0.5,
    });

    const anim = target.querySelector("animate")!;

    expect(anim.getAttribute("attributeName")).toBe("opacity");
    expect(anim.getAttribute("to")).toBe("0");
    expect(anim.getAttribute("dur")).toBe("1.5s");
    expect(anim.getAttribute("begin")).toBe("0.5s");
    expect(anim.getAttribute("repeatCount")).toBe(String(gsapRepeat + 1));
    expect(anim.getAttribute("calcMode")).toBe("spline");
    expect(anim.getAttribute("keySplines")).not.toBeNull();
  });

  it("SMOKE TEST: to() — ease + repeat + delay all propagate to the injected <animateTransform>", () => {
    const target = makeEl();
    const gsapRepeat = 1;

    new SMILTween(target, {
      x: 100,
      duration: 2,
      ease: "sine.inOut",
      repeat: gsapRepeat,
      delay: 1,
    });

    const animTransform = target.querySelector("animateTransform")!;

    expect(animTransform.getAttribute("type")).toBe("translate");
    expect(animTransform.getAttribute("dur")).toBe("2s");
    expect(animTransform.getAttribute("begin")).toBe("1s");
    expect(animTransform.getAttribute("repeatCount")).toBe(String(gsapRepeat + 1));
    expect(animTransform.getAttribute("calcMode")).toBe("spline");
  });

  it("SMOKE TEST: mixed props — transform + direct property both injected with shared timing", () => {
    const target = makeEl();

    new SMILTween(target, {
      x: 50,
      opacity: 0.5,
      duration: 1,
      ease: "power1.in",
      delay: 0.25,
    });

    const animTransform = target.querySelector("animateTransform")!;
    const animate = target.querySelector("animate")!;

    expect(animTransform.getAttribute("dur")).toBe("1s");
    expect(animate.getAttribute("dur")).toBe("1s");
    expect(animTransform.getAttribute("begin")).toBe("0.25s");
    expect(animate.getAttribute("begin")).toBe("0.25s");
    expect(animTransform.getAttribute("calcMode")).toBe("spline");
    expect(animate.getAttribute("calcMode")).toBe("spline");
  });

  it("SMOKE TEST: fromTo() — from and to both routed correctly through full pipeline", () => {
    const target = makeEl();

    new SMILTween(
      target,
      { opacity: 1, x: 100, duration: 1 },
      { opacity: 0, x: 0 },
    );

    const animate = target.querySelector("animate")!;
    const animTransform = target.querySelector("animateTransform")!;

    expect(animate.getAttribute("from")).toBe("0");
    expect(animate.getAttribute("to")).toBe("1");
    expect(animTransform.getAttribute("from")).toBe("0 0");
    expect(animTransform.getAttribute("to")).toBe("100 0");
  });

  it("SMOKE TEST: from() — values are flipped and identity is the endpoint", () => {
    const target = makeEl();

    new SMILTween(target, { x: 200, opacity: 0, duration: 1 }, null, true);

    const animTransform = target.querySelector("animateTransform")!;
    const animate = target.querySelector("animate")!;

    expect(animTransform.getAttribute("from")).toBe("200 0");
    expect(animTransform.getAttribute("to")).toBe("0 0");
    expect(animate.getAttribute("from")).toBe("0");
    expect(animate.getAttribute("to")).toBeNull();
  });

  it("SMOKE TEST: stagger — each target gets a begin offset, last target has no begin", () => {
    const el1 = makeEl();
    const el2 = makeEl();
    const el3 = makeEl();

    new SMILTween([el1, el2, el3], {
      opacity: 0,
      duration: 1,
      stagger: 0.25,
    });

    const begin1 = el1.querySelector("animate")!.getAttribute("begin");
    const begin2 = el2.querySelector("animate")!.getAttribute("begin");
    const begin3 = el3.querySelector("animate")!.getAttribute("begin");

    expect(begin1).toBeNull();
    expect(begin2).toBe("0.25s");
    expect(begin3).toBe("0.5s");
  });

  it("SMOKE TEST: revert() after a complex tween restores all original attributes", () => {
    const target = makeEl();
    target.setAttribute("opacity", "0.9");
    target.setAttribute("fill", "red");

    const tween = new SMILTween(target, {
      opacity: 0,
      fill: "blue",
      x: 100,
      duration: 1,
    });

    tween.revert();

    expect(target.getAttribute("opacity")).toBe("0.9");
    expect(target.getAttribute("fill")).toBe("red");
    expect(target.childElementCount).toBe(0);
  });

  it("SMOKE TEST: kill() after a complex tween leaves no SMIL children on any target", () => {
    const el1 = makeEl();
    const el2 = makeEl();

    const tween = new SMILTween([el1, el2], {
      x: 50,
      opacity: 0,
      rotation: 45,
      duration: 1,
    });

    tween.kill();

    expect(el1.childElementCount).toBe(0);
    expect(el2.childElementCount).toBe(0);
    expect(tween._elements).toHaveLength(0);
    expect(tween._initialized).toBe(false);
  });

  describe("keyframes — object array form (smoke)", () => {
    it("SMOKE TEST: three steps on two targets with stagger — all begin offsets are correct", () => {
      const el1 = makeEl();
      const el2 = makeEl();

      new SMILTween([el1, el2], {
        keyframes: [
          { opacity: 0, duration: 0.5 },
          { opacity: 0.5, duration: 0.5 },
          { opacity: 1, duration: 0.5 },
        ],
        stagger: 0.2,
      });

      const el1Anims = el1.querySelectorAll("animate");
      const el2Anims = el2.querySelectorAll("animate");

      // el1: stagger offset = 0
      expect(el1Anims[0]!.getAttribute("begin")).toBeNull();
      expect(el1Anims[1]!.getAttribute("begin")).toBe("0.5s");
      expect(el1Anims[2]!.getAttribute("begin")).toBe("1s");

      // el2: stagger offset = 0.2
      expect(el2Anims[0]!.getAttribute("begin")).toBe("0.2s");
      expect(el2Anims[1]!.getAttribute("begin")).toBe("0.7s");
      expect(el2Anims[2]!.getAttribute("begin")).toBe("1.2s");
    });

    it("SMOKE TEST: kill() removes all step elements across all targets", () => {
      const el1 = makeEl();
      const el2 = makeEl();

      const tween = new SMILTween([el1, el2], {
        keyframes: [{ opacity: 0, duration: 0.5 }, { opacity: 1, duration: 0.5 }],
      });

      tween.kill();

      expect(el1.childElementCount).toBe(0);
      expect(el2.childElementCount).toBe(0);
      expect(tween._initialized).toBe(false);
    });

    it("SMOKE TEST: revert() restores all original attributes and removes elements", () => {
      const el1 = makeEl();
      const el2 = makeEl();
      el1.setAttribute("opacity", "0.8");
      el2.setAttribute("opacity", "0.4");

      const tween = new SMILTween([el1, el2], {
        keyframes: [{ opacity: 0, duration: 0.5 }, { opacity: 1, duration: 0.5 }],
      });

      tween.revert();

      expect(el1.getAttribute("opacity")).toBe("0.8");
      expect(el2.getAttribute("opacity")).toBe("0.4");
      expect(el1.childElementCount).toBe(0);
      expect(el2.childElementCount).toBe(0);
    });
  });

  describe("keyframes — property array form (smoke)", () => {
    it("SMOKE TEST: x+y+opacity arrays all produce correct elements with shared timing", () => {
      const target = makeEl();

      new SMILTween(target, {
        keyframes: { x: [0, 120, 120, 0], y: [0, 0, 60, 60], opacity: [1, 1, 0.5, 0] },
        duration: 2,
        ease: "power1.inOut",
      });

      const animTransform = target.querySelector("animateTransform")!;
      const anim = target.querySelector("animate")!;

      expect(animTransform.getAttribute("type")).toBe("translate");
      expect(animTransform.getAttribute("values")).toBe("0 0; 120 0; 120 60; 0 60");
      expect(anim.getAttribute("values")).toBe("1; 1; 0.5; 0");
      expect(animTransform.getAttribute("dur")).toBe("2s");
      expect(anim.getAttribute("dur")).toBe("2s");
      expect(animTransform.getAttribute("calcMode")).toBe("spline");
    });

    it("SMOKE TEST: two targets with stagger — second target has correct begin offset", () => {
      const el1 = makeEl();
      const el2 = makeEl();

      new SMILTween([el1, el2], {
        keyframes: { x: [0, 100, 0] },
        duration: 1,
        stagger: 0.3,
      });

      expect(el1.querySelector("animateTransform")!.getAttribute("begin")).toBeNull();
      expect(el2.querySelector("animateTransform")!.getAttribute("begin")).toBe("0.3s");
    });

    it("SMOKE TEST: kill() strips all elements from all targets", () => {
      const el1 = makeEl();
      const el2 = makeEl();

      const tween = new SMILTween([el1, el2], {
        keyframes: { opacity: [0, 1, 0] },
        duration: 1,
      });

      tween.kill();

      expect(el1.childElementCount).toBe(0);
      expect(el2.childElementCount).toBe(0);
    });
  });

  describe("yoyo (smoke)", () => {
    it("SMOKE TEST: repeat:1 + yoyo — opacity animates forward then backward, dur doubled", () => {
      const target = makeEl();
      target.setAttribute("opacity", "0.8");

      new SMILTween(target, { opacity: 0, duration: 1.5, repeat: 1, yoyo: true });

      const anim = target.querySelector("animate")!;
      expect(anim.getAttribute("values")).toBe("0.8; 0; 0.8");
      expect(anim.getAttribute("dur")).toBe("3s");
      expect(anim.getAttribute("repeatCount")).toBe("1");
      expect(anim.getAttribute("from")).toBeNull();
      expect(anim.getAttribute("to")).toBeNull();
    });

    it("SMOKE TEST: repeat:-1 + yoyo — infinite cycling, repeatCount=indefinite", () => {
      const target = makeEl();
      target.setAttribute("opacity", "1");

      new SMILTween(target, { opacity: 0, duration: 0.5, repeat: -1, yoyo: true });

      const anim = target.querySelector("animate")!;
      expect(anim.getAttribute("values")).toBe("1; 0; 1");
      expect(anim.getAttribute("dur")).toBe("1s");
      expect(anim.getAttribute("repeatCount")).toBe("indefinite");
    });

    it("SMOKE TEST: repeat:2 + yoyo (3 plays, odd) — full F/B/F sequence with keyTimes", () => {
      const target = makeEl();
      target.setAttribute("opacity", "1");

      new SMILTween(target, { opacity: 0, duration: 1, repeat: 2, yoyo: true });

      const anim = target.querySelector("animate")!;
      expect(anim.getAttribute("values")).toBe("1; 0; 1; 0");
      expect(anim.getAttribute("dur")).toBe("3s");
      expect(anim.getAttribute("repeatCount")).toBe("1");
      expect(anim.getAttribute("keyTimes")).not.toBeNull();
    });

    it("SMOKE TEST: transform + yoyo — animateTransform gets values encoding", () => {
      const target = makeEl();

      new SMILTween(target, { x: 200, duration: 1, repeat: 1, yoyo: true });

      const animT = target.querySelector("animateTransform")!;
      expect(animT.getAttribute("values")).toBe("0 0; 200 0; 0 0");
      expect(animT.getAttribute("dur")).toBe("2s");
      expect(animT.getAttribute("repeatCount")).toBe("1");
    });

    it("SMOKE TEST: spline ease + yoyo — two keySplines, second is reversed bezier", () => {
      const target = makeEl();
      target.setAttribute("opacity", "1");

      new SMILTween(target, { opacity: 0, duration: 1, repeat: 1, yoyo: true, ease: "power2.out" });

      const anim = target.querySelector("animate")!;
      expect(anim.getAttribute("calcMode")).toBe("spline");
      const splines = anim.getAttribute("keySplines")!.split("; ");
      expect(splines).toHaveLength(2);
      // Forward and reversed splines must differ
      expect(splines[0]).not.toBe(splines[1]);
    });

    it("SMOKE TEST: mixed props — transform + opacity both encoded for yoyo", () => {
      const target = makeEl();
      target.setAttribute("opacity", "1");

      new SMILTween(target, { x: 100, opacity: 0, duration: 1, repeat: 1, yoyo: true });

      const animT = target.querySelector("animateTransform")!;
      const anim = target.querySelector("animate")!;
      expect(animT.getAttribute("values")).toBe("0 0; 100 0; 0 0");
      expect(anim.getAttribute("values")).toBe("1; 0; 1");
      expect(animT.getAttribute("dur")).toBe("2s");
      expect(anim.getAttribute("dur")).toBe("2s");
    });

    it("SMOKE TEST: yoyo + stagger + even repeat — clean F/B cycles, dur and repeatCount correct", () => {
      const el1 = makeEl();
      const el2 = makeEl();
      el1.setAttribute("opacity", "1");
      el2.setAttribute("opacity", "1");

      // repeat:1 = 2 total plays (even) → 1 clean F+B yoyo cycle per target
      // groupDur = 2*1 + 0.2 (maxStagger) = 2.2s
      new SMILTween([el1, el2], {
        opacity: 0,
        duration: 1,
        repeat: 1,
        yoyo: true,
        stagger: 0.2,
      });

      const anim1 = el1.querySelector("animate")!;
      const anim2 = el2.querySelector("animate")!;

      expect(anim1.getAttribute("dur")).toBe("2.2s");
      expect(anim2.getAttribute("dur")).toBe("2.2s");
      expect(anim1.getAttribute("repeatCount")).toBe("1");
      expect(anim2.getAttribute("repeatCount")).toBe("1");
      // el1 (no wait): from→to→from + hold at from
      expect(anim1.getAttribute("values")).toContain("1; 0; 1");
      // el2 (wait): from hold → from→to→from (no hold — fills exactly to groupDur)
      expect(anim2.getAttribute("values")).toContain("1; 1; 0; 1");
      // neither element should have raw from/to
      expect(anim1.getAttribute("from")).toBeNull();
      expect(anim1.getAttribute("to")).toBeNull();
    });

    it("SMOKE TEST: yoyo + stagger + odd repeat — full sequence per target, repeatCount=1", () => {
      const el1 = makeEl();
      const el2 = makeEl();
      el1.setAttribute("opacity", "1");
      el2.setAttribute("opacity", "1");

      // repeat:2 = 3 total plays (odd, F+B+F) → all plays in one SMIL cycle
      // groupDur = 3*1 + 0.2 (maxStagger) = 3.2s
      new SMILTween([el1, el2], {
        opacity: 0,
        duration: 1,
        repeat: 2,
        yoyo: true,
        stagger: 0.2,
      });

      const anim1 = el1.querySelector("animate")!;
      const anim2 = el2.querySelector("animate")!;

      expect(anim1.getAttribute("dur")).toBe("3.2s");
      expect(anim2.getAttribute("dur")).toBe("3.2s");
      expect(anim1.getAttribute("repeatCount")).toBe("1");
      expect(anim2.getAttribute("repeatCount")).toBe("1");
      // el1 (no wait, 3 plays end at "to", then hold at "to")
      expect(anim1.getAttribute("values")).toBe("1; 0; 1; 0; 0");
      // el2 (wait, fills exactly to groupDur → no hold)
      expect(anim2.getAttribute("values")).toBe("1; 1; 0; 1; 0");
    });

    it("SMOKE TEST: revert() after yoyo tween restores original attributes", () => {
      const target = makeEl();
      target.setAttribute("opacity", "0.7");

      const tween = new SMILTween(target, { opacity: 0, duration: 1, repeat: 1, yoyo: true });
      tween.revert();

      expect(target.getAttribute("opacity")).toBe("0.7");
      expect(target.childElementCount).toBe(0);
    });
  });

  describe("keyframes — percentage object form (smoke)", () => {
    it("SMOKE TEST: keyTimes + values + carry-forward survive a full pipeline pass", () => {
      const target = makeEl();

      new SMILTween(target, {
        keyframes: {
          "0%": { opacity: 0, x: 0 },
          "40%": { opacity: 0.8 },    // x missing → carry-forward 0
          "100%": { opacity: 1, x: 200 },
        },
        duration: 2,
      });

      const anim = target.querySelector("animate")!;
      const animTransform = target.querySelector("animateTransform")!;

      expect(anim.getAttribute("keyTimes")).toBe("0; 0.4; 1");
      expect(anim.getAttribute("values")).toBe("0; 0.8; 1");
      expect(animTransform.getAttribute("keyTimes")).toBe("0; 0.4; 1");
      expect(animTransform.getAttribute("values")).toBe("0 0; 0 0; 200 0"); // x carry-forward at 40%
    });

    it("SMOKE TEST: two targets with stagger both get keyTimes on their elements", () => {
      const el1 = makeEl();
      const el2 = makeEl();

      new SMILTween([el1, el2], {
        keyframes: { "0%": { opacity: 0 }, "50%": { opacity: 0.5 }, "100%": { opacity: 1 } },
        duration: 1,
        stagger: 0.25,
      });

      const anim1 = el1.querySelector("animate")!;
      const anim2 = el2.querySelector("animate")!;

      expect(anim1.getAttribute("keyTimes")).toBe("0; 0.5; 1");
      expect(anim2.getAttribute("keyTimes")).toBe("0; 0.5; 1");
      expect(anim1.getAttribute("begin")).toBeNull();
      expect(anim2.getAttribute("begin")).toBe("0.25s");
    });

    it("SMOKE TEST: revert() restores original attributes and clears elements", () => {
      const target = makeEl();
      target.setAttribute("opacity", "0.7");

      const tween = new SMILTween(target, {
        keyframes: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        duration: 1,
      });

      tween.revert();

      expect(target.getAttribute("opacity")).toBe("0.7");
      expect(target.childElementCount).toBe(0);
    });
  });
});
