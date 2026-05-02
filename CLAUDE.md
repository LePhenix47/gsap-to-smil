# gsap-to-smil

A TypeScript library that mirrors the GSAP API but outputs SMIL animations (`<animate>`, `<animateTransform>`, `<animateMotion>`) injected directly into SVG elements — no JS at runtime, runs on the browser's compositor thread.

## Why it exists

GSAP runs on `requestAnimationFrame` (main thread). When the main thread is saturated (e.g. ThreeJS loading GLTF/HDR assets), GSAP animations stutter. SMIL runs on the compositor thread and is immune to this. But writing SMIL by hand is painful. This library lets you write GSAP-style code that outputs SMIL instead.

## Key architectural decision

GSAP interpolates values every frame via rAF. This library runs **once** — generates SMIL elements, injects them into the DOM, then steps back. The browser's SMIL engine handles everything after that. No ticker, no per-frame loop.

## Docs (read these before touching code)

- `docs/reference/smil-reference.md` — full SMIL feature set, gotchas, browser compat, easing table
- `docs/reference/gsap-reference.md` — GSAP API surface this library mirrors
- `docs/reference/mapping-challenges.md` — hard problems when translating GSAP → SMIL (read before implementing anything)
- `docs/architecture/architecture-overview.md` — TL;DR class structure + file layout
- `docs/architecture/architecture.md` — full detailed architecture (verbose)
- `docs/architecture/phases.md` — what's in phase 1/2/3, what's deferred
- `docs/architecture/patterns/` — design notes (property router, transform composer, etc.)
- `docs/testing/testing-strategy.md` — how tests work (visual diff with mix-blend-mode)
- `docs/research/experiment-first.md` — smallest repro before spec reasoning
- `docs/refactor/refactor-plan.md` — refactor direction
- `docs/ai/improve-claude-usage.md` — token / workflow habits for AI-assisted work
- `docs/ai/ai-workflow-and-codebase-pain-points.md` — what hurts when coding this repo with agents

## File structure

```
src/
  index.ts                  — smil facade + public exports
  types.ts                  — TweenVars, TimelineVars, StaggerObject, EaseString…
  core/
    Animation.ts            — base class (mirrors gsap-core.js:1148)
    SMILTween.ts            — single animation (mirrors Tween, gsap-core.js:2320)
    SMILTimeline.ts         — timeline (mirrors Timeline, gsap-core.js:1472)
  utils/
    property-router.ts      — classifies vars keys into transform/attr/plugin/special buckets
    transform-composer.ts   — builds stacked <animateTransform> for compound transforms
    easing.ts               — GSAP ease name → calcMode + keySplines
    stagger-resolver.ts     — computes begin= offsets per target for stagger
    builders.ts             — buildAnimate, buildAnimateTransform, buildAnimateMotion
  plugins/
    SMILPlugin.ts           — abstract base class for plugins
    DrawSMILPlugin.ts       — drawSVG → <animate attributeName="stroke-dashoffset">
    MotionSMILPlugin.ts     — motionPath → <animateMotion>
    MorphSMILPlugin.ts      — morphSVG → <animate attributeName="d">

tests/
  no-plugins.html           — phase 1 + 2 scenarios (transforms, timeline, stagger, attr)
  drawsvg.html              — DrawSVG plugin
  motionpath.html           — MotionPath plugin
  morphsvg.html             — MorphSVG plugin
```

## Current phase

**Phase 1** — core tweens, simple properties. See `docs/architecture/phases.md` for full scope.

`smil.to/from/fromTo/set` with transforms, opacity, fill, stroke, repeat, yoyo, delay, easing. No plugins, no timelines, no `attr:{}`.

## Class hierarchy

```
Animation               ← base, shared playback methods
  ├── SMILTween         ← creates + injects SMIL elements
  └── SMILTimeline      ← resolves timing, writes begin= attributes

smil                    ← facade (smil.to(), smil.timeline()…)
SMILPlugin              ← base for DrawSVG / MotionPath / MorphSVG
```

## Critical constraints

- **Safari**: `<animateTransform>` is NOT hardware-accelerated in WebKit. CSS output (phase 2) is needed for full correctness on Safari.
- **Rotation origin**: SMIL `rotate` needs explicit `cx cy` in parent coordinates. Use `getBBox()` when DOM is available, derive from element attributes when possible, fallback to `0 0` with a warning.
- **Compound transforms**: `x + rotation + scale` in one tween → multiple `<animateTransform>` with `additive="sum"`. Canonical order: translate → rotate → scale → skewX → skewY.
- **`repeat` off-by-one**: GSAP `repeat: 3` = 4 total plays. SMIL `repeatCount="3"` = 3 total plays. Always do `repeatCount = gsapRepeat + 1`.
- **`keySplines` trailing semicolon**: Chrome silently drops the animation. Always strip.
- **Firefox event names**: Only spec-defined mouse events work in SMIL `begin`. `pointerenter`/`pointerleave` silently fail — use `mouseover`/`mouseout`.

## Testing

Each test file loads GSAP + this library side by side, runs the same animation code with `gsap` swapped for `smil`, and has a "Diff" toggle that overlays both SVGs with `mix-blend-mode: difference`. Black = identical, color = bug.

## Stack

- Bun + TypeScript
- No runtime dependencies
- Build: `bun run ts`
