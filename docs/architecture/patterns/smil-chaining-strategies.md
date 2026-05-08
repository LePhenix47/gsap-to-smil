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

## Decision

**Strategy 1 (`additive="sum"` + deltas) is the library's path.** It's the only strategy that supports the pivot scaffold, which is mandatory for `scale`/`skew` with custom `transformOrigin`. Strategy 2 proves SMIL timelines are possible but can't handle the library's full transform API.

The delta computation (GSAP absolute → SMIL additive) must live in SMILTimeline, not in TransformComposer. TransformComposer outputs whatever values it receives — the timeline is responsible for computing deltas before calling compose.
