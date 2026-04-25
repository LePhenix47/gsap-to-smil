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
});
