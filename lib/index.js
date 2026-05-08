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
  AnimationDebugger,
  Animation
};
