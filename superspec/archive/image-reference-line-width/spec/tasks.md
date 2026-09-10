# Implementation Tasks: Image-Referenced Line Width

## Context Window Budget
Estimated spec + task tokens: ~9k / 200k ✅

## Wave 1 — Foundation

### Task 1.1: Add reference-image fields to `LayerParams` and defaults
**What:** Extend the `LayerParams` interface with:
- `widthImageEnabled: boolean`
- `widthImageInvert: boolean`
- `widthImageStrength: number` (0..1)
- `widthImageData: { width: number; height: number; luminance: Float32Array } | null`
  — precomputed, row-major, normalized [0,1] luminance samples of the
  reference image, downscaled so neither dimension exceeds 1024px (spec
  NFR "Bounded image size"); `null` means no image
  assigned. This is the only form of the reference image that reaches the
  width computation — no `HTMLImageElement`/`File` there.

Add matching defaults to `createDefaultLayer` in `src/state.ts`:
`widthImageEnabled: false`, `widthImageInvert: false`,
`widthImageStrength: 1`, `widthImageData: null`.

**Files to create/modify:** `src/types.ts`, `src/state.ts`
**Test requirement:** Existing tests in `src/lineWidths.test.ts` and any
`state.ts` tests must still construct valid `LayerParams` objects — update
the `makeLayer` helper in `lineWidths.test.ts` to include the new fields.
No new behavioral test needed for this task (pure data shape change).
**Done when:** Project type-checks; existing test suite passes unchanged.

### Task 1.2: Brightness sampling utility
**What:** Add a pure function that, given `widthImageData`, a canvas
position `(x, y)`, and the canvas dimensions, returns a brightness factor
in [0, 1] using "cover" fit mapping (image scaled uniformly to cover the
canvas, centered, overflow cropped) and nearest-pixel lookup into the
`luminance` array. Clamp the computed row/column index to
`[0, width-1]`/`[0, height-1]` before the array lookup (spec NFR "Sampling
stays in bounds") so rounding at canvas edges can never index outside the
array. Handle the `invert` flag here or in the caller (caller's
choice — keep this function focused on "luminance at this canvas
position", with invert applied by the caller per spec's Brightness Factor
definition).

Suggested signature:
```ts
function sampleImageLuminance(
  imageData: { width: number; height: number; luminance: Float32Array },
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): number
```

**Files to create/modify:** `src/lineWidths.ts` (or a new `src/widthImage.ts`
if that reads cleaner — keep `lineWidths.ts` as the integration point either
way)
**Test requirement:** New test file (e.g. `src/widthImage.test.ts` or add to
`lineWidths.test.ts`) covering:
- a position mapping to a known pixel returns that pixel's exact luminance
- cover-fit math for a wide image on a tall canvas (and vice versa) keeps
  every in-canvas position resolving to an in-bounds image pixel (spec
  scenario "Sampling never falls outside the source image")
- a position exactly on the canvas edge (x=0, x=canvasWidth, y=0,
  y=canvasHeight) does not throw and returns a valid in-bounds luminance
  value (spec NFR "Sampling stays in bounds")
- a canvas corner/edge position doesn't throw or return `NaN`
**Done when:** New tests pass; function is pure and side-effect free.

## Wave 2 — Core Logic
Depends on Wave 1. Tasks in this wave touch the same function
(`computeLineWidths`) sequentially — treat as one thread of work, not
parallel subagents, unless split cleanly by file.

### Task 2.1: Integrate brightness scaling into `computeLineWidths`
**What:** In `src/lineWidths.ts`, after computing each vertex's base width
(from the existing curve/mode logic, unchanged), apply brightness scaling
when `layer.widthImageEnabled && layer.widthImageData` is present:
1. Sample luminance at the vertex's canvas position via the Task 1.2
   utility.
2. Compute `brightnessFactor = layer.widthImageInvert ? luminance : 1 - luminance`
   (so factor 1 = darkest-under-non-invert = full width, matching the
   spec's "dark = thick, non-inverted" default).
3. Blend: `scale = 1 + (brightnessFactor - 1) * layer.widthImageStrength`
   (equivalent to `lerp(1, brightnessFactor, strength)` from DISCUSS.md).
4. `finalWidth = Math.max(0.1, baseWidth * scale)`.

This must apply per-vertex for **all three** `widthMode` values
(`alongLine`, `byPosition`, `byAngle`) — including the two constant-per-line
modes, where today every vertex gets the *same* base width; after this
change, vertices in those modes can still diverge from each other because
each gets its own brightness sample, even though `baseWidth` itself stays
constant across the line (spec: "Modulation composes with
byPosition/byAngle modes").

**Files to create/modify:** `src/lineWidths.ts`
**Test requirement:** New tests in `src/lineWidths.test.ts` covering the
spec's scenarios directly:
- dark region → full base width (non-inverted, strength 1)
- light region → base width scaled to the 0.1 floor (non-inverted,
  strength 1)
- invert = true swaps which region is thick vs. thin
- strength = 0 → image has zero effect regardless of luminance
- strength = 0.5 → result is exactly halfway between base width and zero
  (`baseWidth * 0.5`), for a known white-region sample where that halfway
  value is still above the 0.1 floor
- `alongLine` mode: two vertices on the same line, mapped to different
  luminance values, get different final widths
- `byPosition`/`byAngle` mode: two vertices on the same line (same base
  width from the mode's midpoint rule) but different luminance samples end
  up with different final widths
- `widthImageEnabled: false` (or `widthImageData: null`) → output
  identical to current behavior (regression guard — reuse existing
  `lineWidths.test.ts` cases unmodified as the baseline)
**Done when:** All new + existing tests in `lineWidths.test.ts` pass.

### Task 2.2: Gate on `widthCurveEnabled`
**What:** Verify (and add a test proving) that the brightness scaling in
Task 2.1 only ever runs through the ribbon-rendering path, which is already
gated by `layer.widthCurveEnabled` in `src/render.ts` and `src/svgExport.ts`
— `computeLineWidths` is only called from within that `if
(layer.widthCurveEnabled)` branch in both files today, so no code change
should be required here. This task is a verification + regression-test
task, not new logic.
**Files to create/modify:** none expected; `src/lineWidths.test.ts` if a
gap is found
**Test requirement:** Confirm via reading `src/render.ts` and
`src/svgExport.ts` that `computeLineWidths` call sites remain inside the
`widthCurveEnabled` branch after Wave 2.1's edits (no accidental new call
site added elsewhere).
**Done when:** Confirmed and documented in the task's completion notes; add
a regression test only if a gap is actually found.

## Wave 3 — UI and Image Loading
Depends on Wave 1 (needs the `LayerParams` shape). Independent of Wave 2's
internals (only needs the field names), so can run in parallel with Wave 2
if desired — but land Wave 2 first in practice since it's the smaller,
higher-risk piece to validate alone.

### Task 3.1: Image upload → `widthImageData` pipeline
**What:** Add the (first-ever in this codebase) image file loading path:
a file input that accepts image MIME types, decodes the chosen file via
`HTMLImageElement`/`createImageBitmap`, draws it to an offscreen
`<canvas>` **sized so neither dimension exceeds 1024px** (scale down
proportionally if the source is larger; spec NFR "Bounded image size"),
reads it with `getImageData`, and converts RGBA pixels to a
`Float32Array` of normalized luminance (standard perceptual luminance
weighting, e.g. `0.299*R + 0.587*G + 0.114*B`, normalized to [0,1]),
producing the `widthImageData` shape from Task 1.1. Non-image files SHALL
be rejected (spec: Error Behavior) without altering any existing
`widthImageData`. While decoding is in flight, `widthImageData` SHALL
remain whatever it was before (spec: fall back to base width, not a crash)
— i.e. only replace it once decoding completes successfully.
**Files to create/modify:** new module, e.g. `src/widthImageLoader.ts`;
wire into wherever layer state updates are dispatched from the UI (check
`src/components/LayerPanel.tsx` and whatever `onUpdate`/patch mechanism the
app already uses for layer field changes)
**Test requirement:** Unit test the RGBA→luminance conversion function in
isolation (pure function, no DOM needed): known pixel colors in → expected
luminance values out (pure white → 1, pure black → 0, pure red/green/blue →
their respective weighted values). Separately, unit test the downscale
target-size calculation (pure function of source width/height → output
width/height) for: a landscape image over 1024px, a portrait image over
1024px, and an image already under 1024px (untouched, no upscaling).
**Done when:** Conversion function has passing unit tests; manual smoke
test confirms an uploaded JPEG/PNG produces a non-null `widthImageData` on
the layer.

### Task 3.2: Layer panel controls
**What:** Add UI to `src/components/LayerPanel.tsx` (or a new small
component alongside `WidthCurveEditor.tsx`, following that component's
existing patterns) for:
- Image upload input (calls Task 3.1's pipeline, sets `widthImageData` +
  `widthImageEnabled: true` on successful decode)
- Clear/remove button (sets `widthImageData: null`, per spec "Clearing a
  layer's reference image" scenario — widths must return exactly to
  pre-image behavior)
- Invert toggle (`widthImageInvert`)
- Strength slider, range [0, 1] (`widthImageStrength`)

Follow the existing `onUpdate: (patch: Partial<LayerParams>) => void`
pattern used by `WidthCurveEditor`.
**Files to create/modify:** `src/components/LayerPanel.tsx`, possibly a new
`src/components/WidthImageControls.tsx`
**Test requirement:** No new automated UI test framework is assumed to
exist for this project — verify manually in the running app (upload an
image, confirm rendered widths change; toggle invert and strength; clear
the image and confirm widths revert). If the project has any existing
component tests for `LayerPanel`/`WidthCurveEditor`, extend those instead
of skipping verification.
**Done when:** Manual verification in the browser confirms all four
Success Criteria from DISCUSS.md that involve the UI (upload, strength
blend, invert, clear-restores-behavior).

## Wave 4 — Integration Check

### Task 4.1: Preview/export parity
**What:** Confirm (spec NFR: "Consistency between preview and export")
that `src/render.ts` and `src/svgExport.ts` both call the same
`computeLineWidths` with the same inputs for a given layer + canvas size,
so no divergence is possible by construction. If either file has any
width-related logic that isn't routed through `computeLineWidths`, flag
and fix it.
**Files to create/modify:** `src/render.ts`, `src/svgExport.ts` (only if a
divergence is found)
**Test requirement:** If `svgExport.test.ts` has a pattern for
snapshotting/asserting widths, add a case with `widthImageEnabled: true`
and assert it matches what `computeLineWidths` returns directly for the
same inputs.
**Done when:** Test passes; no separate width-computation code path exists
outside `computeLineWidths` for the image-modulation feature.

## Done Criteria
The feature is DONE when:
- [ ] All tasks complete
- [ ] All tests passing (zero skipped, zero pending)
- [ ] Every scenario in spec.md has a corresponding passing test (or, for
      the UI scenarios in Wave 3, documented manual verification)
- [ ] Code review passed with no Critical findings
- [ ] No regressions in unrelated tests (full existing suite, especially
      `lineWidths.test.ts` and `svgExport.test.ts`, still passes)
