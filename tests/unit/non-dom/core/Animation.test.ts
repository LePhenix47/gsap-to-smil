// fallow-ignore-file
import { describe, expect, it } from "bun:test";
import { Animation } from "@/core/Animation.ts";

class TestAnimation extends Animation {
  kill = (): this => this;
  revert = (): this => this;
}

const make = (vars: ConstructorParameters<typeof TestAnimation>[0] = {}) =>
  new TestAnimation(vars);

describe("Animation", () => {
  describe("constructor", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: auto-generated id matches smil-N pattern", () => {
      const result = make().id;

      expect(result).toMatch(/^smil-\d+$/);
    });

    it("HAPPY PATH: custom id from vars.id is used as-is", () => {
      const result = make({ id: "my-anim" }).id;
      const expected = "my-anim";

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: defaults — delay=0, repeat=0, repeatDelay=0, yoyo=false", () => {
      const anim = make();

      expect(anim.delaySeconds).toBe(0);
      expect(anim.repeatCount).toBe(0);
      expect(anim.repeatDelaySeconds).toBe(0);
      expect(anim.yoyoEnabled).toBe(false);
    });

    it("HAPPY PATH: defaults — dur=0.5, paused=false, reversed=false, initialized=false", () => {
      const anim = make();

      expect(anim.durationSeconds).toBe(0.5);
      expect(anim.pausedState).toBe(false);
      expect(anim.reversedState).toBe(false);
      expect(anim.hasBuilt).toBe(false);
    });

    it("HAPPY PATH: defaults — data=null, parent=null", () => {
      const anim = make();

      expect(anim.data).toBeNull();
      expect(anim.parent).toBeNull();
    });

    it("HAPPY PATH: vars values override all defaults", () => {
      const anim = make({
        duration: 2,
        delay: 0.5,
        repeat: 3,
        repeatDelay: 0.25,
        yoyo: true,
        paused: true,
        reversed: true,
        data: { label: "test" },
      });

      expect(anim.durationSeconds).toBe(2);
      expect(anim.delaySeconds).toBe(0.5);
      expect(anim.repeatCount).toBe(3);
      expect(anim.repeatDelaySeconds).toBe(0.25);
      expect(anim.yoyoEnabled).toBe(true);
      expect(anim.pausedState).toBe(true);
      expect(anim.reversedState).toBe(true);
      expect(anim.data).toEqual({ label: "test" });
    });
  });

  describe("totalDuration calculation", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: repeat=0 → tDur equals dur", () => {
      const anim = make({ duration: 2, repeat: 0 });
      const expected = 2;

      expect(anim.totalDurationSeconds).toBe(expected);
    });

    it("HAPPY PATH: repeat=2 → tDur = dur * 3 (no repeatDelay)", () => {
      const anim = make({ duration: 1, repeat: 2 });
      const expected = 3;

      expect(anim.totalDurationSeconds).toBe(expected);
    });

    it("HAPPY PATH: repeat=2 + repeatDelay=0.5 → tDur = dur*3 + 0.5*2", () => {
      const anim = make({ duration: 1, repeat: 2, repeatDelay: 0.5 });
      const expected = 4;

      expect(anim.totalDurationSeconds).toBe(expected);
    });

    it("HAPPY PATH: repeat=-1 → tDur is Infinity", () => {
      const anim = make({ duration: 1, repeat: -1 });

      expect(anim.totalDurationSeconds).toBe(Infinity);
    });
  });

  describe("duration()", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: getter returns current durationSeconds", () => {
      const anim = make({ duration: 3 });
      const result = anim.duration();
      const expected = 3;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: setter returns this for chaining", () => {
      const anim = make();
      const result = anim.duration(2);

      expect(result).toBe(anim);
    });

    it("HAPPY PATH: setter updates durationSeconds and recalculates totalDurationSeconds", () => {
      const anim = make({ repeat: 1 });

      anim.duration(4);

      expect(anim.durationSeconds).toBe(4);
      expect(anim.totalDurationSeconds).toBe(8);
    });
  });

  describe("totalDuration()", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: getter returns current totalDurationSeconds", () => {
      const anim = make({ duration: 2, repeat: 1 });
      const result = anim.totalDuration();
      const expected = 4;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: setter with repeat=0 sets durationSeconds directly", () => {
      const anim = make({ repeat: 0 });

      anim.totalDuration(5);

      expect(anim.durationSeconds).toBe(5);
      expect(anim.totalDurationSeconds).toBe(5);
    });

    it("HAPPY PATH: setter with repeat>0 adjusts durationSeconds proportionally", () => {
      const anim = make({ duration: 1, repeat: 3, repeatDelay: 0 });

      anim.totalDuration(8);

      expect(anim.durationSeconds).toBe(2);
      expect(anim.totalDurationSeconds).toBe(8);
    });

    it("HAPPY PATH: setter returns this for chaining", () => {
      const anim = make();
      const result = anim.totalDuration(3);

      expect(result).toBe(anim);
    });
  });

  describe("delay()", () => {
    it("HAPPY PATH: getter returns delaySeconds", () => {
      const anim = make({ delay: 1.5 });
      const result = anim.delay();
      const expected = 1.5;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: setter updates delaySeconds and returns this", () => {
      const anim = make();

      const result = anim.delay(2);

      expect(anim.delaySeconds).toBe(2);
      expect(result).toBe(anim);
    });
  });

  describe("repeat()", () => {
    it("HAPPY PATH: getter returns repeatCount", () => {
      const anim = make({ repeat: 4 });
      const result = anim.repeat();
      const expected = 4;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: setter updates repeatCount, recalculates totalDurationSeconds, and returns this", () => {
      const anim = make({ duration: 2 });

      const result = anim.repeat(2);

      expect(anim.repeatCount).toBe(2);
      expect(anim.totalDurationSeconds).toBe(6);
      expect(result).toBe(anim);
    });
  });

  describe("repeatDelay()", () => {
    it("HAPPY PATH: getter returns repeatDelaySeconds", () => {
      const anim = make({ repeatDelay: 0.5 });
      const result = anim.repeatDelay();
      const expected = 0.5;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: setter updates repeatDelaySeconds, recalculates totalDurationSeconds, and returns this", () => {
      const anim = make({ duration: 1, repeat: 2 });

      const result = anim.repeatDelay(1);

      expect(anim.repeatDelaySeconds).toBe(1);
      expect(anim.totalDurationSeconds).toBe(5);
      expect(result).toBe(anim);
    });
  });

  describe("yoyo()", () => {
    it("HAPPY PATH: getter returns yoyoEnabled", () => {
      const anim = make({ yoyo: true });
      const result = anim.yoyo();

      expect(result).toBe(true);
    });

    it("HAPPY PATH: setter updates yoyoEnabled and returns this", () => {
      const anim = make();

      const result = anim.yoyo(true);

      expect(anim.yoyoEnabled).toBe(true);
      expect(result).toBe(anim);
    });
  });


  describe("paused()", () => {
    it("HAPPY PATH: getter returns pausedState", () => {
      const anim = make({ paused: true });
      const result = anim.paused();

      expect(result).toBe(true);
    });

    it("HAPPY PATH: setter updates pausedState and returns this", () => {
      const anim = make();

      const result = anim.paused(true);

      expect(anim.pausedState).toBe(true);
      expect(result).toBe(anim);
    });
  });

  describe("reversed()", () => {
    it("HAPPY PATH: getter returns reversedState", () => {
      const anim = make({ reversed: true });
      const result = anim.reversed();

      expect(result).toBe(true);
    });

    it("HAPPY PATH: setter updates reversedState and returns this", () => {
      const anim = make();

      const result = anim.reversed(true);

      expect(anim.reversedState).toBe(true);
      expect(result).toBe(anim);
    });
  });

  describe("isActive()", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: false when not initialized", () => {
      const anim = make();

      expect(anim.isActive()).toBe(false);
    });

    it("HAPPY PATH: false when initialized but paused", () => {
      const anim = make();
      anim.hasBuilt = true;
      anim.pausedState = true;

      expect(anim.isActive()).toBe(false);
    });

    it("HAPPY PATH: true when initialized and not paused", () => {
      const anim = make();
      anim.hasBuilt = true;

      expect(anim.isActive()).toBe(true);
    });
  });

  describe("invalidate()", () => {
    it("HAPPY PATH: sets hasBuilt to false and returns this", () => {
      const anim = make();
      anim.hasBuilt = true;

      const result = anim.invalidate();

      expect(anim.hasBuilt).toBe(false);
      expect(result).toBe(anim);
    });
  });

});
