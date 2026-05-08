// src/core/Animation.ts
var animationIdCounter = 0;

class Animation {
  id;
  data;
  parent = null;
  delaySeconds;
  durationSeconds;
  totalDurationSeconds;
  repeatCount;
  repeatDelaySeconds;
  yoyoEnabled;
  pausedState;
  reversedState;
  hasBuilt;
  constructor(vars) {
    const {
      id,
      delay = 0,
      duration = 0.5,
      repeat = 0,
      repeatDelay = 0,
      yoyo = false,
      paused = false,
      reversed = false,
      data = null
    } = vars;
    this.id = id ?? `smil-${++animationIdCounter}`;
    this.delaySeconds = delay;
    this.durationSeconds = duration;
    this.repeatCount = repeat;
    this.repeatDelaySeconds = repeatDelay;
    this.yoyoEnabled = yoyo;
    this.pausedState = paused;
    this.reversedState = reversed;
    this.hasBuilt = false;
    this.data = data;
    this.totalDurationSeconds = this.computeTotalDuration();
  }
  duration = (value) => {
    if (this.isAbsent(value))
      return this.durationSeconds;
    this.durationSeconds = value;
    this.totalDurationSeconds = this.computeTotalDuration();
    return this;
  };
  totalDuration = (value) => {
    if (this.isAbsent(value))
      return this.totalDurationSeconds;
    if (this.repeatCount > 0) {
      const totalPlayCount = this.repeatCount + 1;
      const totalGapTimeSeconds = this.repeatDelaySeconds * this.repeatCount;
      this.durationSeconds = (value - totalGapTimeSeconds) / totalPlayCount;
    } else {
      this.durationSeconds = value;
    }
    this.totalDurationSeconds = value;
    return this;
  };
  delay = (value) => {
    if (this.isAbsent(value))
      return this.delaySeconds;
    this.delaySeconds = value;
    return this;
  };
  repeat = (value) => {
    if (this.isAbsent(value))
      return this.repeatCount;
    this.repeatCount = value;
    this.totalDurationSeconds = this.computeTotalDuration();
    return this;
  };
  repeatDelay = (value) => {
    if (this.isAbsent(value))
      return this.repeatDelaySeconds;
    this.repeatDelaySeconds = value;
    this.totalDurationSeconds = this.computeTotalDuration();
    return this;
  };
  yoyo = (value) => {
    if (this.isAbsent(value))
      return this.yoyoEnabled;
    this.yoyoEnabled = value;
    return this;
  };
  paused = (value) => {
    if (this.isAbsent(value))
      return this.pausedState;
    this.pausedState = value;
    return this;
  };
  reversed = (value) => {
    if (this.isAbsent(value))
      return this.reversedState;
    this.reversedState = value;
    return this;
  };
  isActive = () => this.hasBuilt && !this.pausedState;
  invalidate = () => {
    this.hasBuilt = false;
    return this;
  };
  isAbsent = (value) => !value && ["undefined", "object"].includes(typeof value);
  computeTotalDuration = () => {
    if (this.repeatCount === -1)
      return Infinity;
    const totalPlayDurationSeconds = this.durationSeconds * (this.repeatCount + 1);
    const totalGapSeconds = this.repeatDelaySeconds * this.repeatCount;
    return totalPlayDurationSeconds + totalGapSeconds;
  };
}

// src/core/SMILTween.ts
class SMILTween extends Animation {
}

// src/core/SMILTimeline.ts
class SMILTimeline extends Animation {
}

// src/utils/animation-debugger.ts
class AnimationDebugger {
  static sample(options) {
    const fps = options.fps ?? 60;
    const frameInterval = 1000 / fps;
    const samples = [];
    const startTime = performance.now();
    return new Promise((resolve) => {
      let lastFrameTime = 0;
      const onFrame = (now) => {
        const elapsed = (now - startTime) / 1000;
        if (now - lastFrameTime >= frameInterval) {
          lastFrameTime = now;
          const framePairs = options.pairs.map((pair, i) => {
            const gsapRect = pair.gsapElement.getBoundingClientRect();
            const smilRect = pair.smilElement.getBoundingClientRect();
            return {
              label: pair.label ?? `target[${i}]`,
              gsapLeft: gsapRect.left,
              gsapTop: gsapRect.top,
              smilLeft: smilRect.left,
              smilTop: smilRect.top,
              deltaX: Math.abs(gsapRect.left - smilRect.left),
              deltaY: Math.abs(gsapRect.top - smilRect.top)
            };
          });
          samples.push({
            timestamp: now,
            elapsed: Math.round(elapsed * 1000) / 1000,
            pairs: framePairs
          });
        }
        if (elapsed >= options.duration) {
          resolve(samples);
        } else {
          requestAnimationFrame(onFrame);
        }
      };
      requestAnimationFrame(onFrame);
    });
  }
}
// src/utils/log-writer.ts
var SERVER_URL = "http://localhost:3456/log";
async function writeDebugLog(filename, lines) {
  try {
    await fetch(SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, lines })
    });
  } catch {
    console.warn("Dev server not running — log not saved");
  }
}
// src/utils/easing.ts
class Easing {
  static EASE_MAP = new Map(Object.entries({
    ease: [0.25, 0.1, 0.25, 1],
    "ease-in": [0.42, 0, 1, 1],
    "ease-out": [0, 0, 0.58, 1],
    "ease-in-out": [0.42, 0, 0.58, 1],
    "power1.in": [0.55, 0.085, 0.68, 0.53],
    "power1.out": [0.25, 0.46, 0.45, 0.94],
    "power1.inOut": [0.455, 0.03, 0.515, 0.955],
    "power2.in": [0.55, 0.055, 0.675, 0.19],
    "power2.out": [0.215, 0.61, 0.355, 1],
    "power2.inOut": [0.645, 0.045, 0.355, 1],
    "power3.in": [0.895, 0.03, 0.685, 0.22],
    "power3.out": [0.165, 0.84, 0.44, 1],
    "power3.inOut": [0.77, 0, 0.175, 1],
    "power4.in": [0.755, 0.05, 0.855, 0.06],
    "power4.out": [0.23, 1, 0.32, 1],
    "power4.inOut": [0.86, 0, 0.07, 1],
    "sine.in": [0.47, 0, 0.745, 0.715],
    "sine.out": [0.39, 0.575, 0.565, 1],
    "sine.inOut": [0.445, 0.05, 0.55, 0.95],
    "circ.in": [0.6, 0.04, 0.98, 0.335],
    "circ.out": [0.075, 0.82, 0.165, 1],
    "circ.inOut": [0.785, 0.135, 0.15, 0.86],
    "expo.in": [0.95, 0.05, 0.795, 0.035],
    "expo.out": [0.19, 1, 0.22, 1],
    "expo.inOut": [1, 0, 0, 1],
    "back.in": [0.6, -0.28, 0.735, 0.045],
    "back.out": [0.175, 0.885, 0.32, 1.275],
    "back.inOut": [0.68, -0.55, 0.265, 1.55]
  }));
  static resolveEase(ease) {
    if (Array.isArray(ease)) {
      if (ease.length !== 4) {
        throw new Error(`[gsap-to-smil] cubic-bezier array must have exactly 4 values, got ${ease.length}`);
      }
      return ease;
    }
    if (Easing.isLinearEasing(ease)) {
      return null;
    }
    const normalized = ease.replace(/\(.*\)$/, "");
    if (normalized.startsWith("elastic") || normalized.startsWith("bounce")) {
      return null;
    }
    const bezier = Easing.EASE_MAP.get(normalized);
    if (!bezier) {
      throw new Error(`[gsap-to-smil] Unknown ease "${ease}". Use a named GSAP ease, "linear", or a [x1,y1,x2,y2] array.`);
    }
    return bezier;
  }
  static resolveCalcMode(ease) {
    if (!ease || typeof ease === "string" && Easing.isLinearEasing(ease)) {
      return "linear";
    }
    const bezier = Easing.resolveEase(ease);
    if (!bezier) {
      console.warn(`[gsap-to-smil] "${ease}" cannot be expressed as a single cubic-bezier. Falling back to linear.`);
      return "linear";
    }
    return "spline";
  }
  static resolveKeyTimes(intervalCount) {
    const keyTimesArray = [0];
    const increment = 1 / intervalCount;
    for (let i = 0;i < intervalCount; i++) {
      const previousValue = keyTimesArray.at(-1);
      keyTimesArray.push(previousValue + increment);
    }
    return keyTimesArray.join("; ");
  }
  static resolveKeySplines(ease, intervalCount) {
    if (!intervalCount) {
      throw new Error("[gsap-to-smil] intervalCount must be a positive integer");
    }
    const bezier = Easing.resolveEase(ease);
    if (!bezier) {
      return null;
    }
    const stringBezier = bezier.join(" ");
    const splines = Array.from({ length: intervalCount }, () => stringBezier);
    return splines.join("; ");
  }
  static isLinearEasing(ease) {
    return ["none", "linear"].includes(ease);
  }
}

// src/index.ts
var smil = {
  to: (targets, vars) => new SMILTween(targets, vars),
  from: (targets, vars) => new SMILTween(targets, vars, null, true),
  fromTo: (targets, fromVars, toVars) => new SMILTween(targets, toVars, fromVars),
  set: (targets, vars) => new SMILTween(targets, { ...vars, duration: 0, ease: "none" }),
  timeline: (vars) => new SMILTimeline(vars)
};
export {
  writeDebugLog,
  smil,
  SMILTween,
  SMILTimeline,
  Easing,
  AnimationDebugger,
  Animation
};
