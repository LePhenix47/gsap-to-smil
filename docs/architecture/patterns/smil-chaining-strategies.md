# SMIL Chaining Strategies

Two strategies exist for chaining SMIL animation segments (timeline steps). Each has a proof-of-concept HTML file.

## Strategy 1: `additive="sum"` + delta values

**Proof:** `tests/debug/g-hack/g-hack-isolated.html`

Each segment contributes its **delta** on top of previously frozen segments. Values encode "how much this segment adds," not absolute world positions.

```xml
<!-- Segment 1: add 0→50 -->
<animateTransform type="translate" from="0 0" to="50 0" dur="1s"
  fill="freeze" additive="sum" begin="0s"/>

<!-- Segment 2: add 0→100 on top of frozen 50 = 50→150 -->
<animateTransform type="translate" from="0 0" to="100 0" dur="1s"
  fill="freeze" additive="sum" begin="1s"/>

<!-- Scale: multiply 1→1.5 -->
<animateTransform type="scale" from="1 1" to="1.5 1.5" dur="1s"
  fill="freeze" additive="sum" begin="0s"/>

<!-- Scale: multiply 1→1.333 on top of frozen 1.5 = 1.5→2.0 -->
<animateTransform type="scale" from="1 1" to="1.333 1.333" dur="1s"
  fill="freeze" additive="sum" begin="1s"/>
```

### Value encoding

| Transform | Identity | Delta encoding | Accumulation |
|-----------|----------|---------------|--------------|
| translate | `0 0` | additive: `to` = pixels to add | `frozen + current` |
| scale | `1 1` | multiplicative: `to` = factor to multiply | `frozen × current` |
| rotate | `0 0 0` | additive: `to` = degrees to add | `frozen + current` |
| skewX | `0` | additive: `to` = degrees to add | `frozen + current` |

### Key constraint: from=identity always

Every segment starts from the neutral value. The frozen end state of previous segments provides the base. If `from` is non-identity, SMIL adds the full from→to range on top of the frozen state, causing double-accumulation.

### GSAP ↔ SMIL value mapping

GSAP values are **absolute** (world position at end of each segment). SMIL values must be **deltas** (what this segment contributes).

```
GSAP segment 1: from {x: 0}   to {x: 50}
SMIL segment 1: from="0 0"    to="50 0"     ← delta = 50 - 0 = 50 ✓

GSAP segment 2: from {x: 50}  to {x: 150}
SMIL segment 2: from="0 0"    to="100 0"    ← delta = 150 - 50 = 100 ✓
```

The library's `TransformComposer` does NOT perform this conversion. It passes values through as-is. For single tweens this is correct. For timelines, SMILTimeline must compute deltas before calling compose.

### Works with

- Pivot scaffold (translate on outer `<g>`, scale/skew on inner `<g>`)
- Compound transforms (multiple types in one tween)
- Any number of transform types

### Does not work with

- `additive="replace"` — each segment would overwrite the previous one

## Strategy 2: `additive="replace"` + `begin` chaining + absolute values

**Proof:** `tests/integration/begin-chaining-poc.html`

Each segment defines **absolute** `from`/`to` positions. `fill="freeze"` holds the end state. The next segment's `from` picks up from the frozen value. `additive="replace"` overwrites the previous animation element's output.

```xml
<!-- s1: go to (42, 0) -->
<animateTransform id="s1" type="translate"
  from="0 0" to="42 0" dur="0.35s"
  additive="replace" fill="freeze"
  begin="0s; s5.end+0.35s"/>

<!-- s2: from (42, 0) go to (42, -24) — triggered by s1 ending -->
<animateTransform id="s2" type="translate"
  from="42 0" to="42 -24" dur="0.32s"
  additive="replace" fill="freeze"
  begin="s1.end"/>

<!-- s3: from (42, -24) return to (0, 0) -->
<animateTransform id="s3" type="translate"
  from="42 -24" to="0 0" dur="0.36s"
  additive="replace" fill="freeze"
  begin="s2.end"/>
```

### Value encoding

| Property | Encoding |
|----------|----------|
| `from` | Previous segment's `to` value (absolute continuity anchor) |
| `to` | Absolute target position for this segment |
| `begin` | `previous_element.end` — SMIL instance event chaining |
| `additive` | `replace` — overwrites the frozen previous element |
| `fill` | `freeze` — holds end state for continuity |

### Key constraint: same element, same attribute

Every segment must target the **same attribute** on the **same DOM element**. `replace` overwrites the attribute value of the previous `<animateTransform>` — they must target the same thing.

### GSAP ↔ SMIL value mapping

Values are 1:1 with GSAP. No delta math needed.

```
GSAP segment 1: from {x: 0}   to {x: 50}   → SMIL from="0 0" to="50 0"
GSAP segment 2: from {x: 50}  to {x: 150}  → SMIL from="50 0" to="150 0"
```

### Works with

- Single transform type per chain (all segments are `type="translate"`)
- Simple sequential animation without compound transforms
- `begin` event chaining for precise timing
- Loop-capable via `begin="0s; last_element.end+gap"`

### Does not work with

- Pivot scaffold — scale/skew animate different attributes on different `<g>` elements than translate
- Compound transforms — each type needs its own element, `replace` can't coordinate across them
- `additive="sum"` — would double-accumulate because `from` is non-identity

## Strategy 3: `values=` + `repeatCount="indefinite"` (one element per transform type)

**Proof:** `tests/integration/begin-chaining-poc.html` (version B)

One `<animateTransform>` per transform type per target. The full cycle is encoded in `values=`, `keyTimes=`, and `keySplines=`. `repeatCount="indefinite"` handles looping — SMIL resets to the first keyframe each iteration. No begin chaining, no frozen segments, no cross-cycle accumulation.

```xml
<!-- 5-step cycle, 2.92s, infinite loop — ONE element -->
<animateTransform type="translate" additive="sum"
  values="0 0; 42 0; 42 -24; 42 -24; 0 0; 0 0; -22 0; 0 0; 0 0"
  keyTimes="0; 0.12; 0.229; 0.332; 0.456; 0.558; 0.661; 0.777; 1"
  keySplines="p1inOut; p1out; 0 0 1 1; sineInOut; 0 0 1 1; p1inOut; p1inOut; 0 0 1 1"
  calcMode="spline"
  dur="2.92s"
  repeatCount="indefinite" />
```

### How it works

Each `values=` entry is an absolute position (not a delta). The animation interpolates through the full cycle trajectory. `repeatCount="indefinite"` restarts from keyframe 0 each iteration — no frozen state survives across cycles.

Hold periods (waiting for cross-target sync) use duplicate adjacent values with `keySplines="0 0 1 1"` (linear hold). Active animation segments use GSAP-equivalent easing (power1.inOut, sine.inOut, etc.).

### Per-interval easing

`calcMode="spline"` + per-interval `keySplines` preserves GSAP's per-segment easing. Hold intervals use the identity spline `0 0 1 1` (produces no movement). Active intervals use the appropriate cubic-bezier for that step.

### Stagger

Each target gets its own `keyTimes` adjusted by the stagger offset. The values string is identical across targets — only the timing of when values change differs. Target 3 (slowest) anchors cross-target sync points.

### Scale / skew

Same pattern — one element per type per target. Holds at identity (`1 1` / `0`) during non-active periods, animates during the active window, holds peak, returns to identity at cycle restart.

### Validation

Compared frame-by-frame against `additive="replace"` + begin chaining (strategy 2) over 3 full cycles:

```
cycle 1: max Δ = 0.1px, 0/41 fail frames
cycle 2: max Δ = 0.1px, 0/41 fail frames
cycle 3: max Δ = 0.1px, 0/41 fail frames
```

Zero cross-cycle accumulation. Zero drift. Full data in `tests/debug/begin-chaining-poc/replace-vs-sum-3cycles.log`.

### Works with

- Pivot scaffold (translate on outer `<g>`, scale/skew on inner `<g>`)
- Compound transforms (one element per type, all with `additive="sum"`)
- Infinite loops (`repeatCount="indefinite"` — native, no edge cases)
- Per-segment easing (`calcMode="spline"` + per-interval `keySplines`)
- Stagger (per-target `keyTimes` offset)
- No begin chaining, no `<set>`, no freeze accumulation

### Cost

Must know all timeline segments at build time. Dynamic mid-playback additions require rebuilding the `values=` string and restarting the element. Acceptable for Phase 1 (static tweens) and manageable for Phase 2 (timelines collect children before building).

### Why strategies 1 and 2 failed

| Strategy | Compound transforms | Infinite loops | Why it breaks |
|----------|-------------------|----------------|---------------|
| 1: `sum` + `freeze` + begin chain | ✓ | ✗ | Frozen instances pile up across cycles, deltas don't cancel perfectly at boundaries |
| 2: `replace` + `freeze` + begin chain | ✗ | ✓ | `replace` on same element kills all but one transform type |
| 3: `sum` + `values=` + `repeatCount` | ✓ | ✓ | SMIL handles reset internally, no frozen accumulation |

### `<set>` dead end

Using `<set attributeName="transform">` to snapshot accumulated state between steps was attempted and failed. `<set>` writes a string to `transform` which doesn't compose with `<animateTransform additive="sum">` — the SMIL engine can't mix string-based and matrix-based transform contributions on the same attribute. `tests/integration/begin-chaining-poc.html` version history documents this attempt.

## Decision

**Strategy 3 (`values=` + `repeatCount="indefinite"`) is the library's path.** One element per transform type per target. Full cycle encoded as keyframes. SMIL handles looping natively. Works with pivot scaffold, compound transforms, per-segment easing, stagger, and infinite loops — all proven with frame-level accuracy across multiple cycles.

The library's `SMILTimeline` must:
1. Collect all child tweens before building
2. Compute per-transform-type `values=`, `keyTimes=`, `keySplines=` for the full timeline duration
3. Produce one `<animateTransform>` per type per target with `repeatCount` set appropriately
4. Handle stagger by offsetting per-target `keyTimes`
