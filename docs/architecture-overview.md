# Architecture Overview (TL;DR)

## The one key difference vs GSAP

GSAP runs a loop every frame and interpolates values. This library runs **once**, generates SMIL elements, injects them into the SVG, and lets the browser handle the rest.

---

## What gets built

```
Animation               ← base class, shared timing + playback methods
  ├── SMILTween         ← one animation, creates + injects SMIL elements
  └── SMILTimeline      ← list of tweens, resolves timing between them

smil                    ← the object users call (smil.to(), smil.timeline()…)
SMILPlugin              ← base class for DrawSVG / MotionPath / MorphSVG
```

---

## What each thing does

**`Animation`** — base class. Holds duration, delay, repeat, yoyo, timeScale. Has play/pause/kill/revert methods that delegate to the SMIL JS API (`beginElement()`, `pauseAnimations()` etc.).

**`SMILTween`** — takes a target + vars, figures out which SMIL elements to create, injects them into the DOM. Done.

**`SMILTimeline`** — holds a list of tweens. Figures out when each one starts (position parameter resolution), then writes those times into each tween's `begin=` attribute.

**`smil`** — the facade. `smil.to()` just creates a `SMILTween`. `smil.timeline()` creates a `SMILTimeline`. Same as GSAP's `gsap` object.

**`SMILPlugin`** — base class for special properties (`drawSVG`, `motionPath`, `morphSVG`). Each plugin knows how to turn its GSAP property into the right SMIL element.

---

## Internal helpers (not exported)

- **PropertyRouter** — looks at vars, decides: is this a transform? an attr? a plugin? a CSS thing?
- **TransformComposer** — handles `x + rotation + scale` in one tween → stacked `<animateTransform>` elements
- **EasingModule** — GSAP ease name → `calcMode` + `keySplines` values
- **StaggerResolver** — computes the `begin=` offset for each target when stagger is used

---

## What a `smil.to()` call actually does

```
smil.to("#spinner", { rotation: 360, duration: 1 })

1. Resolve "#spinner" → DOM element
2. Route properties → rotation goes to TransformComposer
3. Resolve ease → calcMode="linear"
4. Build <animateTransform type="rotate" from="0 cx cy" to="360 cx cy" dur="1s" />
5. Inject into #spinner
6. Return SMILTween (has play/kill/revert etc.)
```
