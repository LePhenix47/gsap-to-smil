# Tween Modes — GSAP to SMIL Parallel

What each GSAP tween call translates to in SMIL.

## Tween Types

| GSAP Call | SMIL Equivalent | `from` attr | `to` attr | Notes |
|-----------|----------------|-------------|-----------|-------|
| `to(el, { opacity: 0 })` | `<animate attributeName="opacity" to="0">` | Absent | Present | Browser reads current value as implicit `from` |
| `from(el, { opacity: 0 })` | `<animate attributeName="opacity" from="0">` | Present | Absent | Browser animates to element's natural value |
| `fromTo(el, { opacity: 1 }, { opacity: 0 })` | `<animate attributeName="opacity" from="1" to="0">` | Present | Present | Both directions explicit |
| `set(el, { opacity: 0 })` | `<set attributeName="opacity" to="0">` | Absent | `to` | Native SMIL `<set>` — no duration, no easing, instant apply |

### Direction flow

```
to()     :  current value  ────────►  to value
from()   :  from value     ────────►  current value (element's natural state)
fromTo() :  from value     ────────►  to value
```

`from()` is NOT `to()` in reverse. `from()` sets the element TO the specified value, then animates back to its natural state. The SMIL element only carries `from` — the browser handles the destination.

### Why `from` has no `to` in SMIL

SMIL auto-fills the missing end value. When `<animate from="0">` fires, SMIL: takes the element's current attribute value as the implicit `to`, animates `0 → current`. No `<animate to>` needed.

If BOTH `from` and `to` were set, the element would snap to `from`, animate to `to`, and freeze at `to` — losing its original state. `from`/`fromTo` differ in what the element looks like AFTER the animation completes.

## Property Categories → SMIL Elements

Tween vars split into 4 buckets by `PropertyRouter.route()`:

| Bucket | Example Keys | SMIL Element | Element Type |
|--------|-------------|-------------|--------------|
| **Transform** | `x`, `y`, `rotation`, `scale`, `scaleX`, `scaleY`, `skewX`, `skewY` | `<animateTransform>` | `type="translate\|rotate\|scale\|skewX\|skewY"`, `additive="sum"` |
| **Direct** | `opacity`, `fill`, `stroke`, `strokeWidth`, `strokeDashoffset` | `<animate>` | `attributeName="opacity"` etc. |
| **Attr** | `vars.attr: { cx, r, rx, ry, ... }` | `<animate>` | One per attr key inside the `attr` object |
| **Plugin** | `drawSVG`, `motionPath`, `morphSVG` | Plugin-specific | DrawSVG: 2× `<animate>`. MotionPath: `<animateMotion>`. MorphSVG: `<animate attributeName="d">` |

### Transform detail

Compound transforms (e.g. `x: 100, rotation: 45, scale: 2`) produce **multiple** `<animateTransform>` elements, one per transform type, with `additive="sum"`.

Canonical SMIL transform order:
```
translate → rotate → scale → skewX → skewY
```

Rotation origin needs explicit `cx cy` in parent coordinates (from `getBBox()`), wrapped in pivot `<g>` scaffold.

### Direct property detail

Any key NOT in the transform/special/plugin sets falls through to `<animate>`. Unknown SVG attributes (e.g. `cx`, `r`, `strokeDasharray`) become `<animate>` elements with `attributeName` set to the key.

## Special Control Properties

Keys consumed by `Animation` base class (not mapped to SMIL elements):

| Property | Type | Default | What it controls |
|----------|------|---------|-----------------|
| `duration` | `number` | `0.5` | `dur` attribute on every generated SMIL element |
| `delay` | `number` | `0` | `begin` attribute on every generated SMIL element |
| `ease` | `EaseString \| number[]` | `"power1.out"` | `calcMode` + `keySplines` attributes |
| `repeat` | `number` | `0` | `repeatCount` attribute (GSAP repeat + 1) |
| `repeatDelay` | `number` | `0` | Encoded into timing (no direct SMIL equivalent) |
| `yoyo` | `boolean` | `false` | Replaces `from`/`to` with `values` sequence (forward + backward) |
| `stagger` | `number \| StaggerObject` | — | Offsets `begin` per target; combined with yoyo → encoded in `values` |
| `paused` | `boolean` | `false` | Initial paused state |
| `reversed` | `boolean` | `false` | No SMIL equivalent — swaps from/to or reverses values |
| `id` | `string` | — | User-visible identifier |
| `data` | `unknown` | — | User-attached data, never used internally |

## Repeat Off-By-One

| GSAP | Meaning | SMIL `repeatCount` |
|------|---------|-------------------|
| `repeat: 0` | Play once | `1` (or absent — SMIL default) |
| `repeat: 3` | Play 4 times | `4` |
| `repeat: -1` | Infinite | `"indefinite"` |

GSAP `repeat` = number of EXTRA plays after the first. SMIL `repeatCount` = TOTAL number of plays.

## Stagger

```ts
smil.to(".boxes", { x: 100, stagger: 0.1 })
```

Resolved per-target:
- Target 0: `begin="0s"` (or absent)
- Target 1: `begin="0.1s"`
- Target 2: `begin="0.2s"`

When combined with yoyo, stagger is NOT encoded as `begin` offsets. Instead, all targets share the same `dur` and stagger is baked into `values` sequences with hold frames.

## Yoyo with Repeat

Yoyo replaces `from`/`to` with `values`/`keyTimes`/`keySplines`:

```
repeat: 1, yoyo: true  →  values="F; T; F"  keyTimes="0; 0.5; 1"  dur *= 2  repeatCount=1
repeat: -1, yoyo: true →  values="F; T; F"  keyTimes="0; 0.5; 1"  dur *= 2  repeatCount="indefinite"
repeat: 2, yoyo: true  →  values="F; T; F; T"  keyTimes="0; 0.333; 0.667; 1"  dur *= 3  repeatCount=1
```

Easing for backward phase: bezier `(x1,y1,x2,y2)` → `(1-x2, 1-y2, 1-x1, 1-y1)` — mirrored around center.
