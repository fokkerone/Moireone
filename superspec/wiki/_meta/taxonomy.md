---
title: Wiki Taxonomy
tags: [meta, taxonomy]
updated: 2026-09-03
---

# Wiki Taxonomy

Canonical domain set for `superspec/wiki/`. Route new knowledge units here before creating a new domain — see the decision tree in the `verify` skill.

## Domains

| Domain | Purpose |
|--------|---------|
| `decisions/` | Architecture/project decisions — what was chosen over what, and why. Includes repo-structural gotchas future specs need to know before acting (e.g. branch topology). |
| `patterns/` | Reusable cross-cutting code patterns (not tied to one feature). |
| `ui/` | Frontend component, layer-panel, and styling conventions for this app. |
| `data/` | Data model / state shape decisions (`LayerParams`, `PatternState`, etc.). |
| `auth/` | (unused so far) |
| `api/` | (unused so far) |
| `infra/` | (unused so far) |

## Canonical Tags

- `moire-line-art` — the app's domain (p5.js/Vite line-art/moiré pattern generator)
- `width-modulation` — anything about how line/stroke width is computed
- `layer-panel` — the per-layer settings UI (`src/components/LayerPanel.tsx` and its sub-components)
- `image-reference-line-width` — this feature's spec slug
- `branching` — git branch/worktree topology notes for this repo
- `testing` — test-infrastructure notes (jsdom limits, TDD exceptions, etc.)

## Project Domains

None yet beyond the general set above — no feature so far has needed a slug-named domain of its own.
