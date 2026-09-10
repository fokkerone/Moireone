# Execution Plan: Image-Referenced Line Width

**Spec:** superspec/specs/image-reference-line-width/spec.md
**Tasks:** superspec/specs/image-reference-line-width/tasks.md
**Context estimate:** ~15k / 200k ✅
**Started:** 2026-09-03

## Execution Strategy

Wave execution order: Wave 1 → Wave 2 → Wave 3 → Wave 4
Parallelism:
- Wave 1: Tasks 1.1 and 1.2 can run in parallel (1.1 is a pure data-shape
  change to `types.ts`/`state.ts`; 1.2 is a new pure function). 1.2's test
  work does not require 1.1's fields to exist beyond the `widthImageData`
  shape they both define — land 1.1 first if any doubt, since it's trivial
  and unblocks the type everything else references.
- Wave 2: Tasks 2.1 and 2.2 touch the same function/call sites — run as one
  sequential thread, not parallel subagents.
- Wave 3: Tasks 3.1 and 3.2 can run in parallel once Wave 1 lands (3.1 is a
  new loader module, 3.2 is UI wiring that calls into it) — in practice,
  land Wave 2 first so there's a working `computeLineWidths` to visually
  verify Wave 3's manual checks against.
- Wave 4: Task 4.1 is a single verification/cleanup task, runs last.

## Wave Summary

### Wave 1 — Foundation
Sequential / Parallel: Parallel (1.1, 1.2)
Tasks: 1.1, 1.2
Unblocks: Wave 2, Wave 3

### Wave 2 — Core Logic
Sequential / Parallel: Sequential (2.1 → 2.2, same file)
Tasks: 2.1, 2.2
Unblocks: Wave 4 (and gives Wave 3 something real to verify against)

### Wave 3 — UI and Image Loading
Sequential / Parallel: Parallel (3.1, 3.2)
Tasks: 3.1, 3.2
Unblocks: Wave 4

### Wave 4 — Integration Check
Tasks: 4.1

## Executor Instructions

Each subagent receives:
1. `superspec/specs/image-reference-line-width/spec.md` (full)
2. `superspec/specs/image-reference-line-width/tasks.md` (their task only)
3. The codebase, on the feature branch created by `/superspecs:branch`
4. No prior chat history — all context above is self-contained

Known code-reading pointers already gathered during discussion/spec/grill
(save each subagent from re-discovering these from scratch):
- `src/lineWidths.ts` — `computeLineWidths(line, layer, canvasWidth,
  canvasHeight)`, the integration point for Task 1.2/2.1/2.2
- `src/widthProfile.ts` — existing `widthAt3` curve math (unchanged by this
  feature, but shows the file's style)
- `src/types.ts` — `LayerParams` interface (Task 1.1 target)
- `src/state.ts` — `createDefaultLayer` (Task 1.1 target)
- `src/render.ts` (~line 72) and `src/svgExport.ts` (~line 82) — both call
  `computeLineWidths` inside `if (layer.widthCurveEnabled)` (Task 2.2 /
  4.1 verification point)
- `src/components/WidthCurveEditor.tsx` — existing pattern for a
  layer-settings sub-component using `onUpdate: (patch: Partial<LayerParams>) => void`
  (Task 3.2 should follow this pattern)
- `src/lineWidths.test.ts` — existing `makeLayer(overrides)` test helper
  and test style to extend (Task 1.1/2.1)
- Test stack: `vitest` + `jsdom`, no `@testing-library`, no `.tsx` test
  files exist yet — Wave 3's UI wiring (3.2) and the browser-integration
  half of 3.1 (actual file decode) are manually verified per the spec's
  Grill session (GRILL.md Q6); only the pure conversion/sizing functions in
  3.1 get automated tests.

## Branch

Branch name: `superspec/image-reference-line-width`
Type: branch
Worktree path: N/A
Created from: main @ 572d2f0
Created: 2026-09-03 10:08 CEST

**Corrected 2026-09-03 ~10:55 CEST:** the initial branch-from-`main` choice
was wrong — `main` in this repo is a stale scaffold (only `src/main.ts`,
no app code); all real app source lives only on
`feature/moire-flowfield-generator` (never merged to `main`). Task 1.1's
subagent hit this and worked around it by merging the entire feature-branch
tree into its commit, which polluted the diff (9,116 unrelated lines).
Branch was deleted and recreated from the correct base:

Rebased from: `feature/moire-flowfield-generator` @ 703416d
Rebased: 2026-09-03 10:55 CEST
Task 1.1 re-committed cleanly on top (`a086286`, 7 files, +72 lines only).

All subsequent waves/tasks in this execution use
`feature/moire-flowfield-generator` as the effective base — not `main`.

## Human Checkpoints
- After Wave 1: review and approve before Wave 2
- After Wave 2: review and approve before Wave 3
- After Wave 3: review and approve before Wave 4
- After Wave 4: full verification before ship (`/superspecs:verify`)
