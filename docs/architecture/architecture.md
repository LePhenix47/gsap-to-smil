# Library Architecture

> Mirrors GSAP 3's internal class structure as closely as possible. References are to `node_modules/gsap/src/gsap-core.js` where applicable.

---

## Class Hierarchy

```
Animation           (base — gsap-core.js:1148)
  ├── SMILTween     (gsap-core.js:2320 — Tween)
  └── SMILTimeline  (gsap-core.js:1472 — Timeline)

smil                (facade object — gsap-core.js:3028)
SMILPlugin          (base class for plugins)
```

---

## The Critical Architectural Difference

GSAP's `render(ratio)` is called **every animation frame** via rAF ticker. It iterates a linked list of `PropTween`s and interpolates values on every tick.

This library's equivalent is called **once at initialization** — it generates SMIL elements (`<animate>`, `<animateTransform>`, `<animateMotion>`), injects them into the DOM, and then steps back. The browser's SMIL engine takes over. There is no per-frame loop.

This means:
- No `PropTween` equivalent needed — SMIL elements replace the interpolation machinery
- Playback control delegates to the SMIL JS API (`beginElement()`, `endElement()`, `svgEl.pauseAnimations()`)
- `render()` in this library = "generate and inject SMIL markup", not "apply interpolated values"

---

## `Animation` — Base Class

Mirrors `gsap-core.js:1148`. Owns all timing state and playback methods shared by both `SMILTween` and `SMILTimeline`.

### Properties

```ts
_id: string                  // unique ID
_delay: number
_repeat: number              // -1 = infinite
_rDelay: number              // repeatDelay
_yoyo: boolean
_ts: number                  // timeScale
_dur: number                 // simple duration
_tDur: number                // total duration (includes repeats)
_start: number               // start time in parent timeline
_paused: boolean
_reversed: boolean
_initted: boolean
data: any                    // user data
parent: SMILTimeline | null
```

### Methods

Playback methods delegate to SMIL JS API where possible — see notes per method:

```ts
play(from?, suppressEvents?)
pause(atTime?, suppressEvents?)
resume()
reverse(from?, suppressEvents?)
restart(includeDelay?, suppressEvents?)
seek(position, suppressEvents?)

progress(value?): number
time(value?): number
totalTime(value?): number
duration(value?): number
totalDuration(value?): number
timeScale(value?): number
iteration(): number

isActive(): boolean
paused(value?): boolean
reversed(value?): boolean

kill()
revert()
invalidate()

eventCallback(type, callback, params)
then(onFulfilled): Promise
```

### SMIL playback mapping

| GSAP method | SMIL equivalent |
|---|---|
| `play()` | `animEl.beginElement()` on each owned element |
| `pause()` | `svgEl.pauseAnimations()` (affects entire SVG — see limitation below) |
| `resume()` | `svgEl.unpauseAnimations()` |
| `seek(t)` | `svgEl.setCurrentTime(t)` |
| `kill()` | Remove all injected SMIL elements from DOM |
| `revert()` | kill() + restore original attribute values |

**Known SMIL limitation:** `pauseAnimations()` / `unpauseAnimations()` operate on the **entire SVG**, not on individual animations. There is no per-animation pause in the SMIL JS API. This means pausing a single `SMILTween` will pause all animations in that SVG. Mitigating options: track time at pause, use `beginElementAt(offset)` on resume to simulate per-tween pause (imperfect).

---

## `SMILTween extends Animation`

Mirrors `Tween` (`gsap-core.js:2320`).

### Properties

```ts
_targets: Element[]          // resolved targets (always an array)
_vars: TweenVars             // original vars object
_fromVars: object | null     // for fromTo() only
_from: boolean               // true if gsap.from() equivalent
_elements: SVGAnimationElement[]  // all injected SMIL elements
_plugins: SMILPlugin[]       // active plugin instances
_startAt: SMILTween | null   // internal tween for from() immediate render
```

### Initialization flow

```
constructor(targets, vars, position?, skipInherit?)
  → _resolveTargets(targets)        // normalize to Element[]
  → _addToTimeline(parent, position) // register with parent or globalTimeline
  → if immediateRender: _init()

_init(target)
  → _routeProperties(vars)          // split props by SMIL element type
  → for each plugin prop: plugin.init(target, value, this)
  → _buildTransforms(target, vars)  // compound animateTransform handling
  → _buildAnimates(target, vars)    // attr:{} and direct SVG attrs
  → _injectElements(target, elements) // append into target SVG element
  → _initted = true
```

### Property routing

```ts
_routeProperties(vars: TweenVars): RoutedProps {
  transforms: {}   // x, y, rotation, scale, scaleX, scaleY, skewX, skewY
  attrs: {}        // everything inside attr: {}
  css: {}          // top-level CSS props (opacity, fill as CSS, etc.)
  plugins: {}      // drawSVG, motionPath, morphSVG, custom plugins
  special: {}      // duration, ease, repeat, delay, callbacks… (tween control, not animated)
}
```

### Kill / revert

```ts
kill()
  → remove all this._elements from DOM
  → remove from parent timeline

revert()
  → kill()
  → restore original attribute/style values for each target
```

---

## `SMILTimeline extends Animation`

Mirrors `Timeline` (`gsap-core.js:1472`).

### Properties

```ts
labels: Record<string, number>
smoothChildTiming: boolean
autoRemoveChildren: boolean
_sort: boolean
_first: SMILTween | SMILTimeline | null  // doubly-linked list head
_last: SMILTween | SMILTimeline | null   // doubly-linked list tail
```

Children are maintained as a **doubly-linked list** via `_next` / `_prev` on each child — same as GSAP. Sorted by `_start` (absolute start time in the timeline).

### Key methods

```ts
to(targets, vars, position?)
from(targets, vars, position?)
fromTo(targets, fromVars, toVars, position?)
set(targets, vars, position?)
call(callback, params?, position?)
add(child, position?)
addLabel(label, position?)
removeLabel(label)
remove(child)
clear(labels?)

getChildren(nested?, tweens?, timelines?): Animation[]
getById(id): Animation | undefined
killTweensOf(targets, props?)

currentLabel(): string
nextLabel(): string
previousLabel(): string
```

### Position parameter resolution

Position strings must be fully resolved to **absolute seconds** before generating `begin=` attributes. Resolution order:

```
number           → absolute time as-is
undefined        → end of last child (_last._start + _last._tDur)
"<"              → _last._start
"<N"             → _last._start + N
">"              → _last._start + _last._tDur
">-N"            → _last._start + _last._tDur - N
"+=N"            → end of timeline + N
"-=N"            → end of timeline - N
"label"          → labels[label]
"label+=N"       → labels[label] + N
"label-=N"       → labels[label] - N
"N%"             → end of timeline + (N/100 * insertingChild.totalDuration)
```

Once absolute start times are resolved for all children, the timeline computes each child's `begin=` value as:

```
begin = child._start - child._delay
```

This value is written into the generated SMIL element's `begin` attribute, chaining animations declaratively.

---

## `smil` — Facade Object

Mirrors the `_gsap` object (`gsap-core.js:3028`). This is the public API users interact with.

```ts
const smil = {
  // Tween factories
  to(targets, vars): SMILTween
  from(targets, vars): SMILTween
  fromTo(targets, fromVars, toVars): SMILTween
  set(targets, vars): SMILTween
  delayedCall(delay, callback, params?): SMILTween

  // Timeline factory
  timeline(vars?): SMILTimeline

  // Plugin system
  registerPlugin(...plugins): void
  registerEase(name, ease): void
  registerEffect({ name, effect, defaults, extendTimeline }): void

  // Query
  getById(id): Animation | undefined
  getTweensOf(targets, onlyActive?): SMILTween[]
  isTweening(target): boolean
  getProperty(target, property, unit?): string | number

  // Config
  defaults(vars?): object
  config(vars?): object

  // Utils (same as GSAP)
  utils: {
    toArray, selector, clamp, wrap, wrapYoyo, random,
    mapRange, normalize, interpolate, pipe, unitize, shuffle
  }

  // Internals (exposed for plugins)
  core: {
    SMILTween
    SMILTimeline
    Animation
    globals
  }

  plugins: Record<string, SMILPlugin>
  effects: Record<string, Effect>
}
```

---

## `SMILPlugin` — Plugin Base Class

Mirrors GSAP's plugin config/class interface (`gsap-core.js:654`). Each plugin is responsible for generating and managing its SMIL elements.

```ts
abstract class SMILPlugin {
  static pluginName: string
  static version: string
  _props: string[]            // property names this plugin handles
  _elements: SVGAnimationElement[]  // elements this plugin created

  // Called once when smil.registerPlugin() is invoked
  static register(core: typeof smil): void

  // Called per-target during SMILTween initialization
  // Returns false to skip this plugin for this target
  init(target: Element, value: unknown, tween: SMILTween, index: number, targets: Element[]): boolean

  // Called to generate and inject SMIL elements
  // Replaces GSAP's render(ratio, data) — runs once, not per frame
  createElement(target: Element, vars: object, tween: SMILTween): SVGAnimationElement[]

  // Cleanup — remove created elements
  kill(): void

  // Restore original values
  revert(): void
}
```

### Built-in plugins

| Plugin | Handles | SMIL output |
|---|---|---|
| `DrawSMILPlugin` | `drawSVG` | `<animate attributeName="stroke-dashoffset">` + sets `stroke-dasharray` |
| `MotionSMILPlugin` | `motionPath` | `<animateMotion>` + optional `<mpath>` |
| `MorphSMILPlugin` | `morphSVG` | `<animate attributeName="d">` |
| `AttrPlugin` | `attr: {}` | `<animate>` per property |
| `TransformPlugin` | `x y rotation scale skewX skewY` | `<animateTransform>` (stacked with `additive="sum"`) |

---

## Internal Modules

These are not exported but are used internally across classes.

### `PropertyRouter`

Classifies each key in `vars` into a bucket:

```ts
function routeProperties(vars: TweenVars): RoutedProps
```

- `x | y | z | xPercent | yPercent | rotation | rotationX | rotationY | scale | scaleX | scaleY | skewX | skewY` → `TransformPlugin`
- Keys in `attr: {}` → `AttrPlugin`
- `drawSVG` → `DrawSMILPlugin`
- `motionPath` → `MotionSMILPlugin`
- `morphSVG` → `MorphSMILPlugin`
- Registered plugin names → matching plugin
- Special keys (duration, ease, repeat, delay, callbacks…) → stripped, used to configure the tween
- Everything else → CSS (warn: likely unsupported in SMIL output)

### `TransformComposer`

Handles the compound transform problem:

```ts
function buildTransformElements(
  target: SVGElement,
  transforms: TransformProps,
  commonAttrs: SMILCommonAttrs
): SVGAnimationElement[]
```

- Canonical output order: `translate → rotate → scale → skewX → skewY`
- All elements get `additive="sum"`
- Rotation origin: tries `getBBox()` first, falls back to attribute geometry (`cx/cy`, `x+width/2` etc.), then `0 0` with a console warning

### `EasingModule`

```ts
function resolveEase(ease: string | Function): EasingAttrs

type EasingAttrs =
  | { calcMode: "linear" }
  | { calcMode: "spline"; keyTimes: string; keySplines: string }
  | { calcMode: "linear"; values: string; keyTimes: string }  // elastic/bounce keyframe fallback
```

- Named eases → cubic-bezier lookup table (see [smil-reference.md](../reference/smil-reference.md))
- `elastic` / `bounce` → sampled keyframe approximation
- `steps(n)` → `calcMode="discrete"` with `n` keyframes
- `CustomEase` SVG path → sampled + approximated

### `StaggerResolver`

```ts
function resolveStagger(
  stagger: number | StaggerObject,
  targets: Element[]
): number[]  // begin offset per target in seconds
```

Phase 1 scope: `stagger: number` and `{ each, from: "start" | "end" }` only.
Grid, random, and distance-based staggers require DOM geometry — deferred.

---

## SMIL Element Generation

### Common attribute builder

All generated SMIL elements share a common attribute set derived from the tween vars:

```ts
type SMILCommonAttrs = {
  dur: string          // duration → "1s", "500ms"
  begin: string        // resolved from timeline position + delay
  repeatCount: string  // repeat (-1 → "indefinite", n → string(n+1))
  fill: "freeze" | "remove"
  calcMode?: string
  keyTimes?: string
  keySplines?: string
  // yoyo → autoreverse="true" (note: SMIL attribute, not standard HTML)
}
```

### `<animateTransform>` builder

```ts
function buildAnimateTransform(
  type: "translate" | "rotate" | "scale" | "skewX" | "skewY",
  from: string,
  to: string,
  common: SMILCommonAttrs,
  additive?: boolean
): SVGAnimateTransformElement
```

### `<animate>` builder

```ts
function buildAnimate(
  attributeName: string,
  from: string,
  to: string,
  common: SMILCommonAttrs
): SVGAnimateElement
```

### `<animateMotion>` builder

```ts
function buildAnimateMotion(
  path: string | SVGPathElement,
  autoRotate: boolean | number,
  common: SMILCommonAttrs
): SVGAnimateMotionElement
```

---

## Global Timeline

Single root `SMILTimeline` instance. All top-level tweens are added here automatically. Mirrors GSAP's `_globalTimeline`.

No ticker — the global timeline only exists for position resolution and kill/revert coordination. SMIL engines handle their own timing.

---

## What's Intentionally Not Mirrored

| GSAP internal | Reason not mirrored |
|---|---|
| `PropTween` linked list | Replaced by SMIL elements — no per-frame interpolation needed |
| `rAF ticker` | SMIL has its own timing engine |
| `CSSPlugin` | CSS output is phase 2, not phase 1 |
| `_lazy` render deferral | SMIL inits on injection, no lazy needed |
| `immediateRender` for `from()` | Handled by setting `from` attribute explicitly (see [mapping-challenges.md](../reference/mapping-challenges.md)) |
| `overwrite: "auto"` | SMIL has no conflict resolution — elements stack or replace by DOM order |
| `suppressOverwrites` | Same reason |
