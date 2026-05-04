---
name: one-return-value-per-method
description: Each method returns exactly one value — no compound objects bundling multiple properties. Split compound returns into separate single-value methods. Trigger when writing or refactoring TypeScript methods.
---

# One Return Value Per Method

## Pattern

A method returns one thing. Not an object of three things. Not a tuple. One value. If a method today returns `{ calcMode, keySplines, keyTimes }`, split it into three methods: one for `calcMode`, one for `keySplines`, one for `keyTimes`.

## Good (Split Methods)

```typescript
// Each returns one value. Caller composes.
const calcMode = Easing.resolveCalcMode(ease);
const keyTimes = Easing.resolveKeyTimes(intervalCount);
const keySplines = Easing.resolveKeySplines(ease, intervalCount);

element.setAttribute("calcMode", calcMode);
if (calcMode !== "spline") return;
if (keyTimes) element.setAttribute("keyTimes", keyTimes);
if (keySplines) element.setAttribute("keySplines", keySplines);
```

## Bad (Compound Return)

```typescript
// Returns three things. Caller destructures.
const { calcMode, keySplines, keyTimes } = Easing.resolveCalcMode(ease, intervalCount);

element.setAttribute("calcMode", calcMode);
if (calcMode !== "spline") return;
if (keyTimes) element.setAttribute("keyTimes", keyTimes);
if (keySplines) element.setAttribute("keySplines", keySplines);
```

## When the Values Are Inherently a Unit

A `{ x, y }` point IS one thing — two coordinates of the same concept. Returning it as an object is fine. A `{ calcMode, keySplines, keyTimes }` bundle is three unrelated things that happen to be computed together — that's the anti-pattern.

The test: can you describe the return value with a single noun? "A point" — yes, object is fine. "The calc mode, key splines, and key times" — three nouns, split it.

## Why

Compound returns force every caller to destructure. They obscure which callers need which values. A method that returns three things is doing three jobs. Splitting them makes each method's contract explicit: "I return the calc mode." No ambiguity, no unused destructured fields, no "what else is in this object?" questions at the call site.

Compound returns also resist change. Adding a fourth property to `{ calcMode, keySplines, keyTimes }` updates every destructuring call site. Adding a fourth single-return method adds one method and touches only the callers that need it.
