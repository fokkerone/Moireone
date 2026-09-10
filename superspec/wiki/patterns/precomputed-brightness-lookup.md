---
title: Precomputed Sample-Table Pattern (decode once, sample many)
summary: When per-vertex/per-frame code needs to read from an expensive external resource (an uploaded image), decode it once into a plain typed array up front, then do only O(1) array lookups on the hot path.
tags: [patterns, width-modulation, image-reference-line-width]
spec: "[[image-reference-line-width/Home|image-reference-line-width]]"
created: 2026-09-03
updated: 2026-09-03
provenance:
  sources: [specs/image-reference-line-width/spec.md, implementation: src/widthImageLoader.ts, src/lineWidths.ts]
  extracted: 50%
  inferred: 50%
provenance_note: "Pattern name and generalization are the agent's synthesis; the concrete instance (image -> luminance array) is extracted from the spec/implementation."
---

# Precomputed Sample-Table Pattern

## Summary
Rendering and SVG export both call `computeLineWidths` for potentially thousands of vertices per frame/export. Any per-vertex work must be O(1) and allocation-free. When a feature needs data derived from an expensive source (a decoded image, in this case), do the expensive part exactly once — when the resource is assigned — and store only the derived, cheap-to-read result.

## Context
Built for [[image-reference-line-width/Home|image-reference-line-width]]: line width can be modulated by an uploaded image's brightness, sampled at every vertex. Decoding/scaling an image is expensive (canvas draw + `getImageData`); doing that per vertex would be disastrous for performance.

## Patterns

### Decode once, sample many
1. **Expensive, one-time step** (`src/widthImageLoader.ts`, `loadReferenceImage`): decode the file, downscale to a bounded size (see [[decisions/image-width-modulation-approach]] — 1024px cap), convert to a flat `Float32Array` of normalized [0,1] luminance values. Runs once, when the user assigns/changes the image — never on the render/export hot path.
2. **Cheap, repeated step** (`src/lineWidths.ts`, `sampleImageLuminance`): given the precomputed `{ width, height, luminance }` and a canvas position, do a pure O(1) index lookup (with cover-fit coordinate mapping and edge clamping) — no decoding, no DOM access, no allocation.

```ts
// One-time (expensive):
const widthImageData = await loadReferenceImage(file); // -> { width, height, luminance: Float32Array }

// Hot path (cheap, called per vertex):
function sampleImageLuminance(imageData, x, y, canvasWidth, canvasHeight): number {
  // cover-fit math -> clamp to [0,width-1]/[0,height-1] -> luminance[row*width+col]
}
```

### Why a flat typed array, not an `HTMLImageElement`/canvas reference
Keeping the derived data as a plain `{ width, height, luminance: Float32Array }` object (rather than holding onto the decoded image/canvas) makes the hot-path function pure and trivially unit-testable — no DOM, no jsdom limitations, no mocking. See [[image-reference-line-width/Home|image-reference-line-width]] GRILL.md Q6 for how this shaped the testing strategy too: the pure math is fully unit tested, while the one-time DOM-dependent decode step is (deliberately) only manually verified.

## Gotchas

- **Bound the precomputed size**, or the "cheap" step's memory footprint balloons — a naive full-resolution phone photo would produce tens of megabytes just for the lookup table. Downscale before generating it, not after.
- **Clamp indices at the edges of the cheap lookup**, not just the expensive step — floating-point rounding at canvas boundaries can otherwise index one element past the array end. See `src/lineWidths.ts`'s `sampleImageLuminance`.

## Related
- [[decisions/image-width-modulation-approach]] — the specific feature this pattern was built for
- `src/widthImageLoader.ts`, `src/lineWidths.ts` — implementation
