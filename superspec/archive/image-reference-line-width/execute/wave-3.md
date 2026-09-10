# Wave 3: UI and Image Loading

Started: 2026-09-03 11:12 CEST

## Task Status

| Task | Status | Review | Notes |
|------|--------|--------|-------|
| 3.1 | ✅ done (c3a28a8) | ✅ passed | `src/widthImageLoader.ts` (+ test), isolated 2-file commit (+120 lines). |
| 3.2 | ✅ done (213b04a + 87b0365 fix) | ✅ passed | `WidthImageControls.tsx` + `LayerPanel.tsx` wiring; layout bug found via manual browser testing and fixed. |

## Review Log Summary
### Task 3.1
No Critical/High/Medium findings. `loadReferenceImage` matches `widthImageData` shape exactly, rejects non-images, downscales correctly (never upscales), doesn't mutate state until fully decoded. `rgbaToLuminance`/`computeDownscaledSize` unit tested per spec. `loadReferenceImage` itself correctly left to manual verification (no DOM image-decode test infra), per GRILL.md Q6. Typecheck clean, 101/101 tests pass (8 new).

### Task 3.2
Manually verified in a real browser (not just typecheck/dev-server-start, per this project's "test UI changes in a browser" policy): uploaded a reference image, confirmed the rendered line widths visibly took on the image's shape (a recognizable portrait silhouette in variable-width lines, matching the original design reference the user provided during `/discuss`), toggled Invert (tonal direction flipped correctly), set Strength to 0 (effect fully disabled, reverted to pure curve), and clicked "Bild entfernen" (cleared cleanly, controls collapsed, file input reset).

**Finding (Medium, fixed):** the Referenzbild row (label + native file input + "Bild entfernen" button) didn't wrap and overflowed the fixed-width layer panel horizontally, making "Bild entfernen" unreachable without horizontal scrolling the whole sidebar. Fixed by adding `flex-wrap` to the row and constraining the file input's width (commit `87b0365`). Re-verified in-browser after the fix: button now wraps onto its own line, fully visible, no overflow.

No other findings. Typecheck clean, 101/101 tests pass (no test-count change, as expected for a manually-verified UI task per GRILL.md Q6).

## Completed: 2026-09-03 11:25 CEST

## Completed: (pending)
