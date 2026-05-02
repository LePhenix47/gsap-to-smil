# Pattern: Builders

## The problem

Creating a SMIL element correctly requires setting many attributes in the right combination:

- `calcMode="spline"` is useless without `keySplines` and `keyTimes`
- `keySplines` count must be exactly `values count - 1` — wrong count = silent failure
- `repeatCount` maps from GSAP's off-by-one convention (`repeat: 3` = 4 total plays)
- `<animateTransform>` always needs `attributeType="XML"` and `additive="sum"` for compound transforms
- Trailing semicolons in `keySplines` silently break Chrome

Every call site would need to know all of these rules. That's the wrong place for this knowledge.

## The solution

A set of typed factory functions that each produce one SMIL element — fully configured, with all the rules baked in:

```
buildAnimate(opts)          → <animate>
buildAnimateTransform(opts) → <animateTransform>
buildSet(opts)              → <set>
injectInto(target, ...anims) → appends elements into a target
```

Each function accepts a typed options object (`AnimateOptions`, `AnimateTransformOptions`) and handles every attribute internally. The caller only passes what varies per animation — not the structural boilerplate.

## What each builder handles

### Shared (applied by both `buildAnimate` and `buildAnimateTransform`)

- `dur` → `dur="{n}s"`
- `delay` → `begin="{n}s"`
- `repeat` → `repeatCount = repeat + 1` (GSAP off-by-one fix), `-1` → `"indefinite"`
- `fill` → defaults to `"freeze"` if omitted
- `ease` → delegates to `resolveCalcMode()` which decides `calcMode`, `keySplines`, `keyTimes`

### `buildAnimateTransform` only

- Always sets `attributeName="transform"` and `attributeType="XML"` — callers never touch these
- Always sets `additive="sum"` — required for compound transforms to stack correctly

## Why factory functions and not a class

Builders are stateless — they take input and return a DOM element. No instance data, no lifecycle. A class would just be a namespace with extra syntax.

## Relationship to other layers

```
routeProperties(vars)
       │
       ├── transforms → transform-composer → buildAnimateTransform()
       ├── direct     ──────────────────── → buildAnimate()
       ├── attrs      ──────────────────── → buildAnimate()
       └── plugins    → plugin classes    → buildAnimateMotion() (future)

All roads end at a builder. The builder is the only place that touches the DOM.
```

## The GSAP repeat off-by-one

GSAP `repeat: N` = N+1 total plays (the initial play + N repeats).
SMIL `repeatCount="N"` = N total plays.

So `repeatCount = gsapRepeat + 1`. Exception: `repeat: -1` → `repeatCount="indefinite"`.

This conversion lives exclusively in the builders — no other file needs to know about it.
