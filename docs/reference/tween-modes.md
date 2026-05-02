# Tween Modes — GSAP to SMIL Parallel

What each GSAP tween call translates to in SMIL.

## Tween Types

| GSAP Call                                    | SMIL Equivalent                                     | `from` attr | `to` attr | Notes                                                       |
| -------------------------------------------- | --------------------------------------------------- | ----------- | --------- | ----------------------------------------------------------- |
| `to(el, { opacity: 0 })`                     | `<animate attributeName="opacity" to="0">`          | Absent      | Present   | Browser reads current value as implicit `from`              |
| `from(el, { opacity: 0 })`                   | `<animate attributeName="opacity" from="0">`        | Present     | Absent    | Browser animates to element's natural value                 |
| `fromTo(el, { opacity: 1 }, { opacity: 0 })` | `<animate attributeName="opacity" from="1" to="0">` | Present     | Present   | Both directions explicit                                    |
| `set(el, { opacity: 0 })`                    | `<set attributeName="opacity" to="0">`              | Absent      | `to`      | Native SMIL `<set>` — no duration, no easing, instant apply |

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

| Bucket        | Example Keys                                                        | SMIL Element         | Element Type                                                                                    |
| ------------- | ------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------- |
| **Transform** | `x`, `y`, `rotation`, `scale`, `scaleX`, `scaleY`, `skewX`, `skewY` | `<animateTransform>` | `type="translate\|rotate\|scale\|skewX\|skewY"`, `additive="sum"`                               |
| **Direct**    | `opacity`, `fill`, `stroke`, `strokeWidth`, `strokeDashoffset`      | `<animate>`          | `attributeName="opacity"` etc.                                                                  |
| **Attr**      | `vars.attr: { cx, r, rx, ry, ... }`                                 | `<animate>`          | One per attr key inside the `attr` object                                                       |
| **Plugin**    | `drawSVG`, `motionPath`, `morphSVG`                                 | Plugin-specific      | DrawSVG: 2× `<animate>`. MotionPath: `<animateMotion>`. MorphSVG: `<animate attributeName="d">` |

