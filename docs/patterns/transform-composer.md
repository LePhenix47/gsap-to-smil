# Pattern: Transform Composer

## The problem

In GSAP you can animate multiple transforms in one call:

```js
gsap.to(el, { x: 100, rotation: 45, scale: 1.5 })
```

In SMIL, one `<animateTransform>` can only handle one transform type at a time.
You cannot combine `translate` and `rotate` in the same element.

On top of that, transform order matters — rotate-then-translate ≠ translate-then-rotate.
And without `additive="sum"`, each `<animateTransform>` replaces the previous one instead of stacking.

## The solution

`composeTransforms()` takes the transform bucket from `routeProperties()` and produces
one `<animateTransform>` per active transform type, in canonical order, all with `additive="sum"`.

```
{ x: 100, rotation: 45, scale: 1.5 }
         ↓
<animateTransform type="translate" from="0 0"   to="100 0" additive="sum" />
<animateTransform type="rotate"    from="0 cx cy" to="45 cx cy" additive="sum" />
<animateTransform type="scale"     from="1"     to="1.5"   additive="sum" />
```

## Canonical order

Transforms are applied in document order by the SMIL engine.
The composer always outputs them in this fixed order regardless of input key order:

```
1. translate   (x, y, xPercent, yPercent)
2. rotate      (rotation)
3. scale       (scale, scaleX, scaleY)
4. skewX
5. skewY
```

This matches GSAP's internal matrix composition order.

## Rotation origin

SMIL `rotate` takes `"angle cx cy"` — the rotation center in the **parent's coordinate space**.
CSS `transform-origin` has no effect on SMIL.

`composeTransforms()` resolves the rotation center in this priority order:

1. `transformOrigin` from `TweenVars` if provided — parsed as `"x% y%"` or `"px px"`
2. `getBBox()` on the element if it's in the rendered DOM — uses the element's geometric center
3. Fallback to `(0, 0)` with a console warning

## xPercent / yPercent

GSAP's `xPercent` / `yPercent` translate as a percentage of the element's own size.
SMIL has no equivalent — the composer resolves these to pixel values via `getBBox()` at build time.

## from / to strategy

The composer accepts optional `fromTransforms` and `toTransforms`:

| Method     | fromTransforms      | toTransforms         |
|------------|---------------------|----------------------|
| `to()`     | identity (0, 1…)    | vars values          |
| `from()`   | vars values         | identity (0, 1…)     |
| `fromTo()` | fromVars transforms | toVars transforms    |

"Identity" means the neutral value for each type: `0 0` for translate, `0` for rotation, `1` for scale.
