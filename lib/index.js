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
  static PENNER_OVERSHOOT = 1.70158;
  static BACK_INOUT_AMPLITUDE = 1.525;
  static EXPONENT_BASE = 10;
  static EASE_FUNCTIONS = new Map(Object.entries({
    "back.in": (timePosition) => {
      const overshoot = Easing.PENNER_OVERSHOOT;
      const accelerationFactor = overshoot + 1;
      const squaredTime = timePosition * timePosition;
      const overshootTerm = accelerationFactor * timePosition - overshoot;
      const easedProgress = squaredTime * overshootTerm;
      return easedProgress;
    },
    "back.out": (timePosition) => {
      const overshoot = Easing.PENNER_OVERSHOOT;
      const accelerationFactor = overshoot + 1;
      const reversedTime = timePosition - 1;
      const squaredReversed = reversedTime * reversedTime;
      const overshootTerm = accelerationFactor * reversedTime + overshoot;
      const normalizedProgress = squaredReversed * overshootTerm + 1;
      return normalizedProgress;
    },
    "back.inOut": (timePosition) => {
      const overshoot = Easing.PENNER_OVERSHOOT * Easing.BACK_INOUT_AMPLITUDE;
      const accelerationFactor = overshoot + 1;
      const doubledTime = timePosition * 2;
      if (doubledTime < 1) {
        const squaredDouble = doubledTime * doubledTime;
        const overshootTerm2 = accelerationFactor * doubledTime - overshoot;
        const firstHalfProgress = 0.5 * squaredDouble * overshootTerm2;
        return firstHalfProgress;
      }
      const shiftedTime = doubledTime - 2;
      const squaredShifted = shiftedTime * shiftedTime;
      const overshootTerm = accelerationFactor * shiftedTime + overshoot;
      const backOutCore = squaredShifted * overshootTerm;
      const secondHalfProgress = 0.5 * (backOutCore + 2);
      return secondHalfProgress;
    },
    "circ.in": (timePosition) => {
      const squaredTime = timePosition * timePosition;
      const complementRadius = 1 - squaredTime;
      const distanceOnArc = Math.sqrt(complementRadius);
      const easedProgress = 1 - distanceOnArc;
      return easedProgress;
    },
    "circ.out": (timePosition) => {
      const reversedTime = timePosition - 1;
      const squaredReversed = reversedTime * reversedTime;
      const complementRadius = 1 - squaredReversed;
      const easedProgress = Math.sqrt(complementRadius);
      return easedProgress;
    },
    "circ.inOut": (timePosition) => {
      const doubledTime = timePosition * 2;
      if (doubledTime < 1) {
        const squaredDouble = doubledTime * doubledTime;
        const complementRadius2 = 1 - squaredDouble;
        const distanceOnArc2 = Math.sqrt(complementRadius2);
        const distanceFromTop = distanceOnArc2 - 1;
        const firstHalfProgress = -0.5 * distanceFromTop;
        return firstHalfProgress;
      }
      const shiftedTime = doubledTime - 2;
      const squaredShifted = shiftedTime * shiftedTime;
      const complementRadius = 1 - squaredShifted;
      const distanceOnArc = Math.sqrt(complementRadius);
      const secondHalfProgress = 0.5 * (distanceOnArc + 1);
      return secondHalfProgress;
    },
    "expo.in": (timePosition) => {
      if (timePosition === 0)
        return 0;
      const exponent = Easing.EXPONENT_BASE * (timePosition - 1);
      const easedProgress = Math.pow(2, exponent);
      return easedProgress;
    },
    "expo.out": (timePosition) => {
      if (timePosition === 1)
        return 1;
      const exponent = -Easing.EXPONENT_BASE * timePosition;
      const powerValue = Math.pow(2, exponent);
      const easedProgress = 1 - powerValue;
      return easedProgress;
    },
    "expo.inOut": (timePosition) => {
      const isAtBoundary = [0, 1].includes(timePosition);
      if (isAtBoundary)
        return timePosition;
      const doubledTime = timePosition * 2;
      const isFirstHalf = doubledTime < 1;
      if (isFirstHalf) {
        const exponent2 = Easing.EXPONENT_BASE * (doubledTime - 1);
        const powerValue2 = Math.pow(2, exponent2);
        const firstHalfProgress = 0.5 * powerValue2;
        return firstHalfProgress;
      }
      const exponent = -Easing.EXPONENT_BASE * (doubledTime - 1);
      const powerValue = Math.pow(2, exponent);
      const invertedPower = 2 - powerValue;
      const secondHalfProgress = 0.5 * invertedPower;
      return secondHalfProgress;
    }
  }));
  static SAMPLE_CACHE = new Map;
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
  static resolveCalcMode = (ease) => {
    if (ease === undefined || typeof ease === "string" && Easing.isLinearEasing(ease)) {
      return "linear";
    }
    if (typeof ease === "string" && Easing.needsSampling(ease)) {
      return "linear";
    }
    const bezier = Easing.resolveEase(ease);
    if (bezier === null) {
      console.warn(`[gsap-to-smil] "${ease}" cannot be expressed as a single cubic-bezier. Falling back to linear.`);
      return "linear";
    }
    return "spline";
  };
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
  static needsSampling = (ease) => {
    if (ease === undefined || ease === null)
      return false;
    if (Array.isArray(ease))
      return false;
    const normalized = ease.replace(/\(.*\)$/, "");
    const hasEasingFunction = Easing.EASE_FUNCTIONS.has(normalized);
    const isElasticFamily = normalized.startsWith("elastic");
    const isBounceFamily = normalized.startsWith("bounce");
    return hasEasingFunction || isElasticFamily || isBounceFamily;
  };
  static sampleProgress = (ease, pointCount = 20) => {
    const normalized = ease.replace(/\(.*\)$/, "");
    const cacheKey = `${normalized}:${pointCount}`;
    const cachedEntry = Easing.SAMPLE_CACHE.get(cacheKey);
    if (cachedEntry !== undefined)
      return cachedEntry;
    const easingFunction = Easing.EASE_FUNCTIONS.get(normalized);
    if (easingFunction === undefined)
      return null;
    const sampleCount = pointCount;
    const progressValues = [];
    const timeIncrement = 1 / (sampleCount - 1);
    for (let index = 0;index < sampleCount; index++) {
      const timePosition = index * timeIncrement;
      const progressValue = easingFunction(timePosition);
      progressValues.push(progressValue);
    }
    progressValues[0] = easingFunction(0);
    progressValues[sampleCount - 1] = easingFunction(1);
    Easing.SAMPLE_CACHE.set(cacheKey, progressValues);
    return progressValues;
  };
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
