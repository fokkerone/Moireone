# Wave 2: Core Logic

Started: 2026-09-03 11:03 CEST

## Task Status

| Task | Status | Review | Notes |
|------|--------|--------|-------|
| 2.1 | ✅ done (643e8b0) | ✅ passed | `applyImageScaling` helper wired into both `computeLineWidths` branches; isolated 2-file commit (+223/-2). |
| 2.2 | ✅ done (verification-only, no commit) | ✅ passed | Confirmed `computeLineWidths` has exactly 2 call sites (`render.ts:82`, `svgExport.ts:83`), both inside `if (layer.widthCurveEnabled)`. No code change needed, matches tasks.md expectation. |

## Review Log Summary
### Task 2.1
No Critical/High/Medium findings. Formula (`scale = 1 + (brightnessFactor-1)*strength`), per-vertex application across all three `widthMode` branches, and 0.1 floor clamp all match spec.md exactly. TDD followed (RED confirmed with 5/9 failing before implementation). Typecheck clean, 93/93 tests pass (9 new).

### Task 2.2
No Critical findings — verification task confirmed the gating invariant holds with no code changes required.

## Completed: 2026-09-03 11:08 CEST
