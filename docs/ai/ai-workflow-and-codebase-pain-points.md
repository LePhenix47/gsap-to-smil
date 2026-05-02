# Pain points we hit (short notes)

Short list of what went wrong on this repo so the next session does not repeat it. Not a full post-mortem.

## Core classes

[SMILTween.ts](../src/core/SMILTween.ts) and [SMILTimeline.ts](../src/core/SMILTimeline.ts) are messy to work on. The same ideas repeat. `as` casts do not help much. The code still follows an older plan (fixed `begin` times, hand-rolled transform state) while the newer direction is in [experiment-first.md](./experiment-first.md).

There is almost no guard clause use. `?? 0` shows up everywhere even when we really wanted a falsy fallback (`||` or a small `if`), not a fallback only for `null` or `undefined`. Then `0` or `""` can behave wrong and the reader cannot tell what we meant. Long methods are still hard to scan.

Big AI patches that never got a real review become the source of truth. When the chat ends or you hit a cooldown, you open the repo and the code is hard to pick up again.

## Utils

Under `src/utils/` there are many tiny exports side by side. One clear export or a small static helper object would make it obvious who calls what. Public API vs internal helper is not written down.

## Agent cheat sheet

[CLAUDE.md](../CLAUDE.md) was not filled in early. Without it, each chat invents style and rules, reads the spec instead of trying a tiny repro, and ignores docs we already wrote like [experiment-first.md](./experiment-first.md) and [mapping-challenges.md](./mapping-challenges.md). It also skips the repo’s own skill notes under [.claude/skills/](../.claude/skills/) (`git/`, `react/`, `sass/`, `typescript/`, etc.) even though that folder is in the tree next to `CLAUDE.md`.

## How the tools were used

Huge prompts with almost no review put weak code on the main paths. If the chat stops mid-refactor, token limits and cooldowns mean you wait, and you never really owned what landed.

That also feels bad: you are not the one typing most of it.

## Patterns to avoid

Long rants that “you cannot do X” from theory alone, with no tiny HTML or CodePen. We leaned on math-only transform fixes; then sequential scale and skew broke because translate compensation stacked wrong across steps.

Borrow the habit from [experiment-first.md](./experiment-first.md): smallest repro first, then decide if something is impossible.

## What to do next

1. Bring [CLAUDE.md](../CLAUDE.md) up to date: scope, links to the real docs, experiment-first as default habit.
2. Keep each agent task small. Shorter prompts, less noise. Optional: a “caveman” pass on the prompt so only the core ask remains.
3. When the project moves, update this file and [experiment-first.md](./experiment-first.md) so the next chat does not argue against a POC we already ran.

## Any assistant

No project notes, no tiny experiments, no human pass: any model can still ship refactors that sound fine and add debt. This file names those failure modes once.

## Other docs

[experiment-first.md](./experiment-first.md)  
[mapping-challenges.md](./mapping-challenges.md)  
[refactor-plan.md](./refactor-plan.md)  
[transform-origin-analysis.md](./transform-origin-analysis.md)
