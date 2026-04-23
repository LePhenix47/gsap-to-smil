# Development Phases

---

## Phase 1 — Core Tweens, Simple Properties

**Goal:** `smil.to/from/fromTo/set` works for the most common SVG animation use cases. No plugins, no timelines, no `attr`.

### Methods

- `smil.to(targets, vars)`
- `smil.from(targets, vars)`
- `smil.fromTo(targets, fromVars, toVars)`
- `smil.set(targets, vars)`

### Supported animatable properties

- Transforms: `x`, `y`, `rotation`, `scale`, `scaleX`, `scaleY`, `skewX`, `skewY`
- Presentation: `opacity`, `fill`, `stroke`, `strokeWidth`, `strokeOpacity`, `fillOpacity`

### Supported tween vars

- `duration`
- `delay`
- `ease` (power1–4, sine, circ, expo, back — elastic/bounce as keyframe fallback)
- `repeat` (-1 = indefinite)
- `repeatDelay` (approximated — see mapping-challenges.md)
- `yoyo`

### Phase 1 internals to build

- `Animation` base class
- `SMILTween` class
- `smil` facade (to/from/fromTo/set only)
- `PropertyRouter` (transforms + basic presentation attrs)
- `TransformComposer` (compound transforms, rotation origin)
- `EasingModule` (lookup table + elastic/bounce keyframe fallback)
- SMIL element builders (`buildAnimate`, `buildAnimateTransform`)

**Test file:**

`tests/no-plugins.html` (phase 1 scenarios)

---

## Phase 2 — Advanced Properties

**Goal:** Full tween feature set + timelines + stagger.

### New methods

- `smil.timeline(vars?)`
- `tl.to/from/fromTo/set/call/add/addLabel`

### New animatable properties

- `attr: {}` — animate SVG presentation attributes directly
- `keyframes` — array of vars objects

### New tween vars

- `stagger` — simple number + `{ each, from: "start" | "end" }`
- `id`
- `data`
- `paused`
- `reversed`

### Phase 2 internals to build

- `SMILTimeline` class
- Position parameter resolver
- `AttrPlugin` (internal — handles `attr: {}`)
- `StaggerResolver`

**Test file:**

`tests/no-plugins.html` (phase 2 scenarios)

---

## Phase 3 — Plugins

**Goal:** SVG-specific plugins for the advanced use cases.

### Plugins

- `DrawSMILPlugin` — `drawSVG` → `<animate attributeName="stroke-dashoffset">`
- `MotionSMILPlugin` — `motionPath` → `<animateMotion>`
- `MorphSMILPlugin` — `morphSVG` → `<animate attributeName="d">`

### New method

- `smil.registerPlugin(...plugins)`

### Phase 3 internals to build

- `SMILPlugin` base class
- Plugin registration system

**Test file:**

`tests/drawsvg.html`, `tests/motionpath.html`, `tests/morphsvg.html`

---

## Deferred Indefinitely

| Feature | Reason |
| --- | --- |
| CSS animation output | Separate project scope |
| `stagger` grid / random / distance-based | Requires DOM geometry, complex |
| `yoyoEase` | No SMIL equivalent |
| `ScrollTrigger` equivalent | JS-only, out of scope |
| `repeatDelay` exact mapping | No native SMIL support |
| Callbacks (`onComplete` etc.) | No SMIL equivalent — dropped with warning |
| `timeScale` | No SMIL equivalent at runtime |
| `overwrite` | No SMIL conflict resolution |
