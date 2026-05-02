# Refactor Plan

## Modus operandi

Before touching any class:

1. Hit a hurdle → see `docs/research/experiment-first.md`
2. Build the animation by hand in a standalone HTML file (`tests/integration/`)
3. Fix it until it looks identical to GSAP in the browser
4. That file becomes the **spec** — the class output must match its structure
5. Only then implement in the classes

---

## TODOs

### 1. Debug tooling (integration HTML files only, not the library)

- [ ] **Position sampler** — given a list of timestamps, log each element's computed x/y/scale/opacity/skewX at those times as a table. Paste into chat to diagnose timing issues without needing to see the browser.
- [ ] **Diff snapshot** — button or auto-trigger at timeline end: capture GSAP vs SMIL element states side by side and highlight mismatches. Complements the existing `mix-blend-mode: difference` overlay with discrete, readable numbers.

### 2. Rebuild `SMILTween.ts` from scratch

Current problems:
- `_pendingInjections` / `_timelineAccum` / deferred build are hacks for timeline compatibility bolted on after the fact
- Single class handles target resolution, element building, stagger encoding, yoyo encoding, playback, and cleanup — too many responsibilities
- Built around the old absolute-time model

Target design:
- **SMILTween is a pure builder** — given targets + vars, produces configured `SVGAnimationElement[]` with only relative timing (stagger offsets, no absolute begin)
- No injection, no timeline awareness, no pending queue
- Timeline handles all injection and begin= assignment

### 3. Rebuild `SMILTimeline.ts` from scratch

Current problems:
- `_rewriteBegin` / absolute pre-computed begin times were designed before chain anchors were discovered
- Chain anchor fields added as an afterthought on top of the old model
- Transform accumulation (`_transformAccum`) reaches into tween internals awkwardly

Target design:
- **SMILTimeline is the orchestrator** — owns all injection, chain anchor assignment, and transform accumulation
- Uses `begin="anchorId.end[+offset]"` chaining natively, not as an afterthought
- First tween gets absolute `begin=`; every subsequent tween chains from the previous anchor
- Offset formula: `absoluteStart - prevEnd + staggerOffset` (handles sequential, overlap, and gap)

### 4. General readability

- Keep files under ~300 lines
- One responsibility per method, one concern per section
- No method that does both "compute a value" and "write to the DOM"

Read skill files in .claude/skills