---
title: Branch Topology — main is a stale scaffold
summary: "`main` in this repo only contains the initial p5.js/Vite scaffold; all real app code lives on `feature/moire-flowfield-generator`, which was never merged. Always branch new spec work from the feature branch, not `main`."
tags: [decisions, branching, image-reference-line-width]
spec: "[[image-reference-line-width/Home|image-reference-line-width]]"
created: 2026-09-03
updated: 2026-09-03
provenance:
  sources: [phases/image-reference-line-width-execute/plan.md, live git history inspection during execution]
  extracted: 60%
  inferred: 40%
  ambiguous: 0%
---

# Branch Topology — `main` is a stale scaffold

## Summary
In this repo, `main` is **not** where the application lives. It only has the initial p5.js/Vite project scaffold (`src/main.ts`, config files). All real app code (`src/types.ts`, `src/state.ts`, layer panel, width system, everything) exists only on `feature/moire-flowfield-generator`, which has never been merged into `main`.

## Context
Discovered during execution of `[[image-reference-line-width/Home|image-reference-line-width]]` (2026-09-03). `/superspecs:branch` was run with `main` as the chosen base (the skill's own default recommendation, and the human's choice when asked). The resulting branch had none of the app source. A Task 1.1 subagent hit a wall trying to typecheck/test against a branch missing all its dependencies, and worked around it by merging in the entire `feature/moire-flowfield-generator` tree via `git checkout feature/moire-flowfield-generator -- .`, which polluted its commit with ~9,100 unrelated lines. This was caught during review, and the branch was deleted and recreated from the correct base.

## Key Decisions

### Decision: Always branch spec work from `feature/moire-flowfield-generator`, not `main`
**Chose:** `feature/moire-flowfield-generator` as the effective base for all `superspec/*` branches.
**Over:** `main` (the nominal default in `/superspecs:branch`'s own guidance).
**Because:** `main` lacks the application entirely; branching from it produces a branch that cannot type-check or run tests until the real source is somehow reintroduced.
**Trade-off:** none — this is simply the correct base until/unless `feature/moire-flowfield-generator` is merged into `main`, at which point this note becomes stale and should be updated or removed.

## Gotchas

- **`git log -1 main` looks deceptively plausible:** at the time of writing, `main`'s tip commit message is "Set canvas display to block to remove inline-element gap" — a message that sounds like it's touching real UI code, and a naive `git merge-base` check made `main` look like a clean ancestor of the feature branch (it is — it's just *also* the entire extent of `main`'s content). Checking the commit message or merge-base alone was not enough; the fix was running `git ls-tree -r main --name-only | grep '^src/'`, which showed only `src/main.ts`.
- **Symptom if this is missed:** `npx tsc --noEmit` fails immediately with dozens of "Cannot find module" / missing-file errors once any file that imports from `./types`, `./state`, etc. is touched — that's the signal to check branch topology before debugging further.

## Open Questions
- [ ] Should `feature/moire-flowfield-generator` be merged into `main` at some point so this stops being a footgun for every future spec? Not this feature's call to make — flagging for whoever owns repo housekeeping.

## Related
- [[image-reference-line-width/Home|image-reference-line-width]] — the feature whose execution surfaced this
- `superspec/phases/image-reference-line-width-execute/plan.md` — full incident notes in the "Branch" section
