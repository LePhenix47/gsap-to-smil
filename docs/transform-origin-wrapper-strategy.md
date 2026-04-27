# Transform Origin Wrapper Strategy

This note is for future implementation work, especially when using Claude Code.

The goal is to stop piling more math into `transform-composer.ts` before we fully understand the SVG/SMIL coordinate model.

## The Problem

GSAP/CSS gives users a convenient model:

```js
gsap.to(el, {
  scale: 1.5,
  transformOrigin: "50% 50%",
});
```

That means "scale this element around its own center".

SMIL does not expose that same model.

`<animateTransform type="rotate">` supports an explicit center:

```svg
<animateTransform
  attributeName="transform"
  type="rotate"
  from="0 50 50"
  to="360 50 50"
/>
```

But `scale`, `skewX`, and `skewY` do not have `cx cy` parameters. They are applied relative to the current SVG coordinate system. A centered scale is therefore not a single native SMIL primitive.

## Why The Current Compensation Gets Messy

The current approach tries to compensate for scale/skew origin by adding synthetic translate values:

```txt
tx = cx * (1 - sx)
ty = cy * (1 - sy)
```

That gets ugly fast because:

- each transform type affects the others;
- transform order matters;
- scale and skew change the rendered bbox;
- timelines can stack multiple transform animations on the same target;
- keyframes would require a compensation value for every keyframe;
- stagger and yoyo then need to rewrite those compensated values again.

This is why the code starts to feel like "compensation soup".

## The Alternative Idea

Instead of compensating every animation, normalize the coordinate system once.

SVG transforms happen around the current coordinate system's `(0, 0)`. If we can make the desired visual origin line up with local `(0, 0)`, then simple SMIL scale/skew animations become much easier.

The rough wrapper pattern is:

```svg
<g transform="translate(cx cy)">
  <g data-gsap-to-smil-origin-wrapper>
    <g transform="translate(-cx -cy)">
      <!-- original element moves here -->
      <circle cx="20" cy="30" r="10" />
    </g>
  </g>
</g>
```

Then animate the middle group:

```svg
<animateTransform
  attributeName="transform"
  type="scale"
  from="1 1"
  to="1.5 1.5"
  dur="1s"
/>
```

Important: wrapping in `<g>` does **not** magically reset `transform-origin`.

The wrapper stack works by changing the coordinate system:

1. The outer group translates the coordinate system so the desired origin is at local `(0, 0)`.
2. The inner group translates the artwork back so it visually stays in the same place before animation.
3. The middle group is the animation target. Its local `(0, 0)` now corresponds to the desired visual origin.

So we are not relying on a hidden browser feature. We are explicitly moving the coordinate frame.

## What Must Be Proven First

Before changing library code, create a small manual debug page that compares:

1. GSAP scaling a circle around `"50% 50%"`.
2. Manual SMIL wrapper-group scaling around the same point.
3. The current compensation-based SMIL output.

Do this with simple shapes first:

- `<circle>`
- `<rect>`
- maybe `<text>` only after circle/rect are understood

Do not test keyframes, stagger, yoyo, or timelines in the first proof. Those are multipliers. The first proof should answer only:

> Can wrapper groups make SMIL scale/skew around a desired origin without per-animation compensation math?

## Implementation Sketch

Possible future API:

```js
smil.to(el, {
  scale: 1.5,
  transformOrigin: "50% 50%",
  normalizeOrigin: true,
});
```

Possible internal steps:

1. Resolve target element.
2. Resolve desired origin `(cx, cy)` using `transformOrigin` + `getBBox()`.
3. Insert wrapper groups around the element.
4. Move the original element into the innermost group.
5. Animate the middle wrapper group instead of the original element.
6. Store enough metadata so `kill()` and `revert()` can unwrap cleanly.

## Open Questions

- How does this behave for elements that already have a `transform` attribute?
- Should wrappers be reused across multiple tweens on the same target?
- How do nested wrappers interact with timelines?
- What should `revert()` restore exactly?
- Does wrapping affect selectors, CSS inheritance, filters, masks, gradients, or event handling?
- Does `<text>` behave differently enough that it needs a separate rule?
- Would a nested `<svg>` viewport help or create clipping/viewBox problems?

## Strong Recommendation

Do not implement this directly in `transform-composer.ts` yet.

First add a manual debug file, prove or disprove the wrapper behavior in the browser, and document the observed DOM output.

If the wrapper strategy works, prefer it over expanding the current scale/skew compensation logic.

If it does not work, reduce scope:

- support `transformOrigin` only for rotation;
- document scale/skew as SVG-origin transforms;
- recommend authoring SVGs with manual wrapper groups when centered scale/skew is required.
