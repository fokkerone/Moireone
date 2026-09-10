# Grill Session: Image-Referenced Line Width

Date: 2026-09-03
Spec reviewed: superspec/specs/image-reference-line-width/spec.md

## Pre-flight

### Wiki conflicts
None — no `superspec/wiki/` exists for this project.

### Techstack conflicts
None — `superspec/wiki/techstack/profile.md` doesn't exist; verified
directly against `package.json`/`vitest.config.ts` instead. Test stack is
`vitest` + `jsdom`, no `@testing-library`, no existing `.tsx` test files.
This confirms (doesn't conflict with) the spec/tasks' approach of testing
only the pure conversion/math functions automatically and treating the
browser-integration parts of Wave 3 as manually verified.

### Internal contradictions
Found and resolved (see Q1): the "Strength between 0 and 1 blends the
effect" scenario's description didn't match the blend formula pinned in
`tasks.md` — it described blending toward the minimum-width floor, but the
formula actually blends toward zero (with the floor applied only as a
clamp afterward). Fixed by correcting the scenario text to match the
formula.

## Questions & Resolutions

### Q1: Strength-blend scenario text vs. formula mismatch
**Recommended:** Fix the scenario text to describe what the pinned formula
(`scale = 1 + (factor - 1) * strength`) actually produces, rather than
changing the formula.
**Resolved:** Fix the text, keep the formula — no behavior change.
**Impact:** Spec change applied to `spec.md` ("Strength between 0 and 1
blends the effect" scenario).

### Q2: Is a separate `widthImageEnabled` field needed, distinct from
`widthImageData` presence?
**Recommended:** Keep it — lets the user temporarily toggle the effect off
without re-uploading, and the spec/tasks were already built around it.
**Resolved:** Keep the flag.
**Impact:** No change (already consistent in spec.md/tasks.md).

### Q3: Should pixel-index clamping at canvas edges be an explicit
requirement?
**Recommended:** Yes — add an explicit SHALL so it's testable and
prevents off-by-one/out-of-bounds reads at canvas edges.
**Resolved:** Add it.
**Impact:** Spec change applied — new NFR "Sampling stays in bounds" in
`spec.md`; `tasks.md` Task 1.2 updated with the clamping requirement and a
new edge-position test case.

### Q4: Should file-rejection (non-image upload) surface visible UI
feedback?
**Recommended:** Yes, add a visible-feedback SHALL.
**Resolved:** Rejected by the user — no visible-feedback requirement
added. Silent rejection (image unchanged, no crash) stands as originally
specified in Error Behavior.
**Impact:** No spec change. Documented here as a consciously accepted gap
— see Deferred Questions.

### Q5: Should the spec cap reference-image resolution before luminance
conversion?
**Recommended:** Yes — downscale so neither dimension exceeds 1024px,
since brightness sampling doesn't need full source resolution and this
bounds memory/decode time for large photo uploads.
**Resolved:** Add the cap.
**Impact:** Spec change applied — new NFR "Bounded image size" in
`spec.md`; `tasks.md` Task 3.1 updated with the downscale step and a new
test case for the downscale target-size calculation.

### Q6: Wave 3 (image upload + UI controls) can't be automated (no
`@testing-library`, no real canvas decoding in `jsdom`) — is manual
verification an acceptable substitute for the TDD proof the
`/subagent` workflow normally expects?
**Recommended:** Yes for the browser-integration parts specifically (file
input wiring, actual canvas decode, UI controls); keep automated unit
tests for every pure function involved (RGBA→luminance, downscale sizing).
**Resolved:** Accepted as-is.
**Impact:** No spec change — `tasks.md` Wave 3 already reflects this split
correctly; documented here as the explicit, conscious exception to the
project's usual TDD expectation.

## Spec Changes Required

All required changes from this session have already been applied:
- "Strength between 0 and 1 blends the effect" scenario corrected to
  match the actual blend formula (Q1).
- New NFR "Sampling stays in bounds" — pixel-index clamping (Q3).
- New NFR "Bounded image size" — 1024px max dimension downscale cap (Q5).
- `tasks.md` Task 1.2 and Task 3.1 updated to implement and test the above
  two NFRs.

## Deferred Questions

- [ ] Should non-image-file uploads show visible UI feedback (vs. silent
      rejection)? — deferred/declined for this iteration (Q4). The
      behavior (reject, leave existing image unchanged, no crash) is still
      fully specified in Error Behavior; only user-facing feedback on the
      rejection itself is left unspecified. Revisit if silent rejections
      prove confusing in practice.

## Verdict

**READY** — All decision branches resolved. Proceed to `/superspecs:pick-spec image-reference-line-width`.
