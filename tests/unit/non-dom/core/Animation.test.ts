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

    it("HAPPY PATH: defaults — delay=0, repeat=0, repeatDelay=0, yoyo=false, timeScale=1", () => {
      const anim = make();

      expect(anim._delay).toBe(0);
      expect(anim._repeat).toBe(0);
      expect(anim._rDelay).toBe(0);
      expect(anim._yoyo).toBe(false);
      expect(anim._ts).toBe(1);
    });

    it("HAPPY PATH: defaults — dur=0.5, paused=false, reversed=false, initialized=false", () => {
      const anim = make();

      expect(anim._dur).toBe(0.5);
      expect(anim._paused).toBe(false);
      expect(anim._reversed).toBe(false);
      expect(anim._initialized).toBe(false);
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

      expect(anim._dur).toBe(2);
      expect(anim._delay).toBe(0.5);
      expect(anim._repeat).toBe(3);
      expect(anim._rDelay).toBe(0.25);
      expect(anim._yoyo).toBe(true);
      expect(anim._paused).toBe(true);
      expect(anim._reversed).toBe(true);
      expect(anim.data).toEqual({ label: "test" });
    });
  });

  describe("totalDuration calculation", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: repeat=0 → tDur equals dur", () => {
      const anim = make({ duration: 2, repeat: 0 });
      const expected = 2;

      expect(anim._tDur).toBe(expected);
    });

    it("HAPPY PATH: repeat=2 → tDur = dur * 3 (no repeatDelay)", () => {
      const anim = make({ duration: 1, repeat: 2 });
      const expected = 3;

      expect(anim._tDur).toBe(expected);
    });

    it("HAPPY PATH: repeat=2 + repeatDelay=0.5 → tDur = dur*3 + 0.5*2", () => {
      const anim = make({ duration: 1, repeat: 2, repeatDelay: 0.5 });
      const expected = 4;

      expect(anim._tDur).toBe(expected);
    });

    it("HAPPY PATH: repeat=-1 → tDur is Infinity", () => {
      const anim = make({ duration: 1, repeat: -1 });

      expect(anim._tDur).toBe(Infinity);
    });
  });

  describe("duration()", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: getter returns current _dur", () => {
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

    it("HAPPY PATH: setter updates _dur and recalculates _tDur", () => {
      const anim = make({ repeat: 1 });

      anim.duration(4);

      expect(anim._dur).toBe(4);
      expect(anim._tDur).toBe(8);
    });
  });

  describe("totalDuration()", () => {
    // ===== HAPPY PATHS =====

    it("HAPPY PATH: getter returns current _tDur", () => {
      const anim = make({ duration: 2, repeat: 1 });
      const result = anim.totalDuration();
      const expected = 4;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: setter with repeat=0 sets _dur directly", () => {
      const anim = make({ repeat: 0 });

      anim.totalDuration(5);

      expect(anim._dur).toBe(5);
      expect(anim._tDur).toBe(5);
    });

    it("HAPPY PATH: setter with repeat>0 adjusts _dur proportionally", () => {
      const anim = make({ duration: 1, repeat: 3, repeatDelay: 0 });

      anim.totalDuration(8);

      expect(anim._dur).toBe(2);
      expect(anim._tDur).toBe(8);
    });

    it("HAPPY PATH: setter returns this for chaining", () => {
      const anim = make();
      const result = anim.totalDuration(3);

      expect(result).toBe(anim);
    });
  });

  describe("delay()", () => {
    it("HAPPY PATH: getter returns _delay", () => {
      const anim = make({ delay: 1.5 });
      const result = anim.delay();
      const expected = 1.5;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: setter updates _delay and returns this", () => {
      const anim = make();

      const result = anim.delay(2);

      expect(anim._delay).toBe(2);
      expect(result).toBe(anim);
    });
  });

  describe("repeat()", () => {
    it("HAPPY PATH: getter returns _repeat", () => {
      const anim = make({ repeat: 4 });
      const result = anim.repeat();
      const expected = 4;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: setter updates _repeat, recalculates _tDur, and returns this", () => {
      const anim = make({ duration: 2 });

      const result = anim.repeat(2);

      expect(anim._repeat).toBe(2);
      expect(anim._tDur).toBe(6);
      expect(result).toBe(anim);
    });
  });

  describe("repeatDelay()", () => {
    it("HAPPY PATH: getter returns _rDelay", () => {
      const anim = make({ repeatDelay: 0.5 });
      const result = anim.repeatDelay();
      const expected = 0.5;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: setter updates _rDelay, recalculates _tDur, and returns this", () => {
      const anim = make({ duration: 1, repeat: 2 });

      const result = anim.repeatDelay(1);

      expect(anim._rDelay).toBe(1);
      expect(anim._tDur).toBe(5);
      expect(result).toBe(anim);
    });
  });

  describe("yoyo()", () => {
    it("HAPPY PATH: getter returns _yoyo", () => {
      const anim = make({ yoyo: true });
      const result = anim.yoyo();

      expect(result).toBe(true);
    });

    it("HAPPY PATH: setter updates _yoyo and returns this", () => {
      const anim = make();

      const result = anim.yoyo(true);

      expect(anim._yoyo).toBe(true);
      expect(result).toBe(anim);
    });
  });

  describe("timeScale()", () => {
    it("HAPPY PATH: getter returns _ts", () => {
      const anim = make();
      const result = anim.timeScale();
      const expected = 1;

      expect(result).toBe(expected);
    });

    it("HAPPY PATH: setter updates _ts and returns this", () => {
      const anim = make();

      const result = anim.timeScale(2);

      expect(anim._ts).toBe(2);
      expect(result).toBe(anim);
    });
  });

  describe("paused()", () => {
    it("HAPPY PATH: getter returns _paused", () => {
      const anim = make({ paused: true });
      const result = anim.paused();

      expect(result).toBe(true);
    });

    it("HAPPY PATH: setter updates _paused and returns this", () => {
      const anim = make();

      const result = anim.paused(true);

      expect(anim._paused).toBe(true);
      expect(result).toBe(anim);
    });
  });

  describe("reversed()", () => {
    it("HAPPY PATH: getter returns _reversed", () => {
      const anim = make({ reversed: true });
      const result = anim.reversed();

      expect(result).toBe(true);
    });

    it("HAPPY PATH: setter updates _reversed and returns this", () => {
      const anim = make();

      const result = anim.reversed(true);

      expect(anim._reversed).toBe(true);
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
      anim._initialized = true;
      anim._paused = true;

      expect(anim.isActive()).toBe(false);
    });

    it("HAPPY PATH: true when initialized and not paused", () => {
      const anim = make();
      anim._initialized = true;

      expect(anim.isActive()).toBe(true);
    });
  });

  describe("invalidate()", () => {
    it("HAPPY PATH: sets _initialized to false and returns this", () => {
      const anim = make();
      anim._initialized = true;

      const result = anim.invalidate();

      expect(anim._initialized).toBe(false);
      expect(result).toBe(anim);
    });
  });

  describe("then()", () => {
    it("HAPPY PATH: returns a Promise", () => {
      const anim = make({ duration: 0 });
      const result = anim.then();

      expect(result).toBeInstanceOf(Promise);
    });
  });
});
