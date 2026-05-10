// src/utils/animation-debugger.ts
class AnimationDebugger {
  static sample(options) {
    const fps = options.fps ?? 60;
    const frameInterval = 1000 / fps;
    const samples = [];
    const startTime = performance.now();
    const pairMeta = options.pairs.map((pair) => {
      const gsapElement = pair.gsapElement;
      const smilElement = pair.smilElement;
      const gsapSvg = gsapElement.closest("svg");
      const smilSvg = smilElement.closest("svg");
      return {
        gsapElement,
        smilElement,
        label: pair.label ?? "target",
        gsapSvg,
        smilSvg
      };
    });
    return new Promise((resolve) => {
      let lastFrameTime = 0;
      const onFrame = (now) => {
        const elapsed = (now - startTime) / 1000;
        if (now - lastFrameTime >= frameInterval) {
          lastFrameTime = now;
          const framePairs = pairMeta.map((meta) => {
            const gsapRect = meta.gsapElement.getBoundingClientRect();
            const smilRect = meta.smilElement.getBoundingClientRect();
            const gsapSvgRect = meta.gsapSvg ? meta.gsapSvg.getBoundingClientRect() : { left: 0, top: 0 };
            const smilSvgRect = meta.smilSvg ? meta.smilSvg.getBoundingClientRect() : { left: 0, top: 0 };
            const gsapLeft = gsapRect.left - gsapSvgRect.left;
            const gsapTop = gsapRect.top - gsapSvgRect.top;
            const smilLeft = smilRect.left - smilSvgRect.left;
            const smilTop = smilRect.top - smilSvgRect.top;
            const gsapStyle = window.getComputedStyle(meta.gsapElement);
            const smilStyle = window.getComputedStyle(meta.smilElement);
            return {
              label: meta.label,
              gsapLeft,
              gsapTop,
              smilLeft,
              smilTop,
              deltaX: Math.abs(gsapLeft - smilLeft),
              deltaY: Math.abs(gsapTop - smilTop),
              gsapWidth: gsapRect.width,
              gsapHeight: gsapRect.height,
              smilWidth: smilRect.width,
              smilHeight: smilRect.height,
              deltaWidth: Math.abs(gsapRect.width - smilRect.width),
              deltaHeight: Math.abs(gsapRect.height - smilRect.height),
              gsapOpacity: gsapStyle.opacity,
              smilOpacity: smilStyle.opacity,
              gsapFill: gsapStyle.fill,
              smilFill: smilStyle.fill
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
  static formatReport = (samples, reportOptions = {}) => {
    const threshold = reportOptions.threshold ?? 2;
    const showFrameTable = reportOptions.frameTable !== false;
    const maxRows = reportOptions.maxFrameTableRows ?? 200;
    const lines = [
      "─── AnimationDebugger Report ───",
      `frames: ${samples.length}  total duration: ${samples[samples.length - 1]?.elapsed.toFixed(1) ?? "0"}s`,
      ""
    ];
    if (samples.length === 0) {
      lines.push("No samples collected.");
      return lines;
    }
    const pairCount = samples[0].pairs.length;
    const cycles = reportOptions.cycles;
    if (cycles && cycles.length > 0) {
      for (const cycle of cycles) {
        const cycleSamples = samples.filter((frame) => frame.elapsed >= cycle.start && frame.elapsed < cycle.end);
        if (cycleSamples.length === 0) {
          lines.push(`  ${cycle.name}: no samples in window`);
          continue;
        }
        let maxDx = 0, maxDy = 0;
        let avgDx = 0, avgDy = 0, failFrames = 0;
        for (const frame of cycleSamples) {
          let frameDx = 0, frameDy = 0;
          for (const pair of frame.pairs) {
            frameDx += pair.deltaX;
            frameDy += pair.deltaY;
          }
          frameDx /= frame.pairs.length;
          frameDy /= frame.pairs.length;
          avgDx += frameDx;
          avgDy += frameDy;
          if (frameDx > maxDx)
            maxDx = frameDx;
          if (frameDy > maxDy)
            maxDy = frameDy;
          if (frameDx > threshold || frameDy > threshold)
            failFrames++;
        }
        avgDx /= cycleSamples.length;
        avgDy /= cycleSamples.length;
        const pass = maxDx < threshold && maxDy < threshold;
        const icon = pass ? "✓" : "✗";
        lines.push(`${icon} ${cycle.name}: avg Δ=(${avgDx.toFixed(1)}, ${avgDy.toFixed(1)})  ` + `max Δ=(${maxDx.toFixed(1)}, ${maxDy.toFixed(1)})  ` + `fail frames=${failFrames}/${cycleSamples.length}  ${pass ? "PASS" : "FAIL — accumulation detected!"}`);
      }
      lines.push("");
    }
    for (let pairIndex = 0;pairIndex < pairCount; pairIndex++) {
      const label = samples[0].pairs[pairIndex].label;
      let maxDx = 0, maxDy = 0, maxDw = 0, maxDh = 0;
      let failFrames = 0;
      for (const frame of samples) {
        const pair = frame.pairs[pairIndex];
        if (pair.deltaX > maxDx)
          maxDx = pair.deltaX;
        if (pair.deltaY > maxDy)
          maxDy = pair.deltaY;
        if (pair.deltaWidth > maxDw)
          maxDw = pair.deltaWidth;
        if (pair.deltaHeight > maxDh)
          maxDh = pair.deltaHeight;
        if (pair.deltaX > threshold || pair.deltaY > threshold || pair.deltaWidth > threshold || pair.deltaHeight > threshold) {
          failFrames++;
        }
      }
      const pass = failFrames === 0;
      const icon = pass ? "✓" : "✗";
      lines.push(`${icon} ${label}: max Δpos=(${maxDx.toFixed(1)}, ${maxDy.toFixed(1)})  ` + `Δsize=(${maxDw.toFixed(1)}, ${maxDh.toFixed(1)})  ` + `fail frames=${failFrames}/${samples.length}  ${pass ? "PASS" : "FAIL"}`);
      const firstFrame = samples[0].pairs[pairIndex];
      const lastFrame = samples[samples.length - 1].pairs[pairIndex];
      if (firstFrame.gsapOpacity !== firstFrame.smilOpacity || lastFrame.gsapOpacity !== lastFrame.smilOpacity) {
        lines.push(`  opacity: start GSAP=${firstFrame.gsapOpacity} SMIL=${firstFrame.smilOpacity}  ` + `end GSAP=${lastFrame.gsapOpacity} SMIL=${lastFrame.smilOpacity}`);
      }
      if (lastFrame.gsapFill !== lastFrame.smilFill) {
        lines.push(`  fill: GSAP="${lastFrame.gsapFill}" SMIL="${lastFrame.smilFill}"`);
      }
    }
    if (showFrameTable) {
      const frameTableAlways = reportOptions.frameTableAlways === true;
      const frameWindows = cycles && cycles.length > 0 ? cycles.map((c) => ({
        name: c.name,
        window: samples.filter((f) => f.elapsed >= c.start && f.elapsed < c.end)
      })) : [{ name: "", window: samples }];
      for (const { name, window: window2 } of frameWindows) {
        if (window2.length === 0)
          continue;
        this.appendFrameTable(lines, window2, threshold, maxRows, name, frameTableAlways);
      }
    }
    return lines;
  };
  static appendFrameTable = (lines, windowSamples, threshold, maxRows, cycleLabel, always = false) => {
    if (windowSamples.length === 0)
      return;
    let shownRows = 0;
    const pairCount = windowSamples[0].pairs.length;
    for (let pairIndex = 0;pairIndex < pairCount; pairIndex++) {
      const label = windowSamples[0].pairs[pairIndex].label;
      const mismatchFrames = windowSamples.filter((frame) => {
        const pair = frame.pairs[pairIndex];
        return pair.deltaX > threshold || pair.deltaY > threshold || pair.deltaWidth > threshold || pair.deltaHeight > threshold;
      });
      const framesToShow = always && mismatchFrames.length === 0 ? windowSamples.filter((_, frameIndex) => frameIndex % Math.ceil(windowSamples.length / 8) === 0) : mismatchFrames;
      if (framesToShow.length === 0)
        continue;
      const isClean = mismatchFrames.length === 0;
      const heading = cycleLabel ? `${cycleLabel} — ${label} — ${isClean ? "all clean" : mismatchFrames.length + " mismatched"}` : `${label} — ${isClean ? "all clean" : mismatchFrames.length + " mismatched"}`;
      lines.push("");
      lines.push(`─── ${heading} ───`);
      lines.push("time     GSAP(x,y,w×h)         SMIL(x,y,w×h)         Δx   Δy   Δw   Δh");
      lines.push("─".repeat(85));
      for (const frame of framesToShow) {
        if (shownRows >= maxRows)
          break;
        const pair = frame.pairs[pairIndex];
        shownRows++;
        lines.push(`${frame.elapsed.toFixed(2).padStart(6)}s  ` + `(${pair.gsapLeft.toFixed(1).padStart(5)},${pair.gsapTop.toFixed(1).padStart(5)} ` + `${pair.gsapWidth.toFixed(0).padStart(3)}×${pair.gsapHeight.toFixed(0).padStart(3)})  ` + `(${pair.smilLeft.toFixed(1).padStart(5)},${pair.smilTop.toFixed(1).padStart(5)} ` + `${pair.smilWidth.toFixed(0).padStart(3)}×${pair.smilHeight.toFixed(0).padStart(3)})  ` + `${pair.deltaX.toFixed(1).padStart(4)} ${pair.deltaY.toFixed(1).padStart(4)} ` + `${pair.deltaWidth.toFixed(1).padStart(4)} ${pair.deltaHeight.toFixed(1).padStart(4)}`);
      }
      if (shownRows >= maxRows)
        break;
    }
  };
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
