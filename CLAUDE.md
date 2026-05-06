# gsap-to-smil

A TypeScript library that mirrors the GSAP API but outputs SMIL animations (`<animate>`, `<animateTransform>`, `<animateMotion>`) injected directly into SVG elements — no JS at runtime, runs on the browser's compositor thread.

## Why it exists

GSAP runs on `requestAnimationFrame` (main thread). When the main thread is saturated (e.g. ThreeJS loading GLTF/HDR assets), GSAP animations stutter. SMIL runs on the compositor thread and is immune to this. But writing SMIL by hand is painful. This library lets you write GSAP-style code that outputs SMIL instead.

## Key architectural decision

GSAP interpolates values every frame via rAF. This library runs **once** — generates SMIL elements, injects them into the DOM, then steps back. The browser's SMIL engine handles everything after that. No ticker, no per-frame loop.

## CRITICAL: Mandatory Workflow

**BEFORE modifying ANY file, you MUST follow this exact process:**

### 1. Identify File Type & Load ALL Relevant Skills

Based on the file you're working on, read **ALL** skills in the category:

| File Type | Skills to Read (ALL of them) |
|-----------|------------------------------|
| `.ts` files (src/) | Read ALL files in `.claude/skills/typescript/` |
| `.ts` files (tests/) | Read ALL files in `.claude/skills/typescript/` |
| `.html` test files | Follow existing test patterns — no skill files needed |
| Git commits | Read `.claude/skills/git/commit-message-format/SKILL.md` |

**You MUST read ALL skills in the category, not pick and choose. Reading 6/8 skills means you'll miss 2 important conventions.**

### 2. Verification Checklist (Before Declaring Complete)

After making changes, verify you haven't violated ANY of these rules:

#### Code Quality (from `code-conventions`)
- [ ] No underscore prefixes on fields (`durationSeconds` not `_dur`)
- [ ] Explicit field names (`repeatCount` not `_repeat`, `hasBuilt` not `_initialized`)
- [ ] Intermediate calculations broken out into named variables with type annotations
- [ ] No `=== undefined` — use `isAbsent` type guard pattern
- [ ] Arrow functions for ALL concrete methods (regular syntax only for `abstract`)

#### TypeScript Patterns (from all 7 pattern skills)
- [ ] Destructured all objects at top of function (no repeated `obj.prop`)
- [ ] Used guard clauses (early returns, no deep nesting)
- [ ] Used `unknown` instead of `any`
- [ ] Used `type` not `interface`
- [ ] Used optional chaining (`?.`) where appropriate
- [ ] Used type guards for union discrimination
- [ ] Used Map for simple lookups, switch only for complex logic

#### Project-Specific
- [ ] Read relevant docs before implementing (see Docs section below)
- [ ] Experiment-first: if hitting a limitation, build minimal HTML repro first (see `docs/research/experiment-first.md`)
- [ ] `repeatCount = gsapRepeat + 1` (SMIL off-by-one)
- [ ] No trailing semicolon in `keySplines`
- [ ] Transform order: translate → rotate → scale → skewX → skewY

### 3. Mandatory Post-Change Checks

Run ALL THREE before claiming any task is done:

```
bun run ts-types && bun run ts   ← TypeScript types + build
bun run test                     ← full test suite (unit + smoke)
bun run ai-slop-check            ← Fallow code quality (dead code, duplication, complexity)
```

All three must pass clean. Fix failures before reporting completion. Run in parallel when possible.

### 4. If You Skip This Process

If you modify code without reading ALL relevant skills first, you WILL:
- Use underscore-prefixed fields that violate project conventions
- Write `=== undefined` checks that the codebase rejects
- Inline complex math without intermediate variables
- Miss TypeScript patterns (guard clauses, destructuring, type guards)
- Create inconsistent code that the user must correct

**There is NO excuse to skip reading all relevant skills. Period.**

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
- `docs/ai/claude-code-nate-herk-32-tricks.md` — Claude Code product tips (Nate Herk video notes)
- `docs/ai/ai-workflow-and-codebase-pain-points.md` — what hurts when coding this repo with agents
- `docs/ai/fallow.md` — Fallow (codebase cleanup) — quick pointer + links
- `docs/ai/caveman.md` — Caveman plugin (terse Claude Code replies)
- `docs/ai/deepseek-claude-code-jack-roberts.md` — DeepSeek V4 backend for Claude Code (cost / setup pointer)

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

## Skills

Project-specific conventions and workflows live in `.claude/skills/` — read them before working:

### Debugging workflow (apply before touching library code)

- `manual-debug` — experiment-first: isolate in hand-crafted SMIL + GSAP test, compare numerically with `AnimationDebugger.sample()`, iterate until deltas match, then port to library. Use when user says "debug X manually", "let's isolate", "prove it first". Also trigger proactively when user reports GSAP-vs-SMIL mismatch.

### Code quality (read before writing any `.ts` file)

- `code-conventions` — zero-tolerance rules: no underscores, explicit field names, broken-out intermediate calculations, no `=== undefined`, arrow methods only
- `no-abbreviations` — full words only: `element` not `el`, `animationOptions` not `opts`, `animationElement` not `anim`

### TypeScript patterns (read before writing any `.ts` file)

- `use-guard-clauses` — early returns, no deep nesting
- `destructure-objects-always` — destructure instead of repeated `obj.prop`
- `prefer-unknown-over-any` — never use `any`
- `type-vs-interface` — always `type`, never `interface`
- `use-optional-chaining` — `?.` over manual null checks
- `type-guards-for-unions` — explicit `value is Type` functions
- `map-vs-switch-lookup` — Map for simple lookups, switch for complex logic only
- `one-return-value-per-method` — split compound returns into single-value methods

## Testing

Each test file loads GSAP + this library side by side, runs the same animation code with `gsap` swapped for `smil`, and has a "Diff" toggle that overlays both SVGs with `mix-blend-mode: difference`. Black = identical, color = bug.

## Stack

- Bun + TypeScript
- No runtime dependencies
- Build: `bun run ts`
