---
title: Wiki Home
tags: [index, home]
updated: 2026-09-03
---

# Project Wiki

Living knowledge base for this project (a p5.js/Vite moiré line-art pattern generator). Distilled from completed SuperSpecs features — architecture decisions, patterns, trade-offs, and gotchas that should outlive any single session.

See `_meta/taxonomy.md` for the canonical domain/tag set.

## Domains

| Domain | Pages | Last updated |
|--------|-------|-------------|
| [[decisions/Home\|decisions]] | 2 | 2026-09-03 |
| [[patterns/Home\|patterns]] | 1 | 2026-09-03 |
| [[ui/Home\|ui]] | 1 | 2026-09-03 |
| [[image-reference-line-width/Home\|image-reference-line-width]] | 1 | 2026-09-03 |

## Recent Updates

_(last 10 — full history in [[log]])_

- 2026-09-03: [[decisions/image-width-modulation-approach]] — design approach for image-referenced line width (modulator not a mode, per-vertex sampling, cover-fit mapping, floor not gaps)
- 2026-09-03: [[decisions/branch-topology]] — `main` is a stale scaffold; real app code only lives on `feature/moire-flowfield-generator`
- 2026-09-03: [[patterns/precomputed-brightness-lookup]] — decode-once/sample-many pattern for expensive per-vertex data sources
- 2026-09-03: [[ui/layer-panel-subcomponents]] — layer panel sub-component convention + a flex-wrap layout gotcha
- 2026-09-03: [[image-reference-line-width/Home]] — feature index for the image-referenced line width feature
