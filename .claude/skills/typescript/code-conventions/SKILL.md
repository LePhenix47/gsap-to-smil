---
name: code-conventions
description: Zero-tolerance code quality rules — no underscores, explicit naming, broken-out calculations, arrow methods, proper null checks, typed intermediates.
---

# Code Conventions

These rules were extracted from hard lessons on `gsap-to-smil`. Break any of them and the code review fails. Cross-references to other skill files in this directory.

## 1. No Underscore Prefixes

Underscores on fields say "I'm special" without saying HOW. Use `private`/`protected` keywords instead. Name says exactly what the field holds.

```ts
// ❌ Bad
_dur: number;
_tDur: number;
_repeat: number;
_initialized: boolean;

// ✅ Good
protected durationSeconds: number;
protected totalDurationSeconds: number;
protected repeatCount: number;
protected hasBuilt: boolean;
```

**Why:** Underscores are Hungarian notation lite. They leak implementation detail into the name. `_dur` could mean "during", "durable", "duration" — reader must decode. `durationSeconds` answers the question at point of use.

## 2. Explicit Field Names

Name fields for WHAT they store, not a shorthand only you understand today.

| ❌ Bad | ✅ Good |
|--------|---------|
| `_dur` | `durationSeconds` |
| `_tDur` | `totalDurationSeconds` |
| `_rDelay` | `repeatDelaySeconds` |
| `_yoyo` | `yoyoEnabled` |
| `_paused` | `pausedState` |
| `_initialized` | `hasBuilt` |
| `_idCounter` | `animationIdCounter` |

**Why:** `_initialized` means different things to different subclasses (elements built? DOM injected? play() called?). `hasBuilt` is falsifiable — the element list either exists or it doesn't.

## 3. Break Out Intermediate Calculations

Every compound expression gets split into named intermediate variables with explicit type annotations. No math in return statements.

```ts
// ❌ Bad
return this._dur * (this._repeat + 1) + this._rDelay * this._repeat;

// ✅ Good
const totalPlayDurationSeconds: number = this.durationSeconds * (this.repeatCount + 1);
const totalGapSeconds: number = this.repeatDelaySeconds * this.repeatCount;
return totalPlayDurationSeconds + totalGapSeconds;
```

**Why:** A reader scanning the code cannot reverse-engineer `dur * (repeat + 1) + rDelay * repeat` in their head. Each sub-expression gets a name that explains its intent. Future you will read this at 3am.

## 4. Never `=== undefined`

`=== undefined` misses `null`. The only correct null/undefined check is:

```ts
// ❌ Bad
if (value === undefined) return this.durationSeconds;
if (value == null) return this.durationSeconds;

// ✅ Good
private isAbsent = (value: unknown): value is undefined | null =>
  !value && ["undefined", "object"].includes(typeof value);

if (this.isAbsent(value)) return this.durationSeconds;
```

- `typeof null === "object"` — this is the JS spec, not a bug
- `typeof undefined === "undefined"`
- Combined with `!value`, the check correctly rejects `null` and `undefined` while allowing `0`, `""`, and `false`
- Extracted to a type guard so it's reusable, testable, and self-documenting

Cross-ref: `type-guards-for-unions` — same `value is Type` syntax.

## 5. Arrow Functions for All Concrete Methods

Every class method uses arrow syntax. Regular method syntax is reserved for `abstract` declarations only.

```ts
// ✅ Good
duration = (value?: number): number | this => {
  if (this.isAbsent(value)) return this.durationSeconds;
  this.durationSeconds = value;
  this.totalDurationSeconds = this.computeTotalDuration();
  return this;
};

// ✅ Also good — abstract must use regular syntax
abstract kill(): this;
abstract revert(): this;
```

**Why:** Arrow functions bind `this` lexically. Methods passed as callbacks (`.then()`, event handlers, Promise chains) don't lose their `this` context. No `.bind(this)` boilerplate.

## 6. Guard Clauses Always

No `if` inside `if` inside `if`. Return early on every fail condition.

Cross-ref: `use-guard-clauses` — same rule, full explanation.

```ts
// ❌ Bad
if (this._vars.keyframes !== undefined) {
  console.warn("...");
  return;
}
// ... 140 lines of nested logic

// ✅ Good
if (this.vars.keyframes !== undefined) {
  console.warn("[gsap-to-smil] keyframes not yet supported — skipped.");
  return;
}
this.buildAllElements();
```

## 7. Destructure All Objects

Extract properties at the top of the function. No `obj.prop` repeated 5 times.

Cross-ref: `destructure-objects-always` — same rule.

```ts
// ✅ Good
constructor(vars: TweenVars) {
  const {
    id,
    delay = 0,
    duration = 0.5,
    repeat = 0,
    repeatDelay = 0,
    yoyo = false,
    paused = false,
    reversed = false,
    data = null,
  } = vars;
```

## 8. No `any` — `unknown` Only

Cross-ref: `prefer-unknown-over-any` — same rule.

```ts
// ❌ Bad
data: any;

// ✅ Good
data: unknown;
private isAbsent = (value: unknown): value is undefined | null => ...
```

## 9. `type` Not `interface`

Cross-ref: `type-vs-interface` — same rule. Project standard.

## 10. Type Guards for Union Checks

Cross-ref: `type-guards-for-unions`. Applied at rule 4 above: `isAbsent` is a type guard that narrows `unknown` to `undefined | null`.

## 11. Map for Lookups, Switch for Logic

Cross-ref: `map-vs-switch-lookup`. When mapping a key to a value, use `Map`. When each branch does different work, use `switch`.

## 12. Optional Chaining Over Manual Null Checks

Cross-ref: `use-optional-chaining`. `el?.ownerSVGElement?.pauseAnimations()`, never `el && el.ownerSVGElement && el.ownerSVGElement.pauseAnimations()`.

## Enforcement order

When writing new code, check in this order:
1. No underscores, explicit names (rules 1-2)
2. Arrow methods, guard clauses (rules 5-6)
3. Destructure + type guard null checks (rules 4, 7)
4. Intermediate variables (rule 3)
5. `type` not `interface`, `unknown` not `any` (rules 8-9)
6. Map vs switch, optional chaining, type guards (rules 10-12)

When reviewing code: run rules 1-3 first. If those fail, stop and reject. The rest can be fixed in follow-up.
