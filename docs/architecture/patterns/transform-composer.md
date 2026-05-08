# <g> Hack — Compound Transforms in SMIL

SMIL's `<animateTransform>` can only animate one transform type at a time. GSAP lets you write `{ x: 100, scale: 1.5, skewX: 10 }` in a single tween. The `<g>` hack bridges this gap.

**Proof-of-concept:** `tests/debug/g-hack/g-hack-isolated.html` — a hand-crafted SMIL animation that matches GSAP's compound transform output frame-for-frame.

## The problem

Three constraints collide:

1. **One type per element** — `<animateTransform type="translate">` can't also do `scale`
2. **Order matters** — `translate × scale` ≠ `scale × translate`; GSAP composes in a fixed order
3. **Origin** — SMIL `scale`/`rotate` always use `(0,0)` as origin; GSAP supports `transformOrigin: "50% 50%"`

## The solution — pivot scaffold

Nested `<g>` elements that isolate each transform type to its own DOM node, with `additive="sum"` so they stack instead of overwriting.

```
<g>                                              ← outer (translate lives here)
  <g transform="translate(cx,cy)">                ← pivot IN: move origin to element center
    <g>                                           ← inner (rotate / scale / skew live here)
      <g transform="translate(-cx,-cy)">           ← pivot OUT: move back
        <rect ... />                               ← actual element
      </g>
    </g>
  </g>
</g>
```

Concrete example from the POC — `x: 50, scale: 1.5, skewX: 10` with `transformOrigin: "50% 50%"` (element center at `(70,40)`):

```xml
<g>
  <!-- TRANSLATE on outer — not affected by scale or skew -->
  <animateTransform type="translate"
    from="0 0" to="50 0" begin="0s" dur="1s" fill="freeze" additive="sum" />

  <g transform="translate(70,40)">       <!-- pivot IN -->
    <g>
      <!-- SCALE on inner — operates around (0,0) in translated space = around (70,40) in world -->
      <animateTransform type="scale"
        from="1 1" to="1.5 1.5" begin="0s" dur="1s" fill="freeze" additive="sum" />

      <!-- SKEWX on inner — same translated space -->
      <animateTransform type="skewX"
        from="0" to="10" begin="0s" dur="1s" fill="freeze" additive="sum" />

      <g transform="translate(-70,-40)">   <!-- pivot OUT -->
        <rect x="50" y="20" width="40" height="40" />
      </g>
    </g>
  </g>
</g>
```

## Why each piece works

### `additive="sum"`

Without it, each `<animateTransform>` would **replace** the element's transform instead of stacking. With `sum`, the SMIL engine post-multiplies: `base × anim1(t) × anim2(t)`. All transforms compose into one matrix.

### Pivot IN / pivot OUT

Scale and rotation always use `(0,0)` as the transform origin. To simulate `transformOrigin: "50% 50%"` (element center), the scaffold:

1. `translate(cx,cy)` — shifts coordinate space so `(0,0)` is now at the element's center
2. Scale/rotate/skew animate around `(0,0)` — which maps to the element's center in world space
3. `translate(-cx,-cy)` — shifts the element back to its original position

The origin is resolved via `getBBox()` (if the element is in the DOM) or parsed from a `transformOrigin` string.

### Canonical order

Transform types must appear in GSAP's composition order. Wrong order = wrong result.

| Position | Transform        | DOM location |
| -------- | ---------------- | ------------ |
| 1        | translate (x, y) | outer `<g>`  |
| 2        | rotate           | inner `<g>`  |
| 3        | scale            | inner `<g>`  |
| 4        | skewX            | inner `<g>`  |
| 5        | skewY            | inner `<g>`  |

Translate lives on the **outer** `<g>` so it's not affected by scale or skew. Rotate, scale, skew live on the **inner** `<g>` so they operate around the pivot origin.

## Multi-segment accumulation

When chaining segments (timeline), each segment's `from` must be the **identity value** because `additive="sum"` stacks on top of previously frozen segments:

```
Segment 1: from="0 0"    to="50 0"     ← add 0→50 on identity = 50 at end
Segment 2: from="0 0"    to="100 0"    ← add 0→100 on frozen 50 = 50→150 ✓
```

Using absolute values (e.g. `from="50 0" to="150 0"`) would double-accumulate: `frozen(50) + 50→150 = 100→200`. **Always use `from=identity` in each segment.**

For scale, this means `from="1 1"` every time — adding a scale factor on top of the frozen scale.

The library's `TransformComposer` outputs whatever values it receives. For single tweens this is fine (values start from identity). For timelines, the caller must compute additive deltas before invoking compose.
