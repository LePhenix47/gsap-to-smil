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
// src/utils/console-interceptor.ts
var ALL_CONSOLE_LEVELS = [
  "log",
  "info",
  "warn",
  "error",
  "debug"
];

class ConsoleInterceptor {
  static install(options) {
    const { levels, serverUrl = "http://localhost:3456" } = options ?? {};
    const activeLevels = levels ?? ALL_CONSOLE_LEVELS;
    const page = window.location.pathname;
    fetch(`${serverUrl}/console/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page })
    }).catch(() => {});
    for (const level of activeLevels) {
      const original = console[level].bind(console);
      console[level] = (...callArguments) => {
        original(...callArguments);
        const serializedArguments = callArguments.map((argument) => typeof argument === "object" ? JSON.stringify(argument) : String(argument));
        fetch(`${serverUrl}/console`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page, level, args: serializedArguments })
        }).catch(() => {});
      };
    }
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
export {
  writeDebugLog,
  ConsoleInterceptor,
  AnimationDebugger
};
