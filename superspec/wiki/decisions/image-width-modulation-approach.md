---
title: Image-Referenced Line Width — Design Approach
summary: How line width can be driven by a reference image's brightness — a per-vertex multiplier on top of the existing width-curve system, not a replacement mode.
tags: [decisions, width-modulation, image-reference-line-width]
spec: "[[image-reference-line-width/Home|image-reference-line-width]]"
created: 2026-09-03
updated: 2026-09-03
provenance:
  sources: [specs/image-reference-line-width/DISCUSS.md, specs/image-reference-line-width/spec.md, specs/image-reference-line-width/GRILL.md]
  extracted: 80%
  inferred: 15%
  ambiguous: 5%
---

# Image-Referenced Line Width — Design Approach

## Summary
Layers can optionally use a user-uploaded reference image's brightness to scale their line width at every vertex, so the rendered pattern approximates the image's tonal structure (dark = thicker by default, invertible). This is a **multiplier layered on top of** the existing start/center/end width curve — not a new width mode.

## Context
Requested directly by the user, who supplied two reference images: halftone-style portraits built from vertical line grids, where line thickness follows image brightness along each line's length. Those references shaped several concrete decisions below — see [[image-reference-line-width/Home|image-reference-line-width]] for the full spec.

## Key Decisions

### Decision: Modulator, not a replacement mode
**Chose:** Compute the base width exactly as before (via `widthCurveShape`/`widthStart`/`widthCenter`/`widthEnd` and `widthMode`), then multiply by a brightness-derived factor.
**Over:** A new `widthMode: 'byImage'` that would fully replace the curve with a min/max-from-brightness mapping.
**Because:** Composes for free with all three existing `widthMode` values (`alongLine`/`byPosition`/`byAngle`) instead of requiring a parallel code path. See `applyImageScaling` in `src/lineWidths.ts`.
**Trade-off:** The blend math is one step removed from "pure" brightness-to-width mapping — see the strength formula below, which some readers found non-obvious during grilling (see Gotchas).

### Decision: Per-vertex sampling, always
**Chose:** Sample the image at every line vertex's own canvas position, for all three `widthMode` values — including `byPosition`/`byAngle`, which previously computed one constant width per line.
**Because:** Closest match to "make the line look like the image"; a per-line (midpoint-only) sample would lose almost all image detail.
**Trade-off:** `byPosition`/`byAngle` lines are no longer perfectly constant-width when an image is active — a single line can now vary along its length, driven purely by the image, even though its curve-derived base width is still constant. This is intentional, documented in the spec, and tested explicitly (`src/lineWidths.test.ts`, "byPosition mode: vertices sharing the mode-computed base width still diverge by per-vertex luminance").

### Decision: Thin-but-continuous, not real gaps
**Chose:** Width approaches a fixed minimum floor (`0.1`) in bright regions but never fully disappears.
**Over:** Splitting a line's geometry into disconnected sub-strokes wherever brightness crosses near-zero (which is what the user's reference images actually show — real gaps in light areas).
**Because:** Real gaps require a much bigger change to the rendering/export geometry pipeline (splitting one line into many sub-paths). Accepted as a scope trade-off for this iteration; flagged as a candidate follow-up if the thin-line result doesn't read close enough to the reference look in practice.

### Decision: Cover-fit image-to-canvas mapping, no placement UI
**Chose:** Image scaled uniformly to fully cover the canvas (like CSS `background-size: cover`), centered, cropped as needed.
**Over:** Contain-fit, stretch-fit, or a manual pan/zoom/offset UI.
**Because:** Simplest correct default; avoids both distortion (stretch) and building placement controls for a first iteration.

### Decision: Bounded image size (1024px cap)
**Chose:** Downscale any uploaded image so neither dimension exceeds 1024px, before luminance conversion.
**Because:** Brightness sampling doesn't need full source resolution; without this, a modern phone photo (e.g. 4000×3000) would produce a ~48MB `Float32Array` and slow decode. Added during grilling — not in the original discussion.

## Patterns

### The blend formula
```ts
const brightnessFactor = layer.widthImageInvert ? luminance : 1 - luminance;
const scale = 1 + (brightnessFactor - 1) * layer.widthImageStrength;
const finalWidth = Math.max(MIN_WIDTH, baseWidth * scale);
```
`strength` blends between "no effect" (`scale = 1`) and "fully brightness-driven" (`scale = brightnessFactor`) — it is a lerp toward **zero**, not toward the floor. The floor (`0.1`) is a clamp applied *after* blending, not one of the blend's two endpoints. ^[inferred]

## Gotchas

- **The floor is not a blend endpoint.** During grilling, the spec's own scenario text initially claimed `strength = 0.5` on a fully-white pixel gives a result "exactly halfway between base width and the floor" — that's wrong; it's halfway between base width and *zero*, only coinciding with the floor at `strength = 1`. Caught and fixed in `spec.md` and `tasks.md` before execution (see [[image-reference-line-width/Home|image-reference-line-width]] GRILL.md, Q1). Worth remembering if this formula is ever touched again.
- **`widthImageEnabled` is a separate flag from `widthImageData` presence**, deliberately — it lets a user toggle the effect off without re-uploading. Don't collapse these into one nullable field.

## Interface / Contract

`LayerParams` (in `src/types.ts`) gained:
```ts
widthImageEnabled: boolean;
widthImageInvert: boolean;
widthImageStrength: number; // 0..1
widthImageData: { width: number; height: number; luminance: Float32Array } | null;
```
`widthImageData` is the *only* form of the reference image that reaches width computation — never an `HTMLImageElement`/`File`. It's produced once (in `src/widthImageLoader.ts`) and reused as an O(1) lookup table (see [[patterns/precomputed-brightness-lookup]]).

## Open Questions
- [ ] Real gaps (matching the reference images exactly) were deferred — revisit if the continuous-thin-line result doesn't satisfy the original visual goal in practice.
- [ ] No visible UI feedback on a rejected (non-image) file upload — silent rejection was accepted for this iteration (GRILL.md Q4, declined by the user).

## Related
- [[patterns/precomputed-brightness-lookup]] — the decode-once/sample-many pattern used for the image data
- [[ui/layer-panel-subcomponents]] — how the new controls were wired into the layer panel
- [[decisions/branch-topology]] — an unrelated but important gotcha hit during this feature's execution
- `src/lineWidths.ts` — `applyImageScaling`, `sampleImageLuminance`, `computeLineWidths`
- `src/widthImageLoader.ts` — image → `widthImageData` pipeline
