# Experiment First

Before writing any code, before reasoning from the spec, before concluding something is
impossible: **build a 20-line CodePen and look at it**.

This rule exists because the two biggest architectural decisions in this project were both
made the wrong way — by reasoning — and both cost significant time.

---

## Case 1: Transform origin — the `<g>` hack

**What reasoning said:**

SMIL `<animateTransform>` has no `transform-origin` attribute. To rotate or scale around
an element's center you need to pass `cx cy` into the `rotate` value, or do the math:
translate to origin → apply transform → translate back. We implemented that math.

**What happened:**

The math approach ran into a wall with sequential animations. The element's visual
position changes between tweens, so the origin computed at build time (from `getBBox()`)
is wrong by step 3. Every new property added (scale, skewX) broke earlier steps.
We were stuck.

**What experimenting showed:**

Wrap the element in `<g>` layers. The pivot groups (`pivotIn` / `pivotOut`) express the
origin in the **outer group's local coordinate space**, not SVG space. Because the outer
group moves but the rect stays fixed within it, the pivot center tracks the element's
visual center automatically — at every point in the sequence, without any recomputation.

A 10-line SVG on CodePen would have shown this immediately.

**Rule extracted:**

When you hit a math dead-end with transforms, the answer is almost always a coordinate
space change via a wrapper element, not more math.

---

## Case 2: `begin="anim.end"` and looping

**What reasoning said:**

`begin="anim.end"` chaining is great for fire-once sequences but cannot loop. SMIL
doesn't allow circular begin dependencies. To repeat, you'd need pre-computed absolute
cycle times or JavaScript. Dismiss the approach for anything with `repeat: -1`.

**What experimenting showed (confirmed in `tests/integration/begin-chaining-poc.html`):**

SMIL's begin attribute accepts a **semicolon-separated list of begin times**:

```xml
begin="0s; s5_t3.end+0.35s"
```

This is not a circular dependency. It is two independent begin events on the same
element. When `s5_t3` fires its end event, `s1` gets a **new instance**. That instance
cascades through `s2 → s3 → s4 → s5` via their own `begin="sN.end"` references.
`s5` ends again, fires `s1` again. The loop runs indefinitely, fully declarative,
zero JavaScript.

For staggered targets: each target's first step gets
`begin="staggerOffset; s_last_tN.end+repeatDelay+staggerOffset"` where `s_last_tN`
is the **last target's last step** (the single sync anchor for the whole loop).
All targets restart in coordinated stagger, still no JS.

**Three patterns discovered in the POC:**

### 1. `additive="replace"` + `fill="freeze"` for sequential absolute-value properties

Translate animations carry their absolute `from`/`to` values step to step
(`from="42 0" to="42 -24"`). No delta encoding. The browser gives newer instances
priority over older frozen ones at the same element — cycle 2's new instance
correctly overrides cycle 1's frozen value. This makes `_transformAccum` and all
delta bookkeeping unnecessary for this architecture.

### 2. `fill="remove"` + extended `dur` for "hold until cycle boundary then reset"

Properties that use `additive="sum"` (scale, skewX) cannot use `fill="freeze"` for
looping — cycle 2 would accumulate on top of cycle 1's frozen value. But
`fill="remove"` with the original short `dur` removes the contribution too early
(when *that target's* step ends, not when the *last target's* step ends).

The fix: extend `dur` so the animation covers from its natural start all the way to
the cycle restart time, with a hold keyframe at the boundary:

```xml
<!-- scale for target 0: starts at 1.93s, cycle restarts at 2.92s → dur=0.99s -->
<!-- grows 1→2 in first 0.34s (keyTime 0.344), holds 2 for the rest -->
<animateTransform type="scale" additive="sum" fill="remove"
  values="1 1; 2 2; 2 2" dur="0.99s"
  keyTimes="0; 0.344; 1"
  keySplines="0.455 0.03 0.515 0.955; 0 0 1 1" />
```

`fill="remove"` then cleans up at exactly the cycle boundary. No accumulation.
Same pattern applies to fill color and any other `additive="sum"` property.

### 3. Cross-target sync via a single anchor

All step N+1 animations reference the **last target's step N end**:

```
s3_t0.begin = "s2_t3.end"        (not s2_t0.end)
s3_t1.begin = "s2_t3.end+0.1s"
```

Step N+1 waits for the slowest target of step N, then staggers forward. One sync
point per step transition, not one per target.

**Rule extracted:**

"The spec says X is not possible" is a hypothesis, not a conclusion. Test it with the
smallest possible SVG before accepting the constraint.

**Architectural implication:**

The current timeline implementation (`_rewriteBegin`, `_transformAccum`, pre-computed
absolute `begin=` times, delta encoding) is solving a problem that `begin="anim.end"`
chaining makes irrelevant. The declarative approach is simpler, more correct under
looping, and produces smaller DOM output. The tradeoff: overlapping tweens and GSAP
position params like `"<"` are harder to express. For strictly sequential animations,
the chaining approach is strictly better.

---

## The pattern

Every time you hit what looks like a fundamental limitation:

1. Strip the problem down to one element, one property, one timing scenario.
2. Build it by hand in a CodePen or a standalone HTML file.
3. Look at what the browser actually does.

The browser's SMIL engine is more capable than any reading of the spec predicts,
because the spec describes a composition model that has non-obvious emergent behaviors
(instance-based begin events, additive compositing, fill semantics across instances).

Reasoning from the spec tells you the rules. Experimenting tells you what the rules
actually produce.

**Do not design around a constraint until a working demo has confirmed the constraint exists.**
