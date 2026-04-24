# Pattern: Stagger Resolver

## The problem

When `smil.to()` receives multiple targets and a `stagger` value, each target needs a different
`begin=` time — but the tween itself only has one `delay`. The stagger offset per target
needs to be computed before any SMIL elements are created.

```js
smil.to(".dot", { x: 100, stagger: 0.1 })
// dot[0] → begin="0s"
// dot[1] → begin="0.1s"
// dot[2] → begin="0.2s"
```

## The solution

`resolveStaggerDelays(count, stagger)` takes the number of targets and the stagger config,
and returns an array of per-target delay offsets in seconds.
The caller adds these on top of the base `delay` from `TweenVars`.

```ts
resolveStaggerDelays(3, 0.1)       // → [0, 0.1, 0.2]
resolveStaggerDelays(3, { each: 0.1, from: "end" })  // → [0.2, 0.1, 0]
resolveStaggerDelays(3, { amount: 1 })               // → [0, 0.5, 1]
```

## Stagger forms

### Simple number
`stagger: 0.1` — fixed offset per target, always from start.

### Object — `each`
`stagger: { each: 0.1 }` — same as the simple number form but composable with `from`.

### Object — `amount`
`stagger: { amount: 1 }` — total time distributed across all targets.
`amount / (count - 1)` gives the per-target offset.

### `from`
Controls where the stagger wave originates:

| Value | Behaviour |
|---|---|
| `"start"` | First target first (default) |
| `"end"` | Last target first |
| `"center"` | Middle target first, spreading outward |
| `"edges"` | Outermost targets first, collapsing inward |
| `"random"` | Randomised order each time |
| `number` | Specific index first, spreading by distance |

## What this does NOT handle

- `grid` / `axis` — 2D grid staggers. Deferred to a later phase.
- Easing the stagger distribution (`stagger.ease`) — the stagger offsets are always linear.
  GSAP applies an ease to the distribution itself; that requires mapping the eased index
  back to a time offset, which is a separate problem.
