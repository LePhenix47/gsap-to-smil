type ElementPair = {
  gsapElement: Element;
  smilElement: Element;
  label?: string;
};

type FramePairSample = {
  label: string;
  // Position (SVG-local)
  gsapLeft: number;
  gsapTop: number;
  smilLeft: number;
  smilTop: number;
  deltaX: number;
  deltaY: number;
  // Size (captures scale changes)
  gsapWidth: number;
  gsapHeight: number;
  smilWidth: number;
  smilHeight: number;
  deltaWidth: number;
  deltaHeight: number;
  // Visual properties
  gsapOpacity: string;
  smilOpacity: string;
  gsapFill: string;
  smilFill: string;
};

export type FrameSample = {
  timestamp: number;
  elapsed: number;
  pairs: FramePairSample[];
};

export type SampleOptions = {
  pairs: ElementPair[];
  duration: number;
  fps?: number;
};

export type ReportOptions = {
  threshold?: number;
  frameTable?: boolean;
  maxFrameTableRows?: number;
};

export class AnimationDebugger {
  static sample(options: SampleOptions): Promise<FrameSample[]> {
    const fps = options.fps ?? 60;
    const frameInterval = 1000 / fps;

    const samples: FrameSample[] = [];
    const startTime = performance.now();

    // Cache SVG rects per pair (they don't move during sampling)
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
        smilSvg,
      };
    });

    return new Promise((resolve) => {
      let lastFrameTime = 0;

      const onFrame = (now: number) => {
        const elapsed = (now - startTime) / 1000;

        if (now - lastFrameTime >= frameInterval) {
          lastFrameTime = now;

          const framePairs: FramePairSample[] = pairMeta.map((meta) => {
            const gsapRect = meta.gsapElement.getBoundingClientRect();
            const smilRect = meta.smilElement.getBoundingClientRect();

            // SVG-local normalization
            const gsapSvgRect = meta.gsapSvg
              ? meta.gsapSvg.getBoundingClientRect()
              : { left: 0, top: 0 };
            const smilSvgRect = meta.smilSvg
              ? meta.smilSvg.getBoundingClientRect()
              : { left: 0, top: 0 };

            const gsapLeft = gsapRect.left - gsapSvgRect.left;
            const gsapTop = gsapRect.top - gsapSvgRect.top;
            const smilLeft = smilRect.left - smilSvgRect.left;
            const smilTop = smilRect.top - smilSvgRect.top;

            // Visual properties
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
              smilFill: smilStyle.fill,
            };
          });

          samples.push({
            timestamp: now,
            elapsed: Math.round(elapsed * 1000) / 1000,
            pairs: framePairs,
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

  /** Formats samples into a human-readable report string array. */
  static formatReport = (
    samples: FrameSample[],
    reportOptions: ReportOptions = {},
  ): string[] => {
    const threshold = reportOptions.threshold ?? 2;
    const showFrameTable = reportOptions.frameTable !== false;
    const maxRows = reportOptions.maxFrameTableRows ?? 200;

    const lines: string[] = [
      "─── AnimationDebugger Report ───",
      `frames: ${samples.length}  total duration: ${samples[samples.length - 1]?.elapsed.toFixed(1) ?? "0"}s`,
      "",
    ];

    if (samples.length === 0) {
      lines.push("No samples collected.");
      return lines;
    }

    const pairCount = samples[0].pairs.length;

    for (let pairIndex = 0; pairIndex < pairCount; pairIndex++) {
      const label = samples[0].pairs[pairIndex].label;

      let maxDx = 0, maxDy = 0, maxDw = 0, maxDh = 0;
      let failFrames = 0;

      for (const frame of samples) {
        const pair = frame.pairs[pairIndex];
        if (pair.deltaX > maxDx) maxDx = pair.deltaX;
        if (pair.deltaY > maxDy) maxDy = pair.deltaY;
        if (pair.deltaWidth > maxDw) maxDw = pair.deltaWidth;
        if (pair.deltaHeight > maxDh) maxDh = pair.deltaHeight;
        if (
          pair.deltaX > threshold
          || pair.deltaY > threshold
          || pair.deltaWidth > threshold
          || pair.deltaHeight > threshold
        ) {
          failFrames++;
        }
      }

      const pass = failFrames === 0;
      const icon = pass ? "✓" : "✗";

      lines.push(
        `${icon} ${label}: max Δpos=(${maxDx.toFixed(1)}, ${maxDy.toFixed(1)})  ` +
        `Δsize=(${maxDw.toFixed(1)}, ${maxDh.toFixed(1)})  ` +
        `fail frames=${failFrames}/${samples.length}  ${pass ? "PASS" : "FAIL"}`,
      );

      // Opacity check from first and last frame
      const firstFrame = samples[0].pairs[pairIndex];
      const lastFrame = samples[samples.length - 1].pairs[pairIndex];
      if (firstFrame.gsapOpacity !== firstFrame.smilOpacity || lastFrame.gsapOpacity !== lastFrame.smilOpacity) {
        lines.push(
          `  opacity: start GSAP=${firstFrame.gsapOpacity} SMIL=${firstFrame.smilOpacity}  ` +
          `end GSAP=${lastFrame.gsapOpacity} SMIL=${lastFrame.smilOpacity}`,
        );
      }

      // Fill check
      if (lastFrame.gsapFill !== lastFrame.smilFill) {
        lines.push(`  fill: GSAP="${lastFrame.gsapFill}" SMIL="${lastFrame.smilFill}"`);
      }
    }

    // Frame-by-frame table (only if mismatches exist)
    if (showFrameTable) {
      let shownRows = 0;

      for (const [pairIndex, label] of samples[0].pairs.map((p, i) => [i, p.label] as const)) {
        const mismatchFrames = samples.filter((frame) => {
          const pair = frame.pairs[pairIndex];
          return pair.deltaX > threshold || pair.deltaY > threshold
            || pair.deltaWidth > threshold || pair.deltaHeight > threshold;
        });

        if (mismatchFrames.length === 0) continue;

        lines.push("");
        lines.push(`─── ${label} — ${mismatchFrames.length} mismatched frames ───`);
        lines.push("time     GSAP(x,y,w×h)         SMIL(x,y,w×h)         Δx   Δy   Δw   Δh");
        lines.push("─".repeat(85));

        for (const frame of samples) {
          if (shownRows >= maxRows) break;

          const pair = frame.pairs[pairIndex];
          const hasMismatch = pair.deltaX > threshold || pair.deltaY > threshold
            || pair.deltaWidth > threshold || pair.deltaHeight > threshold;

          if (!hasMismatch) continue;

          shownRows++;
          lines.push(
            `${frame.elapsed.toFixed(2).padStart(6)}s  ` +
            `(${pair.gsapLeft.toFixed(1).padStart(5)},${pair.gsapTop.toFixed(1).padStart(5)} ` +
            `${pair.gsapWidth.toFixed(0).padStart(3)}×${pair.gsapHeight.toFixed(0).padStart(3)})  ` +
            `(${pair.smilLeft.toFixed(1).padStart(5)},${pair.smilTop.toFixed(1).padStart(5)} ` +
            `${pair.smilWidth.toFixed(0).padStart(3)}×${pair.smilHeight.toFixed(0).padStart(3)})  ` +
            `${pair.deltaX.toFixed(1).padStart(4)} ${pair.deltaY.toFixed(1).padStart(4)} ` +
            `${pair.deltaWidth.toFixed(1).padStart(4)} ${pair.deltaHeight.toFixed(1).padStart(4)}`,
          );
        }

        if (shownRows >= maxRows) break;
      }
    }

    return lines;
  };
}
