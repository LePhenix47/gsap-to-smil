# Pattern: Property Router

## The problem

`smil.to(el, { x: 100, opacity: 0.5, fill: "red", duration: 1, ease: "power2.out" })`

Every key in that object means something completely different:

- `x` → produces a `<animateTransform type="translate">`
- `opacity` → produces a `<animate attributeName="opacity">`
- `fill` → produces a `<animate attributeName="fill">`
- `duration` → never animated — sets `dur=` on the SMIL element
- `ease` → never animated — sets `calcMode` + `keySplines`

Without a routing step, every layer of the pipeline would need to understand the full shape of `TweenVars` and manually filter out what doesn't apply to it. That's coupling — and it breaks the moment you add a new key.

## The solution

A single `routeProperties(vars: TweenVars): PropertyBuckets` call at the entry point of every tween splits the flat object into five typed buckets:

```
transforms → { x, y, rotation, scale, skewX… }   → <animateTransform>
direct     → { opacity, fill, stroke… }            → <animate>
attrs      → contents of attr:{}                   → <animate>
special    → { duration, ease, repeat, delay… }    → tween control, not animated
plugins    → { drawSVG, motionPath, morphSVG }     → plugin dispatch
```

Each downstream consumer only receives the slice it needs:

```
routeProperties(vars)
       │
       ├── special   → SMILTween (timing, callbacks, defaults)
       ├── transforms → transform-composer.ts → <animateTransform>
       ├── direct    → builders.ts → <animate>
       ├── attrs     → builders.ts → <animate>
       └── plugins   → plugin classes → <animateMotion>, <animateTransform>…
```

## Why it matters

**Single responsibility.** The router is the only place that knows what each key means. Add a new key? Update the router. Nothing else changes.

**Type safety per layer.** `composeTransforms()` receives `TransformProps` — a type that only contains transform keys. It can't accidentally read `duration` or `ease`. The types enforce the contract.

**Testable in isolation.** You can unit-test `routeProperties()` without touching SMIL or the DOM at all — just check that keys land in the right bucket.

**Extensible.** Adding a new plugin key means adding it to the `PLUGIN_KEYS` set in the router and the `plugins` bucket type. No other file needs to change.

## The bucket types

Defined in `src/types/buckets.ts`:

```ts
type PropertyBuckets = {
  transforms: TransformProps;   // → <animateTransform>
  direct: DirectProps;          // → <animate> (top-level SVG attrs)
  attrs: AttrVars;              // → <animate> (from attr:{})
  special: SpecialProps;        // → tween control, fully resolved with defaults
  plugins: { ... };             // → plugin dispatch
};
```

`SpecialProps` is the only bucket with required fields and filled-in defaults — because tween control properties always need a value (`duration` defaults to `0.5`, `ease` defaults to `"power1.out"`, etc.).

## Named after

The [Chain of Responsibility](https://refactoring.guru/design-patterns/chain-of-responsibility) and [Message Router](https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageRouter.html) patterns from enterprise integration — route a message to the right handler based on its content, without the sender or receiver knowing about each other.
