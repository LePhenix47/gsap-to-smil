/// <reference lib="dom" />
import { describe, expect, it } from "bun:test";
import { SMILTimeline } from "@/core/SMILTimeline.ts";
import { SMILTween } from "@/core/SMILTween.ts";
import { SVG_NS } from "@/utils/builders.ts";

const makeEl = (tag = "rect") => document.createElementNS(SVG_NS, tag);
const makeTl = (vars: ConstructorParameters<typeof SMILTimeline>[0] = {}) =>
  new SMILTimeline(vars);

describe("SMILTimeline (smoke)", () => {
  it("SMOKE TEST: three sequential tweens produce begin= attributes that step forward correctly", () => {
    const a = makeEl();
    const b = makeEl();
    const c = makeEl();
    const tl = makeTl();

    tl.to(a, { opacity: 0, duration: 0.5 });
    tl.to(b, { opacity: 0, duration: 1 });
    tl.to(c, { opacity: 0, duration: 0.75 });

    expect(a.querySelector("animate")!.getAttribute("begin")).toBeNull();
    expect(b.querySelector("animate")!.getAttribute("begin")).toBe("0.5s");
    expect(c.querySelector("animate")!.getAttribute("begin")).toBe("1.5s");
  });

  it("SMOKE TEST: '<' position — two tweens on different elements start at the same time", () => {
    const a = makeEl();
    const b = makeEl();
    const tl = makeTl();

    tl.to(a, { opacity: 0, duration: 1 });
    tl.to(b, { fill: "red", duration: 0.5 }, "<");

    expect(a.querySelector("animate")!.getAttribute("begin")).toBeNull();
    expect(b.querySelector("animate")!.getAttribute("begin")).toBeNull();
  });

  it("SMOKE TEST: timeline delay is added to every injected begin= attribute", () => {
    const a = makeEl();
    const b = makeEl();
    const tl = makeTl({ delay: 2 });

    tl.to(a, { opacity: 0, duration: 0.5 });
    tl.to(b, { opacity: 1, duration: 0.5 });

    expect(a.querySelector("animate")!.getAttribute("begin")).toBe("2s");
    expect(b.querySelector("animate")!.getAttribute("begin")).toBe("2.5s");
  });

  it("SMOKE TEST: chained .to() calls return the same timeline instance", () => {
    const tl = makeTl();

    const result = tl
      .to(makeEl(), { opacity: 0, duration: 0.3 })
      .to(makeEl(), { opacity: 1, duration: 0.3 })
      .to(makeEl(), { opacity: 0.5, duration: 0.3 });

    expect(result).toBe(tl);
    expect(tl._children).toHaveLength(3);
  });

  it("SMOKE TEST: label-based position — tween lands at the labeled time", () => {
    const a = makeEl();
    const b = makeEl();
    const tl = makeTl();

    tl.to(a, { opacity: 0, duration: 2 });
    tl.addLabel("mid");
    tl.to(makeEl(), { opacity: 0, duration: 1 }); // advances prevEnd past label
    tl.to(b, { opacity: 1, duration: 0.5 }, "mid");

    // b should start at 2s (the label time), not at end-of-timeline
    expect(b.querySelector("animate")!.getAttribute("begin")).toBe("2s");
  });

  it("SMOKE TEST: add() with a pre-built SMILTween — begin attr reflects given position", () => {
    const target = makeEl();
    const tween = new SMILTween(target, { opacity: 0, duration: 1 });
    const tl = makeTl();

    tl.add(tween, 3);

    expect(target.querySelector("animate")!.getAttribute("begin")).toBe("3s");
  });

  it("SMOKE TEST: clear() removes all <animate> elements from the DOM and resets state", () => {
    const a = makeEl();
    const b = makeEl();
    const tl = makeTl();

    tl.to(a, { opacity: 0, duration: 0.5 });
    tl.to(b, { opacity: 1, duration: 0.5 });
    tl.clear();

    expect(a.childElementCount).toBe(0);
    expect(b.childElementCount).toBe(0);
    expect(tl._children).toHaveLength(0);
    expect(tl._dur).toBe(0);
    expect(tl._initialized).toBe(false);
  });

  it("SMOKE TEST: kill() strips every injected element and empties children", () => {
    const a = makeEl();
    const b = makeEl();
    const tl = makeTl();

    tl.to(a, { opacity: 0, duration: 0.5 });
    tl.to(b, { opacity: 1, duration: 0.5 });
    tl.kill();

    expect(a.childElementCount).toBe(0);
    expect(b.childElementCount).toBe(0);
    expect(tl._children).toHaveLength(0);
  });

  it("SMOKE TEST: revert() restores original attribute values on all child targets", () => {
    const a = makeEl();
    const b = makeEl();
    a.setAttribute("opacity", "0.8");
    b.setAttribute("fill", "blue");
    const tl = makeTl();

    tl.to(a, { opacity: 0, duration: 0.5 });
    tl.to(b, { fill: "red", duration: 0.5 });
    tl.revert();

    expect(a.getAttribute("opacity")).toBe("0.8");
    expect(b.getAttribute("fill")).toBe("blue");
    expect(a.childElementCount).toBe(0);
    expect(b.childElementCount).toBe(0);
  });

  it("SMOKE TEST: _tDur equals sum of all sequential children durations", () => {
    const tl = makeTl();

    tl.to(makeEl(), { opacity: 0, duration: 1 });
    tl.to(makeEl(), { opacity: 1, duration: 2 });
    tl.to(makeEl(), { opacity: 0.5, duration: 0.5 });

    expect(tl._tDur).toBe(3.5);
  });

  it("SMOKE TEST: defaults from timeline are applied to tweens built with to()", () => {
    const tl = makeTl({ defaults: { ease: "linear", duration: 2 } });
    const target = makeEl();

    tl.to(target, { opacity: 0 });

    const anim = target.querySelector("animate")!;
    expect(anim.getAttribute("dur")).toBe("2s");
    expect(anim.getAttribute("calcMode")).toBe("linear");
  });

  it("SMOKE TEST: '>-0.5' overlap — three tweens, middle one starts 0.5s before previous ends", () => {
    const a = makeEl();
    const b = makeEl();
    const c = makeEl();
    const tl = makeTl();

    tl.to(a, { opacity: 0, duration: 1 });
    tl.to(b, { opacity: 0, duration: 1 }, ">-0.5");
    tl.to(c, { opacity: 0, duration: 1 }, ">-0.5");

    expect(a.querySelector("animate")!.getAttribute("begin")).toBeNull(); // 0s
    expect(b.querySelector("animate")!.getAttribute("begin")).toBe("0.5s"); // 1 - 0.5
    expect(c.querySelector("animate")!.getAttribute("begin")).toBe("1s"); // 1.5 - 0.5
  });
});
