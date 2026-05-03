Refactor Plan: Rewrite Core Classes (v2)                                               
                                                                                         Context   
                                     
 Current src/core/ classes are bloated, mix concerns, and use an obsolete absolute-time
  _rewriteBegin model. The user called out: method names not explicit, no guard
 clauses, treating symptoms for specific use cases, "ooga booga" code quality.

 The POC in tests/integration/begin-chaining-poc.html proves begin="anim.end" chaining
 eliminates the need for _transformAccum, delta encoding, _rewriteBegin, and
 _pendingInjections. The architecture is simpler: build elements, inject them with
 chained begin= references, browser handles the rest.

 Phase 1 (static class conversion) is DONE. This plan covers Phases 2-4: rewriting the
 three core classes.

 Key principles

 1. Guard clauses everywhere — early return / throw, no deep nesting. See
 .claude/skills/typescript/use-guard-clauses.
 2. Explicit method names — each name says exactly what happens. buildTransformElements
  not _buildTransforms. injectChildIntoDOM not _addChild.
 3. General cases, not specific ones — no if (this._timelineAccum) branching. Tween
 builds elements. Timeline injects them. Clean separation always.
 4. One responsibility per method — no method that both computes values AND writes to
 the DOM.
 5. Destructure parameters — see .claude/skills/typescript/destructure-objects-always.
 6. No any — see .claude/skills/typescript/prefer-unknown-over-any.

 ---
 Phase 2: Rewrite Animation.ts (~100 lines)

 Clean up the abstract base class. Remove dead state.

 Removals

 - _ts — dead state, timeScale has no SMIL equivalent
 - _start — timeline concern, nothing to do with base animation class
 - then() — setTimeout-based, doesn't account for seek/pause/timeScale changes. Replace
  with direct getter totalDuration that callers can use.

 Changes

 - Destructure vars in constructor
 - Keep _initialized: true = elements built, false = not built or cleaned up
 - Keep all timing fields: _delay, _dur, _tDur, _repeat, _rDelay, _yoyo, _paused,
 _reversed
 - Keep fluent getter/setter pattern (matches GSAP API)
 - Keep data, parent, id

 Target: ~100 lines (down from 167)

 ---
 Phase 3: Rewrite SMILTween.ts (~350 lines target)

 Pure builder. Given targets + vars, builds SMIL elements. No DOM injection. No
 timeline awareness. Always builds immediately in constructor.

 Contract

 class SMILTween extends Animation {
   readonly targets: Element[];
   readonly elements: SVGAnimationElement[];
   readonly scaffolds: Map<Element, PivotScaffold>;

   constructor(targets: TweenTarget, vars: TweenVars, fromVars?: TweenVars | null,
 isFrom?: boolean);
 }

 What SMILTween DOES

 1. Resolves targets from TweenTarget → Element[]
 2. Routes properties via PropertyRouter.route()
 3. Builds transform elements via TransformComposer.compose()
 4. Builds direct attribute elements (opacity, fill, stroke...)
 5. Builds plugin elements (drawSVG)
 6. Applies stagger encoding (values/keyTimes rewrite)
 7. Applies yoyo encoding (values/keyTimes rewrite)
 8. Saves original attribute values for revert()
 9. Collects all elements + scaffold info — caller injects

 What SMILTween does NOT do

 - No appendChild / insertBefore — ever
 - No _timelineAccum
 - No _pendingInjections
 - No _buildDeferred / _injectPending
 - No computeTransformDelta
 - No _wrapperOuters
 - No DOM write of any kind

 Explicit method names

 - resolveTargets() — normalize TweenTarget → Element[]
 - buildTransformElements() — creates animateTransform + scaffold info
 - buildDirectAttributeElements() — creates animate elements for opacity/fill/stroke...
 - buildPluginElements() — creates plugin animation elements
 - applyStaggerEncoding() — rewrite from/to → values/keyTimes for stagger sync
 - applyYoyoEncoding() — rewrite from/to → values/keyTimes for yoyo
 - saveOriginalAttributes() — capture pre-animation values for revert()
 - restoreOriginalAttributes() — put back saved values on revert()

 Target: ~350 lines (down from 788)

 ---
 Phase 4: Rewrite SMILTimeline.ts (~280 lines target)

 Sole orchestrator. Owns DOM injection, begin= chain assignment, scaffold lifecycle.

 Architecture switch: absolute begin → begin="anim.end" chaining

 Old model (remove):
 - Pre-compute absolute begin times with _rewriteBegin()
 - _transformAccum tracks frozen state for delta encoding
 - _pendingInjections defers DOM insertion until begin= is correct
 - All three reach into tween internals

 New model (implement):
 - Each child tween builds its elements (no injection)
 - Timeline injects elements with chained begin= references
 - Sequential: prevAnchorId.end → next element's begin
 - With offset: prevAnchorId.end+0.5s → gap between children
 - Infinite loop: first element gets begin="0s; lastAnchorId.end+repeatDelay"
 - Finite repeat: first element gets end="totalDuration" to cap cycles
 - Cross-target sync: all targets in step N+1 reference last target's step N anchor

 Injection flow per child

 1. Create SMILTween(targets, vars) → elements + scaffolds built
 2. If scaffold needed, create pivot groups, inject inner elements into scaffold layers
 3. Assign unique IDs to anchor elements (first + last of each child)
 4. Set begin= using prevChildLastAnchor.end + gap
 5. For first child: set begin="timeline._delay; lastChildLastAnchor.end+repeatDelay"
 6. Inject outer elements directly into target
 7. Track scaffold for cleanup on kill/revert

 Properties

 class SMILTimeline extends Animation {
   private _children: Array<{ tween: SMILTween; absoluteStart: number }>;
   private _labels: Map<string, number>;
   private _defaults: Partial<TweenVars>;
   private _previousAnchorId: string | null;
   private _previousEndTime: number;
   private _scaffolds: Map<Element, SVGGElement[]>;
 }

 Explicit method names

 - resolvePositionToSeconds() — position param → absolute time
 - addChildTween() — inject + chain a child (shared by to/from/fromTo)
 - assignChainBegin() — set begin= on child using previous anchor
 - assignLoopBegin() — set begin="0s; lastAnchor.end+gap" for infinite loops
 - assignFiniteEndCap() — set end= on first elements to block excess cycles
 - injectElementsIntoDOM() — append elements to targets or scaffolds
 - removeAllChildren() — kill children + clean scaffolds (was clear())
 - destroyAndRevertAll() — kill + revert all children (was kill())

 Target: ~280 lines (down from 292, but does more: injection + scaffolds + chaining)

 ---
 Phase 5: Update facade + test imports

 - src/index.ts — update if constructor signatures changed
 - Verify all 12 test files still compile and pass

 ---
 Files modified

 ┌──────────────────────────┬───────────────────────────────────────────┐
 │           File           │                  Action                   │
 ├──────────────────────────┼───────────────────────────────────────────┤
 │ src/core/Animation.ts    │ Rewrite (clean up)                        │
 ├──────────────────────────┼───────────────────────────────────────────┤
 │ src/core/SMILTween.ts    │ Rewrite from scratch (pure builder)       │
 ├──────────────────────────┼───────────────────────────────────────────┤
 │ src/core/SMILTimeline.ts │ Rewrite from scratch (chain orchestrator) │
 ├──────────────────────────┼───────────────────────────────────────────┤
 │ src/index.ts             │ Update if constructor signatures changed  │
 └──────────────────────────┴───────────────────────────────────────────┘

 ---
 Verification

 1. bun run ts-types — TypeScript compiles clean
 2. bun run test — all 246 tests pass
 3. bun run ai-slop-check — Fallow code quality
 4. Open tests/integration/no-plugins.html — all animations match GSAP (diff mode =
 black)
 5. Open tests/integration/drawsvg.html — DrawSVG matches
 6. Open tests/integration/motionpath.html — MotionPath matches
 7. Open tests/integration/morphsvg.html — MorphSVG matches
 8. Open tests/integration/begin-chaining-poc.html — verify loop behavior matches