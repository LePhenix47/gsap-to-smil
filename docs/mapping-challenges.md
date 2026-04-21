# GSAP → SMIL Mapping Challenges

> Problems that arise specifically from translating GSAP's model to SMIL's model. Each entry describes the mismatch, the impact, and the known options for handling it.

---

## Rotation transform origin

**The mismatch:** GSAP rotation defaults to rotating around the element's own center (`transform-origin: 50% 50%` via CSS). SMIL `<animateTransform type="rotate">` requires explicit `cx cy` numbers in the **parent's coordinate system** — it has no concept of `transform-origin` or `transform-box`.

**Impact:** A naive 1:1 mapping produces wrong rotation center.

**Options:**
- For elements with readable geometry attributes (`<circle cx cy>`, `<rect x y width height>`, `<ellipse>`…): compute center from attributes at build time — no DOM needed.
- For `<path>`, `<g>`, or anything complex: call `getBBox()` on the live DOM to get the bounding box, derive center from that.
- Fallback: expose an explicit `origin` option the user can pass; warn if neither DOM nor attributes can resolve it.

---

## Compound transforms in one tween

**The mismatch:** GSAP `gsap.to(el, { x: 100, rotation: 45, scale: 1.5 })` is one tween, applies all three simultaneously. SMIL requires one `<animateTransform>` per type — they must be stacked with `additive="sum"`.

**Impact:** Output becomes multiple elements, and their **document order determines application order** (transforms are not commutative). The library must fix a canonical order and stick to it.

**Proposed order (matches CSS matrix convention):** translate → rotate → scale → skew.

---

## `repeat` off-by-one

**The mismatch:** GSAP `repeat: 3` means 3 *additional* repetitions after the first play — 4 total plays. SMIL `repeatCount="3"` means 3 *total* plays.

**Impact:** A direct mapping produces one fewer repeat than intended.

**Fix:** `repeatCount = gsapRepeat + 1`. Exception: `repeat: -1` → `repeatCount="indefinite"` (correct as-is).

---

## `repeatDelay` — no SMIL equivalent

**The mismatch:** GSAP supports a pause between each repeat via `repeatDelay`. SMIL has no such attribute.

**Impact:** Can't be expressed natively.

**Options:**
- Approximate by padding `dur` and using `values` with a hold at the end value for the delay period (e.g. a 1s animation with 0.5s repeatDelay → `dur="1.5s"` with values that hold at end for the last 0.5s). Breaks easing accuracy.
- Warn + drop: document that `repeatDelay` is dropped in SMIL output.

---

## `yoyoEase` — no SMIL equivalent

**The mismatch:** GSAP supports a separate ease for the reverse direction of a yoyo. SMIL `autoreverse` always mirrors the forward ease.

**Impact:** `yoyoEase` can't be expressed in a single SMIL element.

**Options:**
- Approximate: split into two chained animations (`begin="anim1.end"`) with different `keySplines`, manually constructing forward + reverse.
- Warn + drop: use the forward ease for both directions, log a warning.

---

## Timeline position parameter resolution

**The mismatch:** GSAP's `<`, `>`, `"myLabel+=0.5"` position shortcuts are relative to adjacent tweens' durations, which are known at call time. SMIL `begin` offsets must be absolute time values baked into the markup.

**Impact:** The library must fully resolve the timeline graph — computing each tween's absolute start time — before generating any SMIL output. This is a full topological sort of the timeline, not just a simple sequential loop.

**Complexity:** Nested timelines, `timeScale`, and overlapping tweens with percentage-based positions compound this significantly. Phase 1 should target flat timelines only.

---

## DrawSVG — path length required

**The mismatch:** GSAP DrawSVG works by computing `stroke-dasharray = totalLength` and animating `stroke-dashoffset`. SMIL `<animate attributeName="stroke-dashoffset">` can do the same, but the library needs the **total path length** to translate `"0% 100%"` into pixel values.

**Options:**
- Call `path.getTotalLength()` on the live DOM at build time.
- Use the SVG `pathLength` presentation attribute to normalize: set `pathLength="1"` on the path, then `stroke-dashoffset` values become 0→1 fractions. Clean and DOM-independent once set.

**Recommended:** `pathLength="1"` approach — works without DOM access.

---

## Elastic / bounce eases — keyframe approximation

**The mismatch:** GSAP `elastic` and `bounce` eases can't be expressed as a single cubic-bezier. SMIL `keySplines` only supports cubic beziers.

**Impact:** No exact mapping exists.

**Options:**
- Pre-bake a table of keyframe approximations (many `values` + `keyTimes` with `calcMode="linear"`) for common elastic/bounce configs. Accuracy depends on number of keyframes sampled.
- Warn + fall back to `power2.out` or nearest expressible ease.

---

## `attr: {}` vs transform shorthands — routing

**The mismatch:** GSAP has two ways to animate the "same" thing:
- `gsap.to("rect", { x: 100 })` → CSS `transform: translateX(100px)` → maps to `<animateTransform type="translate">`
- `gsap.to("rect", { attr: { x: 100 } })` → SVG `x` attribute → maps to `<animate attributeName="x">`

These are different attributes with different semantics. The library must correctly route each property.

**Rule:**
- Top-level `x`, `y`, `rotation`, `scale`, `skewX`, `skewY` → `<animateTransform>`
- Anything inside `attr: {}` → `<animate attributeName="...">`
- Shared names (`fill`, `stroke`, `opacity`) at top level → CSS style → warn, suggest `attr: {}` for SMIL output

---

## Color format normalization

**The mismatch:** GSAP accepts any CSS color format (`red`, `#f00`, `rgb()`, `hsl()`). SMIL interpolates correctly only when `from` and `to` use the **same format**.

**Fix:** Normalize all colors to `rgb()` before outputting. A lightweight CSS color parser is needed.

---

## `from()` immediate render vs SMIL timing

**The mismatch:** GSAP `gsap.from(el, { opacity: 0 })` with `immediateRender: true` (the default) sets `opacity: 0` on the element *immediately at parse time*, before the animation even starts. SMIL omitting `from` starts from whatever the value is *when the animation begins*.

**Impact:** For animations with a `delay`, the element is visible at its base value during the delay in SMIL, whereas GSAP hides it immediately.

**Fix:** For `from()` translations with a delay, explicitly set `from` in the SMIL output to the GSAP `from` value (not omit it). The library must record the `fromVars` and emit them as explicit `from` attributes.

---

## Stagger `from: "center"` / `"random"` / grid

**The mismatch:** GSAP computes stagger offsets per element based on the full set of targets (their DOM positions, grid layout, etc.). SMIL `begin` offsets are just time values — the library must compute each element's offset at build time.

**Impact:** Requires implementing GSAP's stagger math in the library, including:
- `from: "center"` — find center element, compute distance-based offsets outward
- `from: "random"` — randomize order, seed for reproducibility
- `grid: "auto"` — detect grid layout from DOM positions, requires `getBoundingClientRect()`

**Phase 1 scope:** support simple `stagger: number` and `stagger: { each, from: "start" | "end" }` only. Grid and random require DOM access — defer.
