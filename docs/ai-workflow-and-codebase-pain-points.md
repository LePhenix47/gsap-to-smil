# Pain points we hit (short notes)

Short list of what went wrong on this repo so the next session does not repeat it. Not a full post-mortem.

## Core classes

[SMILTween.ts](../src/core/SMILTween.ts) and [SMILTimeline.ts](../src/core/SMILTimeline.ts) are hard to keep clean. The same logic shows up in more than one place. There are `as` casts that do not buy much. The flow still matches an older plan (fixed `begin` times, transform bookkeeping) while newer direction lives in [experiment-first.md](./experiment-first.md).

Guard clauses are thin or uneven. `?? 0` shows up where the real question is null, undefined, or a valid zero, so intent gets muddy. It is still hard to read a long method and know what invariant it is supposed to hold.

Large AI patches that never got a careful read become the source of truth. When the window ends or you hit a cooldown, you come back to code that is awkward to re-enter and easy to misread.

## Utils

Under `src/utils/` many small exports sit next to each other. A tighter module boundary (one obvious export, or a small static helper object) would make “who calls what” easier. It is not always obvious what is public API versus internal.

## Agent cheat sheet

[CLAUDE.md](../CLAUDE.md) was not filled in early. Without it, each chat guesses style and rules, leans on the spec, and drifts from docs we already wrote such as [experiment-first.md](./experiment-first.md) and [mapping-challenges.md](./mapping-challenges.md).

## How the tools were used

Big asks with little review meant weak changes in hot paths. Token limits and cooldowns hurt more when a refactor stops halfway: you wait, and you never fully owned what landed.

That is rough on morale too. Outsourcing most of the typing is a normal thing to chafe at.

## Patterns to avoid

Confident “you cannot do X” from theory, with no tiny HTML or CodePen check. We leaned on math-only transform fixes; then sequential scale and skew fought translate compensation across steps.

Habit to steal from [experiment-first.md](./experiment-first.md): smallest repro first, then decide if something is impossible.

## What to do next

1. Bring [CLAUDE.md](../CLAUDE.md) up to date: scope, links to the real docs, experiment-first as default habit.
2. Keep each agent task small. Shorter prompts, less noise. Optional: a “caveman” pass on the prompt so only the core ask remains.
3. When the project moves, update this file and [experiment-first.md](./experiment-first.md) so the next chat does not argue against a POC we already ran.

## Any assistant

Without project notes, without tiny experiments, and without a human pass, any model can still ship plausible refactors that add debt. This file is where we name those failure modes once.

## Other docs

[experiment-first.md](./experiment-first.md)  
[mapping-challenges.md](./mapping-challenges.md)  
[refactor-plan.md](./refactor-plan.md)  
[transform-origin-analysis.md](./transform-origin-analysis.md)
