# GSAP Reference

> GreenSock Animation Platform v3 — the JS animation library this project mirrors in API surface.

Thanks WebFlow for purchasing the lib and making its plugins free btw

---

## Core Methods

```js
gsap.to(targets, vars)         // animate from current values → vars
gsap.from(targets, vars)       // animate from vars → current values
gsap.fromTo(targets, fromVars, toVars) // explicit start and end
gsap.set(targets, vars)        // immediately set values (no animation, duration: 0)
```

`targets` accepts: CSS selector string, DOM element, array of elements, NodeList, or any JS object.

---

## Tween Vars — Special Properties

These are reserved keys in the `vars` object that control the tween itself, not the animated values:

```
duration        — seconds (default: 0.5)
delay           — seconds before tween starts
ease            — easing function (string or function, default: "power1.out")
repeat          — number of repeats after first play (-1 = infinite)
repeatDelay     — seconds between each repeat
repeatRefresh   — re-records start/end values on each repeat (useful for dynamic values)
yoyo            — true = A→B→A→B (ping-pong), false = A→B  A→B (default false)
yoyoEase        — separate ease for the reverse direction of a yoyo
stagger         — offset between each target's start time (see Stagger section)
paused          — start paused (default false)
overwrite       — "auto" | true | false — kill conflicting tweens (default "auto")
immediateRender — render start values on creation (default true for from/fromTo)
id              — string ID to retrieve via gsap.getById()
data            — arbitrary data attached to the tween, accessible in callbacks
reversed        — start in reverse (default false)
```

### Callbacks

All callbacks receive the tween as `this`:

```
onStart(params)           — fires once when tween begins playing
onUpdate(params)          — fires every frame while tween is active
onComplete(params)        — fires when tween finishes
onRepeat(params)          — fires at the start of each repeat
onReverseComplete(params) — fires when reversed tween reaches the beginning

onStartParams           — array of args passed to onStart
onUpdateParams          — array of args passed to onUpdate
onCompleteParams        — array of args passed to onComplete
onRepeatParams          — array of args passed to onRepeat
onReverseCompleteParams — array of args passed to onReverseComplete
```

---

## Playback Control — Tween & Timeline

Both `Tween` and `Timeline` share these methods:

```js
tween.play(from?, suppressEvents?)      // play forward from optional position
tween.pause(atTime?, suppressEvents?)   // pause at optional position
tween.reverse(from?, suppressEvents?)   // play backward
tween.restart(includeDelay?, suppressEvents?)
tween.resume()                          // un-pause
tween.seek(position, suppressEvents?)   // jump to time or label (no play/pause side effect)

tween.progress(value?)    // get/set 0→1 progress
tween.time(value?)        // get/set current time in seconds
tween.totalTime(value?)   // includes repeats
tween.duration(value?)    // get/set simple duration
tween.totalDuration(value?) // includes repeats and repeatDelays
tween.timeScale(value?)   // get/set playback speed (2 = double speed, 0.5 = half)

tween.kill()              // destroy the tween, clean up
tween.revert()            // kill + reset all animated values to original
tween.invalidate()        // clear recorded start/end values (re-records on next render)
tween.isActive()          // true if currently animating
tween.paused(value?)      // get/set paused state
tween.reversed(value?)    // get/set reversed state
tween.iteration()         // current repeat iteration (0-indexed)
```

---

## Timeline

```js
const tl = gsap.timeline(vars?)
```

`vars` accepts all tween special properties as defaults for child tweens, plus:

```
defaults        — object of vars applied to every child tween
smoothChildTiming — boolean, auto-adjust child timing when parent scrubs
autoRemoveChildren — remove children after they finish (default false)
```

### Child methods — same as Tween plus:

```js
tl.to(targets, vars, position?)
tl.from(targets, vars, position?)
tl.fromTo(targets, fromVars, toVars, position?)
tl.set(targets, vars, position?)
tl.call(callback, params?, position?)     // insert a callback at a position
tl.add(child, position?)                  // insert a tween, timeline, callback, or label
tl.addLabel(label, position?)             // insert a named label
tl.removeLabel(label)
tl.getById(id)                            // retrieve a child tween by id
tl.getChildren(nested?, tweens?, timelines?, ignoreBeforeTime?)
tl.clear(labels?)                         // remove all children
tl.killTweensOf(targets)
tl.tweenTo(position, vars?)              // creates a tween that scrubs the timeline
tl.tweenFromTo(from, to, vars?)
tl.currentLabel()                         // label at or before current playhead
tl.nextLabel()
tl.previousLabel()
tl.labels                                 // object of all labels and their times
```

### Position parameter

The third argument to `tl.to()` / `tl.from()` / etc. controls insertion point:

```
undefined / omitted — append after previous tween (default sequential)
"<"                 — start same time as previous tween (overlap fully)
"<0.5"              — 0.5s after previous tween starts
">"                 — after previous tween ends (same as default)
">-0.5"             — 0.5s before previous tween ends (overlap by 0.5s)
2                   — absolute time: 2 seconds from timeline start
"myLabel"           — at the label position
"myLabel+=0.5"      — 0.5s after the label
"myLabel-=0.5"      — 0.5s before the label
"+=0.5"             — 0.5s after current end of timeline
"-=0.5"             — 0.5s before current end of timeline
"25%"               — 25% into the inserting tween's duration after previous end
```

---

## Stagger

`stagger` can be a simple number (seconds between each target) or an object:

```js
// Simple
gsap.to(".item", { y: -20, stagger: 0.1 })

// Object form
gsap.to(".item", {
  y: -20,
  stagger: {
    amount: 1,          // total time distributed across all targets (vs each = per-target offset)
    each: 0.1,          // fixed offset per target (alternative to amount)
    from: "start",      // "start" | "end" | "center" | "edges" | "random" | index number
    grid: "auto",       // [rows, cols] or "auto" — for 2D grid staggers
    axis: "x",          // "x" | "y" — for grid staggers, which axis drives the stagger
    ease: "power1.in",  // ease applied to the stagger distribution itself
  }
})
```

---

## Easing

GSAP eases follow the pattern `"family.direction"`:

```
Families:   none, power1, power2, power3, power4, back, elastic, bounce, rough,
            slow, steps, circ, expo, sine, CustomEase, CustomBounce, CustomWiggle

Directions: in, out, inOut (default: out)
```

```
"none"           — linear (no easing), same as "linear"
"power1.out"     — gentle deceleration
"power2.inOut"   — moderate in + out
"back.out(1.7)"  — overshoot, parameterizable
"elastic.out(1, 0.3)" — spring, parameterizable (amplitude, period)
"bounce.out"     — ball bounce
"steps(12)"      — stepped/discrete (12 equal steps)
"slow(0.7, 0.7, false)" — slow middle section
```

```js
// Custom ease via cubic-bezier
gsap.registerEase("myEase", CustomEase.create("myEase", "M0,0 C0.4,0 0.2,1 1,1"))

// Use in tween
gsap.to(el, { x: 100, ease: "myEase" })
```

---

## SVG-Specific Plugins

### DrawSVG

Animates `stroke-dashoffset` / `stroke-dasharray` to simulate drawing a path.

```js
gsap.registerPlugin(DrawSVGPlugin)

gsap.to("path", { drawSVG: true })         // draw from 0% to 100%
gsap.to("path", { drawSVG: false })        // erase (collapse to 0%)
gsap.to("path", { drawSVG: "0% 50%" })    // draw only the first half
gsap.to("path", { drawSVG: "50% 100%" })  // draw only the second half
gsap.to("path", { drawSVG: "50%" })       // shorthand: draw from 0% to 50%
gsap.from("path", { drawSVG: 0 })         // reveal from nothing → full stroke
```

Values are % of total path length, or raw pixel lengths. SMIL equivalent: `<animate attributeName="stroke-dashoffset">`.

---

### MotionPath

Moves an element along an SVG path.

```js
gsap.registerPlugin(MotionPathPlugin)

gsap.to(".ball", {
  motionPath: {
    path: "#myPath",           // selector or path data string
    align: "#myPath",          // align element's registration point to path
    alignOrigin: [0.5, 0.5],   // [x, y] 0→1, element anchor that aligns to path (default center)
    autoRotate: true,          // face direction of travel (or offset angle number)
    start: 0,                  // 0→1 progress point to start on the path
    end: 1,                    // 0→1 progress point to end on the path
  }
})
```

SMIL equivalent: `<animateMotion>` with `<mpath>` and `rotate="auto"`.

---

### MorphSVG

Morphs one SVG path shape into another by animating the `d` attribute.

```js
gsap.registerPlugin(MorphSVGPlugin)

gsap.to("#circle", {
  morphSVG: {
    shape: "#star",             // target shape (selector, path data string, or element)
    shapeIndex: "auto",         // how to match anchor points (0–n or "auto")
    map: "size",                // "size" | "position" | "complexity" — anchor matching strategy
    type: "rotational",         // "rotational" | "linear" — interpolation type
    origin: "50% 50%",          // transform origin for rotational morphing
    render: (rawPath, target) => {}  // custom render callback
  }
})

// Shorthand — just pass the target
gsap.to("#circle", { morphSVG: "#star" })
```

SMIL partial equivalent: `<animate attributeName="d">` — but only works if both paths have the same number and type of commands. MorphSVG handles mismatched paths by subdividing beziers automatically, which SMIL cannot do.

---

## Static Utilities

```js
gsap.defaults(vars)                     // set global defaults for all tweens
gsap.config(vars)                       // configure global settings (units, autoSleep, etc.)
gsap.registerPlugin(...plugins)         // register plugins before use
gsap.registerEase(name, ease)           // register a custom ease
gsap.registerEffect({ name, effect, defaults, extendTimeline }) // register a reusable effect

gsap.getById(id)                        // retrieve tween/timeline by id
gsap.getProperty(target, property, unit?) // get current value of a property
gsap.quickSetter(target, property, unit?) // returns a fast setter function (for high-frequency updates)
gsap.quickTo(target, property, vars?)    // returns a function that tweens to a given value quickly

gsap.killTweensOf(targets, properties?) // kill all tweens on target(s)
gsap.isTweening(target)                 // true if target is currently being tweened

gsap.globalTimeline                     // the root timeline all tweens belong to
gsap.ticker                             // the rAF-based ticker
gsap.ticker.add(callback)              // run callback every frame
gsap.ticker.remove(callback)
gsap.ticker.fps(value)                 // cap frame rate

gsap.utils.toArray(targets)            // normalize any target input → array
gsap.utils.selector(scope)            // scoped selector factory
gsap.utils.clamp(min, max, value)
gsap.utils.interpolate(a, b, progress)
gsap.utils.mapRange(inMin, inMax, outMin, outMax, value)
gsap.utils.normalize(min, max, value)  // maps value to 0→1
gsap.utils.wrap(min, max, value)
gsap.utils.wrapYoyo(min, max, value)
gsap.utils.random(min, max, snap?)
gsap.utils.shuffle(array)
gsap.utils.pipe(...functions)          // compose functions left→right
gsap.utils.unitize(fn, unit)           // wraps a function to handle unit strings

gsap.matchMedia()                      // responsive animation context (like CSS media queries)
gsap.context(fn, scope?)               // scoped context — collect and kill tweens as a group
```

---

## Properties GSAP Can Animate

### CSS / DOM

```
x, y, z                    — translate (maps to transform: translateX/Y/Z)
xPercent, yPercent         — translate as % of element size
rotation, rotationX, rotationY  — degrees (maps to transform: rotate/rotateX/rotateY)
scale, scaleX, scaleY      — scale
skewX, skewY               — skew
transformOrigin            — "50% 50%" etc.
opacity
width, height
backgroundColor, color, borderColor, fill, stroke (etc.)
any CSS property           — camelCase or quoted kebab-case
```

### SVG presentation attributes

```
fill, stroke
strokeWidth, strokeDashoffset, strokeDasharray
opacity, fillOpacity, strokeOpacity
r, cx, cy                  — circle/ellipse
x, y, width, height        — rect/image
x1, y1, x2, y2            — line
points                     — polygon/polyline
d                          — path data (via MorphSVG)
viewBox
```

### Any JS object property

```js
gsap.to(myObj, { value: 100, duration: 1 })  // animates myObj.value
```

---

## Out-of-Scope for SMIL Mapping

| GSAP feature                                   | Why                                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| CSS layout properties (width, height, margin…) | SMIL only touches SVG presentation attributes                                |
| `transformOrigin`                              | SMIL rotate uses explicit `cx cy` in parent coords, no `transform-origin`    |
| `scrollTrigger`                                | JS-only concept                                                              |
| `onComplete` / `onUpdate` / `onStart`          | No SMIL equivalent (beginEvent/endEvent are limited)                         |
| `overwrite: "auto"`                            | SMIL has no conflict resolution — elements render additively or via priority |
| `immediateRender`                              | SMIL always renders at parse time                                            |
| `gsap.ticker` / rAF hooks                      | SMIL has no per-frame callback                                               |
| `MorphSVG` with mismatched paths               | SMIL `<animate attributeName="d">` requires identical path structure         |
| Physics / inertia plugins                      | No equivalent                                                                |
| `repeatRefresh`                                | No SMIL equivalent                                                           |
