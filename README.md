# @lephenix47/

## Table of Contents

- [@lephenix47/](#lephenix47)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Usage](#usage)
    - [Importing the Library](#importing-the-library)
  - [Conclusion](#conclusion)

## Introduction

# gsap-to-smil

> Converts GSAP SVG animations into SMIL (and eventually CSS animations) so they run off the main thread — no JS required at runtime.

---

## Origin story

While following [Three.js Journey](https://threejs.org/), the loading screen SVG animation was visibly lagging and freezing every time assets were loading (GLTF models, HDR env maps, textures).

The root cause: GSAP runs on `requestAnimationFrame`, which lives on the main thread. When the main thread is saturated by heavy asset loading and GPU texture uploads, rAF callbacks get starved — the animation stutters or freezes entirely.

The fix is simple in theory: **CSS animations and SMIL run on the compositor thread**, completely immune to main thread load. But rewriting every GSAP animation by hand into SMIL every time you need a loader is tedious and error-prone.

Hence this library.

---

## What it does

Takes GSAP tween/timeline configuration targeting SVG elements and outputs equivalent **SMIL animation elements** (`<animate>`, `<animateTransform>`, `<animateMotion>`) baked directly into the SVG markup.

```js
// Input (GSAP)
gsap.to("#spinner", { rotation: 360, duration: 1, repeat: -1, ease: "linear" });

// Output (SMIL injected into the SVG)
// <animateTransform
//   attributeName="transform"
//   type="rotate"
//   from="0 50 50"
//   to="360 50 50"
//   dur="1s"
//   repeatCount="indefinite"
//   calcMode="linear"
// />
```

---

## Why SMIL over CSS for this

- Runs on the **compositor thread** — survives main thread freezes
- Baked into SVG markup — zero JS needed at runtime
- Native SVG concepts (`rotate`, `translate`, `animateMotion`) map cleanly without CSS transform workarounds
- Can be triggered/synced via SVG events (`begin="click"`, `begin="otherAnim.end"`) — SMIL has its own event system for chaining

> **Note on SMIL events:** SMIL does support JS event listeners via `beginEvent` / `endEvent` / `repeatEvent` fired on the element. They're not well-documented and a bit painful, but they work — and they're interesting enough to explore as an advanced feature.

---

## Scope

### Supported (phase 1 — SMIL)

| GSAP | SMIL equivalent |
|------|----------------|
| `x`, `y` | `<animateTransform type="translate">` |
| `rotation` | `<animateTransform type="rotate">` |
| `scale`, `scaleX`, `scaleY` | `<animateTransform type="scale">` |
| `opacity` | `<animate attributeName="opacity">` |
| `strokeDashoffset` | `<animate attributeName="stroke-dashoffset">` |
| `fill`, `stroke` (color) | `<animate attributeName="fill/stroke">` |
| `repeat: -1` | `repeatCount="indefinite"` |
| `yoyo: true` | `autoreverse="true"` |
| `stagger` | repeated elements with `begin` offsets |
| Common eases (`power1-3`, `sine`, `circ`, `expo`, `back`) | `calcMode="spline"` with pre-baked `keySplines` |

### Intentionally out of scope

- `onComplete`, `onUpdate`, `onStart` callbacks — no SMIL equivalent, dropped with a warning
- `ScrollTrigger` — JS-only concept, not translatable
- Physics / inertia plugins — skip
- Animating non-SVG properties (DOM layout, etc.) — SMIL only touches SVG presentation attributes
- `elastic` / `bounce` eases — these can't be expressed as a single cubic bezier; falls back to keyframe approximation

### Phase 2 — CSS output

For cases where SMIL is too limiting (complex sequences, more easing control), output equivalent `@keyframes` + `animation` CSS instead, toggleable via option.

---

## API sketch

```ts
// Single tween
toSMIL("#spinner", { rotation: 360, duration: 1, repeat: -1, ease: "linear" });

// Returns: SMIL element string to inject OR mutates the SVG DOM directly
toSMIL("#path", { strokeDashoffset: 0, duration: 1.5, ease: "power2.out" });

// Timeline (phase 1 stretch goal)
const tl = smilTimeline();
tl.add("#el1", { opacity: 0, duration: 0.5 });
tl.add("#el2", { y: -20, duration: 0.8 }, "-=0.2"); // overlap
```

---

## Roadmap

- [ ] Core tween → SMIL element transform
- [ ] Easing lookup table (cubic bezier approximations for GSAP named eases)
- [ ] `repeat` / `yoyo` / `delay` support
- [ ] Stagger support
- [ ] Basic timeline → chained `begin` offsets
- [ ] SMIL event hooks (`beginEvent`, `endEvent`)
- [ ] CSS animation output mode (phase 2)
- [ ] Vite/Rollup plugin to transform at build time (phase 3)


## Usage

### Importing the Library

## Conclusion
