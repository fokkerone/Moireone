---
title: Image-Referenced Line Width (feature)
summary: Feature index — line width can now be modulated per-vertex by an uploaded reference image's brightness, layered on top of the existing width-curve system.
tags: [image-reference-line-width, width-modulation]
created: 2026-09-03
updated: 2026-09-03
---

# Image-Referenced Line Width

Shipped 2026-09-03. Each layer can optionally have a reference image whose brightness scales line width at every vertex — dark regions read as thicker lines by default (invertible), blended in via a per-layer strength control.

## Knowledge pages
- [[decisions/image-width-modulation-approach]] — design decisions: modulator not a mode, per-vertex sampling, cover-fit mapping, floor not gaps, 1024px size cap
- [[patterns/precomputed-brightness-lookup]] — the decode-once/sample-many pattern used to keep per-vertex sampling O(1)
- [[ui/layer-panel-subcomponents]] — how the layer panel controls were built, and a layout bug caught by manual browser testing
- [[decisions/branch-topology]] — an important repo-structural gotcha hit during this feature's execution (unrelated to the feature itself, but discovered here)

## Source material
- `superspec/specs/image-reference-line-width/DISCUSS.md`
- `superspec/specs/image-reference-line-width/spec.md`
- `superspec/specs/image-reference-line-width/GRILL.md`
- `superspec/phases/image-reference-line-width-execute/` — wave-by-wave execution log

## Key files
- `src/types.ts` — `LayerParams.widthImage*` fields
- `src/lineWidths.ts` — `sampleImageLuminance`, `applyImageScaling`, `computeLineWidths`
- `src/widthImageLoader.ts` — image upload → luminance pipeline
- `src/components/WidthImageControls.tsx` — layer panel UI
