---
name: no-abbreviations
description: Variable and parameter names must be full words — no abbreviations. Use `element` not `el`, `animationOptions` not `opts`, `durationSeconds` not `dur`. Trigger when writing or refactoring TypeScript code.
---

# No Abbreviations

## Pattern

Every variable, parameter, and property name spells out the full word. Reading the code should require zero mental decoding.

## Good (Full Words)

```typescript
static animateTransform(
  transformOptions: AnimateTransformOptions,
): SVGAnimateTransformElement {
  const element = document.createElementNS(
    SMILBuilder.SVG_NS,
    "animateTransform",
  ) as SVGAnimateTransformElement;

  element.setAttribute("type", transformOptions.type);
  SMILBuilder.applyTiming(element, transformOptions);

  return element;
}
```

## Bad (Abbreviated)

```typescript
static animateTransform(
  opts: AnimateTransformOptions,
): SVGAnimateTransformElement {
  const el = document.createElementNS(
    SMILBuilder.SVG_NS,
    "animateTransform",
  ) as SVGAnimateTransformElement;

  el.setAttribute("type", opts.type);
  SMILBuilder.applyTiming(el, opts);

  return el;
}
```

## Common Replacements

| Abbreviation | Full Word |
|-------------|-----------|
| `el` | `element` |
| `opts` | `animationOptions`, `timingOptions`, `valuesOptions`, `transformOptions` — name it for what the options ARE |
| `anim` | `animationElement` |
| `dur` | `durationSeconds` |
| `tl` | `timeline` |
| `attr` | `attributeName` (or keep `attr` only as a GSAP API key, not a variable name) |
| `fn` | `handler` or a descriptive name |

## When to Use

- All variable declarations (const, let, var)
- All function/method parameters
- All class field names
- All type/interface property names

## The "opts" Problem

`opts` is the most common abbreviation and the worst offender. It says "options" but never WHICH options. In a class with three private methods each receiving different `Pick<>` subsets, every `opts` looks identical but carries different data:

```typescript
// Each gets different Pick<> types — different data, same vague name
private static applyTiming(el: SVGAnimationElement, opts: Pick<AnimateOptions, "dur" | "delay" | ...>)
private static applyValues(el: SVGAnimationElement, opts: Pick<AnimateOptions, "from" | "to" | ...>)
static animate(opts: AnimateOptions)
static animateTransform(opts: AnimateTransformOptions)
```

Name the parameter for what it carries: `timingOptions`, `valuesOptions`, `animationOptions`, `transformOptions`. Reader knows immediately what data flows through each method without reading the type signature.

## Why

Abbreviations save keystrokes, not reading time. `el` costs the writer 7 fewer characters but costs every reader a mental decode step: "el = element? elevation? electric? elastic?". Full words answer the question at point of use. Code is read 10x more than written — optimize for the reader.
