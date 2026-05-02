# Testing Strategy

## Approach

Two SVGs rendered simultaneously — same animation code, same markup, only the animation object swapped:

```js
// Left SVG — GSAP
gsap.to("#spinner-gsap", { rotation: 360, duration: 1, repeat: -1 })

// Right SVG — this library (identical call)
smil.to("#spinner-smil", { rotation: 360, duration: 1, repeat: -1 })
```

If the output is correct, both animations are visually indistinguishable.

---

## Diff Mode

A toggle overlays the SMIL SVG on top of the GSAP SVG using `mix-blend-mode: difference`.

- **Black** = pixels are identical → correct
- **Any color** = divergence in position, timing, or value → bug

This immediately surfaces issues like wrong rotation center, timing drift, easing mismatch, or incorrect repeat count.

---

## Test Scenarios

One HTML file per scenario. Scenarios to cover:

| Scenario | Properties tested |
| --- | --- |
| Basic `to()` | opacity, x/y translate, rotation, scale |
| `from()` | reverse direction, immediateRender behavior |
| `fromTo()` | explicit start + end values |
| `set()` | instant value jump |
| Repeat + yoyo | `repeat`, `repeatDelay`, `yoyo` |
| Easing | power1–4, sine, circ, expo, back, elastic fallback, bounce fallback |
| Timeline — sequential | default append behavior |
| Timeline — overlap | `<`, `>`, `+=`, `-=` position params |
| Timeline — labels | `addLabel`, `seek(label)` |
| Stagger | simple number, `{ each, from: "start" }`, `{ each, from: "end" }` |
| `attr: {}` | `cx`, `cy`, `r`, `x`, `y`, `width`, `height` |
| DrawSVG | stroke reveal, partial draw, reverse |
| MotionPath | path follow, `autoRotate` |
| MorphSVG | same-structure path morph |
| Compound transforms | `x + rotation + scale` in one tween |
| Color animation | `fill`, `stroke` interpolation |

---

## Test Files

One file per feature category:

```text
tests/
  no-plugins.html     — transforms, opacity, attr:{}, repeat, yoyo, stagger, easing, timeline
  drawsvg.html        — stroke reveal, partial draw, reverse
  motionpath.html     — path follow, autoRotate
  morphsvg.html       — path morphing
```

Each file:

- Identical SVG markup duplicated (one for GSAP, one for the lib)
- Same animation code, object name swapped
- "Diff" toggle button — overlays with `mix-blend-mode: difference`
- No framework, no build step — plain HTML + JS
