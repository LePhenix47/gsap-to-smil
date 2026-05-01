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

**What experimenting showed (credit: Codex + CodePen):**

SMIL's begin attribute accepts a **semicolon-separated list of begin times**:

```
begin="0s; s5.end+0.35s"
```

This is not a circular dependency. It is two independent begin events on the same
element. When `s5` fires its end event, `s1` gets a **new instance**. That instance
cascades through `s2 → s3 → s4 → s5` via their own `begin="sN.end"` references.
`s5` ends again, fires `s1` again. The loop runs indefinitely, fully declarative,
zero JavaScript.

`fill="remove"` on a `<set>` between cycles cleans the frozen state so each new
instance starts from a neutral base.

For staggered targets the pattern extends: each target's first step gets
`begin="staggerOffset; s_last_tN.end+repeatDelay+staggerOffset"`. All targets restart
in coordinated stagger, still no JS.

A 10-line CodePen found this in one session. Weeks of reasoning did not.

**Rule extracted:**

"The spec says X is not possible" is a hypothesis, not a conclusion. Test it with the
smallest possible SVG before accepting the constraint.

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
