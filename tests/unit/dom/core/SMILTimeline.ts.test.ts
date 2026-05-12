/// <reference lib="dom" />
// fallow-ignore-file
import { describe, expect, it } from "bun:test";
import { SMILTimeline } from "@/core/SMILTimeline.ts";
import { SMILTween } from "@/core/SMILTween.ts";
import { SMILBuilder } from "@/utils/builders.ts";

const makeEl = (tag = "rect") => document.createElementNS(SMILBuilder.SVG_NS, tag);
const makeTl = (vars: ConstructorParameters<typeof SMILTimeline>[0] = {}) =>
  new SMILTimeline(vars);

describe("SMILTimeline", () => {
  describe("constructor", () => {
    it("HAPPY PATH: durationSeconds and totalDurationSeconds start at 0", () => {
      const tl = makeTl();

      expect(tl.durationSeconds).toBe(0);
      expect(tl.totalDurationSeconds).toBe(0);
    });

    it("HAPPY PATH: hasBuilt is false before any children are added", () => {
      const tl = makeTl();

      expect(tl.hasBuilt).toBe(false);
    });

    it("HAPPY PATH: defaults from vars are stored in defaults", () => {
      const tl = makeTl({ defaults: { ease: "linear", duration: 2 } });

      expect(tl.defaults).toEqual({ ease: "linear", duration: 2 });
    });

    it("HAPPY PATH: delay and repeat from vars are passed to the Animation base", () => {
      const tl = makeTl({ delay: 1.5, repeat: 3 });

      expect(tl.delaySeconds).toBe(1.5);
      expect(tl.repeatCount).toBe(3);
    });
  });

  describe("to() — child insertion", () => {
    it("HAPPY PATH: adds one entry to children", () => {
      const tl = makeTl();

      tl.to(makeEl(), { opacity: 0, duration: 0.5 });

      expect(tl.children).toHaveLength(1);
    });

    it("HAPPY PATH: hasBuilt becomes true after the first child", () => {
      const tl = makeTl();

      tl.to(makeEl(), { opacity: 0, duration: 0.5 });

      expect(tl.hasBuilt).toBe(true);
    });

    it("HAPPY PATH: durationSeconds updates to the child tween's duration", () => {
      const tl = makeTl();

      tl.to(makeEl(), { opacity: 0, duration: 1.2 });

      expect(tl.durationSeconds).toBe(1.2);
    });

    it("HAPPY PATH: first child's absoluteStart is 0", () => {
      const tl = makeTl();

      tl.to(makeEl(), { opacity: 0, duration: 0.5 });

      expect(tl.children[0]!.absoluteStart).toBe(0);
    });

    it("HAPPY PATH: defaults are merged into the child tween vars", () => {
      const tl = makeTl({ defaults: { ease: "linear" } });
      const target = makeEl();

      tl.to(target, { opacity: 0, duration: 0.5 });

      const anim = target.querySelector("animate")!;
      // ease: "linear" → calcMode="linear" (no keySplines)
      expect(anim.getAttribute("calcMode")).toBe("linear");
    });

    it("HAPPY PATH: returns this for chaining", () => {
      const tl = makeTl();

      const result = tl.to(makeEl(), { opacity: 0, duration: 0.5 });

      expect(result).toBe(tl);
    });
  });

  describe("position resolution", () => {
    it("HAPPY PATH: undefined → sequential, second child starts after first ends", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 0.5 });
      tl.to(makeEl(), { opacity: 1, duration: 0.5 });

      expect(tl.children[1]!.absoluteStart).toBe(0.5);
    });

    it("HAPPY PATH: '>' is identical to undefined", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 0.5 });
      tl.to(makeEl(), { opacity: 1, duration: 0.5 }, ">");

      expect(tl.children[1]!.absoluteStart).toBe(0.5);
    });

    it("HAPPY PATH: '<' → same absoluteStart as the previous child", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 0.5 });
      tl.to(makeEl(), { opacity: 1, duration: 0.5 }, "<");

      expect(tl.children[1]!.absoluteStart).toBe(0);
    });

    it("HAPPY PATH: number → exact absolute time", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 0.5 });
      tl.to(makeEl(), { opacity: 1, duration: 0.5 }, 2);

      expect(tl.children[1]!.absoluteStart).toBe(2);
    });

    it("HAPPY PATH: '<0.5' → prev start + 0.5", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 1 });
      tl.to(makeEl(), { opacity: 1, duration: 0.5 }, "<0.5");

      expect(tl.children[1]!.absoluteStart).toBe(0.5);
    });

    it("HAPPY PATH: '>-0.5' → prev end - 0.5 (overlap by 0.5s)", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 1 });
      tl.to(makeEl(), { opacity: 1, duration: 0.5 }, ">-0.5");

      expect(tl.children[1]!.absoluteStart).toBe(0.5);
    });

    it("HAPPY PATH: '+=0.5' → timeline end + 0.5", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 1 });
      tl.to(makeEl(), { opacity: 1, duration: 0.5 }, "+=0.5");

      expect(tl.children[1]!.absoluteStart).toBe(1.5);
    });

    it("HAPPY PATH: '-=0.5' → timeline end - 0.5", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 1 });
      tl.to(makeEl(), { opacity: 1, duration: 0.5 }, "-=0.5");

      expect(tl.children[1]!.absoluteStart).toBe(0.5);
    });

    it("EDGE CASE: position that would go negative is clamped to 0", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 1 });
      tl.to(makeEl(), { opacity: 1, duration: 0.5 }, ">-9999");

      expect(tl.children[1]!.absoluteStart).toBe(0);
    });
  });

  describe("labels", () => {
    it("HAPPY PATH: addLabel stores the current timeline end position", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 1 });
      tl.addLabel("myLabel");

      expect(tl.labels["myLabel"]).toBe(1);
    });

    it("HAPPY PATH: label string as position resolves to the label's time", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 1 });
      tl.addLabel("myLabel");
      tl.to(makeEl(), { opacity: 0, duration: 0.5 }); // advances prevEnd
      tl.to(makeEl(), { opacity: 1, duration: 0.5 }, "myLabel");

      expect(tl.children[2]!.absoluteStart).toBe(1);
    });

    it("HAPPY PATH: 'label+=N' → label time + N", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 1 });
      tl.addLabel("mark");
      tl.to(makeEl(), { opacity: 1, duration: 0.5 }, "mark+=0.3");

      expect(tl.children[1]!.absoluteStart).toBe(1.3);
    });

    it("HAPPY PATH: 'label-=N' → label time - N", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 1 });
      tl.addLabel("mark");
      tl.to(makeEl(), { opacity: 1, duration: 0.5 }, "mark-=0.4");

      expect(tl.children[1]!.absoluteStart).toBe(0.6);
    });

    it("HAPPY PATH: removeLabel deletes the label", () => {
      const tl = makeTl();
      tl.addLabel("gone");
      tl.removeLabel("gone");

      expect("gone" in tl.labels).toBe(false);
    });
  });

  describe("_rewriteBegin", () => {
    it("HAPPY PATH: absoluteStart=0.5 → element gets begin='0.5s'", () => {
      const tl = makeTl();
      const target = makeEl();
      tl.to(target, { opacity: 0, duration: 0.5 });
      tl.to(target, { opacity: 1, duration: 0.5 });

      const anims = target.querySelectorAll("animate");
      expect(anims[1]!.getAttribute("begin")).toBe("0.5s");
    });

    it("HAPPY PATH: absoluteStart=0 → begin attribute is absent", () => {
      const tl = makeTl();
      const target = makeEl();
      tl.to(target, { opacity: 0, duration: 0.5 });

      const anim = target.querySelector("animate")!;
      expect(anim.getAttribute("begin")).toBeNull();
    });

    it("HAPPY PATH: timeline delay is added to every child's begin", () => {
      const tl = makeTl({ delay: 1 });
      const target = makeEl();
      tl.to(target, { opacity: 0, duration: 0.5 });
      tl.to(target, { opacity: 1, duration: 0.5 });

      const anims = target.querySelectorAll("animate");
      expect(anims[0]!.getAttribute("begin")).toBe("1s");
      expect(anims[1]!.getAttribute("begin")).toBe("1.5s");
    });
  });

  describe("getChildren()", () => {
    it("HAPPY PATH: returns an array of SMILTween instances", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 0.5 });
      tl.to(makeEl(), { opacity: 1, duration: 0.5 });

      const children = tl.getChildren();

      expect(children).toHaveLength(2);
      expect(children[0]).toBeInstanceOf(SMILTween);
    });
  });

  describe("add()", () => {
    it("HAPPY PATH: adds a pre-built SMILTween at the given position", () => {
      const tl = makeTl();
      const target = makeEl();
      const tween = new SMILTween(target, { opacity: 0, duration: 0.5 });

      tl.add(tween, 1);

      expect(tl.children).toHaveLength(1);
      expect(tl.children[0]!.absoluteStart).toBe(1);
    });
  });

  describe("clear()", () => {
    it("HAPPY PATH: empties children", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 0.5 });

      tl.clear();

      expect(tl.children).toHaveLength(0);
    });

    it("HAPPY PATH: resets durationSeconds to 0", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 0.5 });

      tl.clear();

      expect(tl.durationSeconds).toBe(0);
    });

    it("HAPPY PATH: hasBuilt becomes false", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 0.5 });

      tl.clear();

      expect(tl.hasBuilt).toBe(false);
    });

    it("HAPPY PATH: kills injected SMIL children from the DOM", () => {
      const target = makeEl();
      const tl = makeTl();
      tl.to(target, { opacity: 0, duration: 0.5 });

      tl.clear();

      expect(target.childElementCount).toBe(0);
    });

    it("HAPPY PATH: returns this for chaining", () => {
      const tl = makeTl();
      expect(tl.clear()).toBe(tl);
    });
  });

  describe("kill()", () => {
    it("HAPPY PATH: removes all SMIL elements from their targets", () => {
      const target = makeEl();
      const tl = makeTl();
      tl.to(target, { opacity: 0, duration: 0.5 });
      tl.to(target, { opacity: 1, duration: 0.5 });

      tl.kill();

      expect(target.childElementCount).toBe(0);
    });

    it("HAPPY PATH: empties children", () => {
      const tl = makeTl();
      tl.to(makeEl(), { opacity: 0, duration: 0.5 });

      tl.kill();

      expect(tl.children).toHaveLength(0);
    });

    it("HAPPY PATH: returns this for chaining", () => {
      const tl = makeTl();
      expect(tl.kill()).toBe(tl);
    });
  });

  describe("revert()", () => {
    it("HAPPY PATH: restores original attribute values on child targets", () => {
      const target = makeEl();
      target.setAttribute("opacity", "0.8");
      const tl = makeTl();
      tl.to(target, { opacity: 0, duration: 0.5 });

      tl.revert();

      expect(target.getAttribute("opacity")).toBe("0.8");
    });

    it("HAPPY PATH: removes injected SMIL elements", () => {
      const target = makeEl();
      const tl = makeTl();
      tl.to(target, { opacity: 0, duration: 0.5 });

      tl.revert();

      expect(target.childElementCount).toBe(0);
    });

    it("HAPPY PATH: returns this for chaining", () => {
      const tl = makeTl();
      expect(tl.revert()).toBe(tl);
    });
  });
});
