# SMIL Reference

> Synchronized Multimedia Integration Language — declarative SVG animations baked into markup. No JS, no rAF.

---

## Animation Elements

| Element | Purpose |
|---|---|
| `<animate>` | Animate any SVG presentation attribute (opacity, fill, stroke, r, cx…) |
| `<animateTransform>` | Animate the `transform` attribute — translate, rotate, scale, skewX, skewY |
| `<animateMotion>` | Move an element along a path |
| `<set>` | Jump to a value at a given time (no interpolation — keyframe snap) |

> `<discard>` exists in SVG 2 (removes an element at a given time) but has no meaningful browser support — skip it.

---

## Shared Core Attributes

```
attributeName  — which attribute to animate (animate/set only)
from / to      — start and end values
by             — relative change from current value
values         — semicolon-separated keyframe values ("0; 0.5; 1")
keyTimes       — keyframe positions 0→1 ("0; 0.5; 1"), must match values count
keySplines     — cubic-bezier per interval ("0.4 0 0.2 1; 0.4 0 0.2 1")
calcMode       — discrete | linear | paced | spline
dur            — duration ("1s", "500ms", "indefinite")
repeatCount    — integer or "indefinite"
repeatDur      — total duration of all repeats combined
fill           — freeze (stay at end value) | remove (reset to initial)
begin          — when animation starts (see below)
end            — when animation ends
additive       — replace | sum (adds on top of element's current value)
accumulate     — none | sum (accumulates value across each repeat)
restart        — always | whenNotActive | never
```

---

## `begin` — SMIL's Built-in Sync System

SMIL timelines without a single line of JS:

```
"2s"                  — start after 2 seconds
"click"               — start on click event
"click+0.5s"          — 0.5s after click
"anim1.begin"         — when anim1 starts
"anim1.end"           — when anim1 ends
"anim1.end+0.2s"      — 200ms after anim1 ends
"anim1.repeat(2)"     — on anim1's 2nd repeat
"indefinite"          — only via JS beginElement()
"0; click"            — multiple triggers (semicolon-separated list)
```

### Multiple triggers — fully composable

`begin` is a **semicolon-separated list of independent triggers**. The animation fires whenever *any* of them is met. All types can be freely mixed:

```
begin="2s; click+0.5s; anim1.end"
```

↑ fires after 2s, OR 0.5s after a click, OR when anim1 ends — whichever comes first (then again each time any fires, controlled by `restart`).

You can attach an offset to any event trigger individually:

```
begin="click+0.5s"        — 0.5s after click
begin="mouseover+1s"      — 1s after hover
begin="anim1.end+0.2s"    — 200ms after anim1 ends
```

The offset is scoped to that single trigger and doesn't affect the others in the list.

### Valid event names for `begin` / `end`

SMIL was specced against the old **DOM Mouse Events module** — predates Pointer Events entirely. The valid event names defined in the spec are:

```
click, dblclick
mousedown, mouseup, mouseover, mousemove, mouseout
focusin, focusout
SVGLoad, SVGUnload, SVGAbort, SVGError, SVGResize, SVGScroll, SVGZoom
```

**`pointerenter`, `pointerleave`, `mouseenter`, `mouseleave` are NOT in the spec.**

Chrome/Brave is permissive and accepts any DOM event name. Firefox is strict — unknown events silently do nothing.

> **Cross-browser rule:** use `mouseover` / `mouseout` instead of `pointerenter` / `pointerleave`. The bubbling behavior of `mouseover`/`mouseout` is actually useful here — hover events from child elements bubble up to the SVG root, which is usually what you want.

---

## `<animateTransform>` Specifics

```xml
<animateTransform type="rotate"    from="0 50 50"  to="360 50 50" ... />
<animateTransform type="translate" from="0 0"       to="100 0"    ... />
<animateTransform type="scale"     from="1"         to="2"        ... />
<animateTransform type="skewX"     from="0"         to="30"       ... />
<animateTransform type="skewY"     from="0"         to="30"       ... />
```

**Only one `type` per element.** You cannot combine rotate + translate in one `<animateTransform>`.

Workaround: stack multiple elements with `additive="sum"`:

```xml
<animateTransform type="translate" ... additive="sum" />
<animateTransform type="rotate"    ... additive="sum" />
```

For `rotate`, the `cx cy` in `from/to` is the transform origin — there is no CSS `transform-origin` equivalent in SMIL.

---

## `<animateMotion>` Specifics

```xml
<!-- Inline path -->
<animateMotion path="M0,0 C100,0 100,100 200,100" dur="2s" rotate="auto" />

<!-- Reference an existing path element -->
<animateMotion dur="2s">
  <mpath href="#myPath" />
</animateMotion>
```

- `rotate="auto"` — element faces its direction of travel
- `rotate="auto-reverse"` — faces opposite direction
- `calcMode` defaults to `"paced"` (not `"linear"` like the other elements)
- `keyPoints` — 0→1 values matching `keyTimes`, controls speed distribution along the path

---

## `<set>` Specifics

Non-interpolated jump — useful for visibility toggles, string/boolean attributes:

```xml
<set attributeName="display" to="none" begin="anim1.end" />
<set attributeName="visibility" to="visible" begin="2s" />
```

---

## JS API

SMIL exposes a JS API for programmatic control:

```js
const anim = document.querySelector("animateTransform");

// Control
anim.beginElement();
anim.endElement();
anim.beginElementAt(0.5);  // start 0.5s into the animation

// State
anim.getCurrentTime();
anim.getStartTime();
anim.getSimpleDuration();

// Events
anim.addEventListener("beginEvent",  () => {});
anim.addEventListener("endEvent",    () => {});
anim.addEventListener("repeatEvent", () => {});

// Pause/unpause ALL animations in the SVG at once
svgEl.pauseAnimations();
svgEl.unpauseAnimations();
svgEl.getCurrentTime();
svgEl.setCurrentTime(seconds);
```

---

## Browser Compatibility

| Browser | Support | Notes |
|---|---|---|
| Chrome | Full | Deprecation proposed in 2015, never actually happened |
| Firefox | Full | |
| Edge (Chromium) | Full | |
| Safari | Partial | See critical note below |
| IE | None | Dead, irrelevant |

### Critical Safari/WebKit caveat

Transform-related SMIL animations are **not hardware-accelerated** in WebKit. CSS `animation` on `transform` gets the GPU compositor thread; SMIL `<animateTransform>` does not.

On Safari under main thread load (e.g. heavy asset loading), a SMIL transform animation can still stutter — defeating the primary reason for using SMIL over GSAP.

**Implication for this library:** CSS animation output (phase 2) may need to be the default on Safari, not a stretch goal.

---

## What SMIL Cannot Do

| Missing feature | Notes |
|---|---|
| `onComplete` / `onUpdate` / `onStart` | `beginEvent`/`endEvent` exist but are limited |
| CSS custom property animation | Not supported |
| Non-SVG DOM properties | SMIL only touches SVG presentation attributes |
| Path morphing with different command counts | Same path command structure required |
| Compound transforms in one element | Workaround: multiple elements with `additive="sum"` |
| Elastic / bounce eases | Can't express as a single cubic-bezier — needs keyframe approximation |
| ScrollTrigger equivalent | JS-only concept, no SMIL translation |
| Physics / inertia | No equivalent |

---

## Easing — `calcMode` + `keySplines`

SMIL easing is controlled by two attributes working together:

- `calcMode="spline"` — enables cubic-bezier interpolation
- `keySplines` — one `x1 y1 x2 y2` bezier per keyframe interval, semicolon-separated

```xml
<!-- ease-in-out between 3 keyframes = 2 splines -->
<animate
  values="0; 0.5; 1"
  keyTimes="0; 0.5; 1"
  calcMode="spline"
  keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
/>
```

Common cubic-bezier approximations for GSAP named eases:

| GSAP ease | cubic-bezier |
|---|---|
| `linear` | `calcMode="linear"` (no keySplines needed) |
| `ease-in-out` / `power1.inOut` | `0.42 0 0.58 1` |
| `power2.in` | `0.55 0 1 0.45` |
| `power2.out` | `0 0.55 0.45 1` |
| `power2.inOut` | `0.65 0 0.35 1` |
| `sine.in` | `0.47 0 0.745 0.715` |
| `sine.out` | `0.39 0.575 0.565 1` |
| `sine.inOut` | `0.445 0.05 0.55 0.95` |
| `expo.in` | `0.95 0.05 0.795 0.035` |
| `expo.out` | `0.19 1 0.22 1` |
| `expo.inOut` | `1 0 0 1` |
| `circ.in` | `0.6 0.04 0.98 0.335` |
| `circ.out` | `0.075 0.82 0.165 1` |
| `circ.inOut` | `0.785 0.135 0.15 0.86` |
| `back.in` | `0.6 -0.28 0.735 0.045` |
| `back.out` | `0.175 0.885 0.32 1.275` |
| `back.inOut` | `0.68 -0.55 0.265 1.55` |

> `elastic` and `bounce` cannot be expressed as a single cubic-bezier — they require keyframe approximation with many `values`.
