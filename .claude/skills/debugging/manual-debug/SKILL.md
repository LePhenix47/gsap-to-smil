---
name: manual-debug
description: Numerical debugging for any gsap-to-smil feature. Use when user says "debug X manually", "let's isolate this", "prove it works first". Also trigger proactively when user reports GSAP-vs-SMIL mismatch — suggest isolating before implementing fixes.
---

# Manual Debug Workflow

Experiment before implementation. Library code is complex — TransformComposer, SMILTween, SMILTimeline, builders, easing all interact. A hand-crafted test proves the fix works in isolation before touching any library code.

## When to trigger

- User says "debug X manually", "let's isolate", "prove it first"
- Bug involves transform math, easing values, pivot scaffold, stagger offsets
- Any numerical mismatch between GSAP and SMIL output

**Proactive rule**: if user describes a mismatch without mentioning debugging method, ask: "Want me to isolate this in a hand-crafted test first?"

## The workflow

### 0. Start the dev log server

```bash
bun run dev-server
```

Keeps running on `http://localhost:3456`. Debug HTML pages POST their log output to `POST /log` — the server writes `tests/debug/<name>.log` automatically. No more manual copy-paste.

### 1. Create isolated test file

Create `tests/debug/<feature-name>.html`. It must contain:

- **One SVG** with both GSAP and SMIL elements side by side (same coordinate space)
- **GSAP side**: `gsap.timeline()` or `gsap.to()` with the target properties
- **SMIL side**: raw `<animate>` / `<animateTransform>` — no library code
- Import `AnimationDebugger` from `../../lib/index.js`
- Import GSAP from CDN

Template:
```html
<svg id="svg" width="500" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect id="gsap-el" .../>         <!-- GSAP reference -->
  <rect id="smil-el" ...>           <!-- SMIL, hand-crafted -->
    <animateTransform .../>
  </rect>
</svg>
<pre id="output">Sampling...</pre>
<script type="module">
  import gsap from "https://cdn.jsdelivr.net/npm/gsap@3/+esm";
  import { AnimationDebugger, writeDebugLog } from "../../lib/index.js";
  // GSAP animation setup ...
  // AnimationDebugger.sample() call ...
  // Normalize coords by subtracting svg.getBoundingClientRect()
  // Print per-frame deltas to <pre>
  // writeDebugLog("test-name", lines);  // auto-saves to tests/debug/test-name.log
</script>
```

### 2. Rebuild and open

```bash
bun run ts
start "" "tests/debug/<feature-name>.html"
```

Both elements must be in the **same SVG** so `getBoundingClientRect()` coordinates are directly comparable. Normalize by subtracting the SVG container position.

The page auto-POSTs log output to the dev server (step 0). If the server isn't running, logs still render in `<pre>` — the `writeDebugLog` call silently fails.

### 3. Read the log

The numerical output goes to `<pre>` and also gets saved to `tests/debug/<feature-name>.log`. Read it with the Read tool — you cannot see the browser.

Look for:
- **t=0 deltas**: near zero? (same starting position)
- **End-of-tween deltas**: where does mismatch appear?
- **Max deltas**: worst deviation
- **Post-freeze deltas**: stable or drifting?

### 4. Diagnose and fix

Common root causes:

| Symptom | Likely cause |
|---------|-------------|
| Large constant Δx from t=0 | Different SVG positions, not in same coordinate space |
| Δx grows with scale animation | `additive="sum"` compounding — `to` value must be `desired / frozen`, not absolute |
| Δx after second tween | DOM animation order wrong — insert at correct canonical position |
| Δy offset after scale | Origin mismatch — GSAP pixel origins are viewport-relative, use `"50% 50%"` |

Canonical `<animateTransform>` DOM order: **translate → rotate → scale → skewX → skewY**. When adding animations to an existing scaffold, insert at correct position.

With `additive="sum"`, values are relative to frozen state:
- **translate**: `to = desired - frozen`
- **scale**: `to = desired / frozen`
- **skew/rotate**: `to = desired - frozen`

Dump raw GSAP `transform` attribute + SMIL group `getBBox()` after animations finish to compare matrices:
```js
lines.push(`GSAP transform: ${el.getAttribute("transform")}`);
lines.push(`SMIL outerG BBox: ${outerG.getBBox()}`);
```

### 5. Verify match

Once `max Δx < 1px` and `max Δy < 1px` at t=final: **success**. Small deltas during animation (1-2px) are rAF vs SMIL native timeline sync jitter — expected.

Summarize discovered rules, then port to library code.

## Reference: `g-hack-isolated.html`

`tests/debug/g-hack-isolated.html` is the reference implementation for pivot scaffold debugging. It demonstrates three test SVGs (sanity checks + full test), GSAP `"50% 50%"` vs SMIL scaffold comparison, DOM insertion order fix, and raw matrix inspection.
