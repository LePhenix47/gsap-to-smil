# Transform Origin — Constraint Map & Study Plan

## What we know for certain

SMIL transform primitives and their origin support:

| type | value syntax | built-in origin |
|---|---|---|
| `translate` | `tx [ty]` | n/a — no origin concept |
| `rotate` | `angle [cx cy]` | ✅ yes — cx/cy in value |
| `scale` | `sx [sy]` | ❌ no |
| `skewX` | `angle` | ❌ no |
| `skewY` | `angle` | ❌ no |

---

## What our compensation actually does — and whether it's correct

For scale around origin (cx, cy), we encode:

```
translate.from = (cx*(1-fromSx), cy*(1-fromSy))
translate.to   = (cx*(1-toSx),   cy*(1-toSy))
scale.from     = (fromSx, fromSy)
scale.to       = (toSx,   toSy)
```

SMIL linearly interpolates both simultaneously. At time `t`:

```
translate(t) = lerp(from_tx, to_tx, t)
             = cx*(1 - lerp(fromSx, toSx, t))
             = cx*(1 - sx(t))         ← exactly correct
```

**The compensation is mathematically exact for linear interpolation.** It is not an approximation. The algebra works out cleanly because both components are linear in `t`.

Same verification holds for skewX alone: the compensation `-cy*tan(skewX)` interpolates linearly, and so does the skew angle — so the result is exact.

---

## The one genuine problem

When **scale AND skewX change simultaneously**, the cross-term is `sx(t) * tan(skewX(t))`. This is a product of two linearly-changing values — it is quadratic in `t`, not linear. SMIL's linear interpolation of the endpoint compensations will diverge from the true path mid-animation.

How bad is this in practice? Small for typical animation ranges, but it exists.

---

## Evaluating the three known approaches

### Approach A — current compensation math

- Exact for all single-transform animations with an origin
- Exact for any compound involving translate + any single non-translate type
- Small error only when scale + skewX/Y both change simultaneously
- No DOM changes, works with `additive="sum"`, `revert()` is trivial

### Approach B — wrapper groups (from `transform-origin-wrapper-strategy.md`)

The proposed wrapper:

```svg
<g transform="translate(cx cy)">
  <g data-gsap-to-smil-origin-wrapper>
    <g transform="translate(-cx -cy)">
      <!-- original element moves here -->
    </g>
  </g>
</g>
```

Math check — tracing a point P = (px, py) through the full stack when the middle group is animated with `scale(sx, sy)`:

```
inner.translate(-cx,-cy):  (px-cx, py-cy)
middle.scale(sx,sy):       (sx*(px-cx), sy*(py-cy))
outer.translate(cx,cy):    (cx + sx*(px-cx), cy + sy*(py-cy))
```

This IS scaling around (cx, cy). The geometry is correct.

Problems:

- **Breaks `additive="sum"`**: scale is on the wrapper, translate/rotate remain on the original element. They live in different coordinate spaces and can no longer be composed as a flat stack.
- **DOM mutation is destructive**: moves the element inside three new `<g>` groups, breaking CSS selectors, event listeners, z-order, `<use>` references, `<clipPath>` references.
- **`revert()` becomes DOM surgery**: must detach the element from the inner `<g>`, re-insert it at its original DOM position, remove all three wrapper groups, and remove animations. Any failure corrupts the DOM permanently.
- **Multiple tweens on the same element**: if two tweens both try to wrap the same element, the second finds it already wrapped. Requires wrapper-identity tracking and ref-counting across tweens.
- **Only helps scale and skew**: rotation already works natively with cx/cy in the SMIL value string. The wrapper only earns its complexity for `scale`, `scaleX`, `scaleY`, `skewX`, `skewY` — creating a split model where different transform types use fundamentally different mechanisms.

### Approach C — `type="matrix"`

`<animateTransform type="matrix">` animates all six affine matrix parameters simultaneously. The full matrix for translate + rotate + scale around origin (cx, cy):

```
a = sx * cos(angle)
b = sx * sin(angle)
c = -sy * sin(angle)
d = sy * cos(angle)
e = tx + cx - cx*sx*cos(angle) + cy*sy*sin(angle)
f = ty + cy - cx*sx*sin(angle) - cy*sy*cos(angle)
```

This encodes any combination of transforms with any origin as a single `<animateTransform>` — no wrapper needed, no `additive="sum"` coordination.

The problem: SMIL linearly interpolates the six matrix components. This is exact for translate and scale, **but wrong for rotation**. Linear interpolation of `cos(angle)` and `sin(angle)` does not produce constant angular velocity — at large angles it produces visible scale artifacts at intermediate frames (the element appears to shrink and distort mid-animation).

This means `type="matrix"` cannot replace `type="rotate"` with a cx/cy value.

---

## The actual open questions — what needs study

**1. Is the scale + skewX cross-term error actually visible?**

Nobody has tested this in the browser. It may be invisible at normal animation magnitudes and durations. Before assuming it is a problem, it needs to be proven with a debug page that deliberately animates both scale and skewX simultaneously with a transformOrigin.

**2. How does GSAP actually handle SVG transforms?**

GSAP does not use CSS `transform-origin` for SVG elements. It builds a matrix internally and writes a decomposed SVG `transform` attribute at every rAF frame. A SMIL animation is inherently an interpolation between two endpoint states — it is structurally different from per-frame matrix computation. Understanding what accuracy loss is acceptable for a "GSAP-equivalent output" library is a design constraint that needs to be made explicit.

**3. Is there a low-cost midpoint fix for the quadratic cross-term?**

Adding one extra `values`/`keyTimes` midpoint keyframe at `t=0.5` with the exact compensation value would halve the quadratic error with minimal architectural cost. Worth evaluating after the cross-term error is confirmed visible.

**4. What does the current scale-origin debug output actually look like?**

The scale-origin debug file exists. The skewX cross-term was added. The output has not been critically reviewed in the browser since. That is the first step.

---

## Recommended study order

1. Open the current scale-origin and skew debug pages. Run the compound case: `scale + skewX` simultaneously with a `transformOrigin`. Observe whether the divergence is visible.
2. If invisible at practical animation parameters — the compensation approach is sufficient. Document the boundary condition and move on.
3. If visible — the quadratic midpoint fix is the next candidate. Prototype it in the debug file before touching the library.
4. The wrapper strategy and matrix approach remain documented dead ends unless the above steps reveal a constraint they uniquely solve.
