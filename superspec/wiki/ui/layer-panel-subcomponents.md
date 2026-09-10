---
title: Layer Panel Sub-Component Convention
summary: How per-layer setting groups are split out of LayerPanel.tsx into small components sharing the { layer, onUpdate } prop contract, and where their manual-testing boundary sits.
tags: [ui, layer-panel, image-reference-line-width, testing]
spec: "[[image-reference-line-width/Home|image-reference-line-width]]"
created: 2026-09-03
updated: 2026-09-03
provenance:
  sources: [implementation: src/components/LayerPanel.tsx, src/components/WidthCurveEditor.tsx, src/components/WidthImageControls.tsx, specs/image-reference-line-width/GRILL.md]
  extracted: 60%
  inferred: 40%
---

# Layer Panel Sub-Component Convention

## Summary
`src/components/LayerPanel.tsx` is a large per-layer settings panel. Related groups of controls are split into their own components (`WidthCurveEditor`, `WidthImageControls`) rather than inlined, each taking the same `{ layer: LayerParams; onUpdate: (patch: Partial<LayerParams>) => void }` prop shape.

## Context
`WidthImageControls` (new in [[image-reference-line-width/Home|image-reference-line-width]]) followed the pre-existing `WidthCurveEditor` pattern exactly, so this convention is at least two components strong now — worth treating as the established way to extend `LayerPanel.tsx`. ^[inferred]

## Patterns

### The `{ layer, onUpdate }` prop contract
```tsx
interface XyzControlsProps {
  layer: LayerParams;
  onUpdate: (patch: Partial<LayerParams>) => void;
}
export function XyzControls({ layer, onUpdate }: XyzControlsProps) {
  // reads layer.someField, calls onUpdate({ someField: newValue }) on change
}
```
Parent `LayerPanel.tsx` renders these inline, passing its own `layer`/`onUpdate` straight through — no local state duplication, no separate reducer per sub-component.

### Active/inactive toggle-button styling
Boolean-ish settings use `<Button variant={condition ? 'default' : 'outline'}>` — this is the established way to show an active/inactive state for a mode toggle in this file (used for `widthCurveEnabled`, `widthMode`, and now `widthImageInvert`).

### Conditional rendering over disabling
Controls that only make sense given another setting (e.g. strength/invert only make sense once an image is actually assigned) are conditionally rendered (`{condition && <Control />}`), not rendered-but-disabled. Matches the existing pattern for e.g. `widthAngle`'s slider only appearing when `widthMode === 'byAngle'`.

### German-language UI
All user-facing labels in `LayerPanel.tsx` and its sub-components are German ("Linienbreite", "Dicke-Radius", "Referenzbild", "Bild entfernen", "Invertieren", "Bild-Stärke"). New controls should match this — the app has no i18n layer, it's just German throughout.

## Gotchas

- **Unwrapped flex rows can overflow the fixed-width sidebar.** The first version of `WidthImageControls`' file-input row (label + native `<input type="file">` + a conditionally-shown button) didn't wrap, and the native file input's intrinsic width pushed the "Bild entfernen" button off the visible edge of the panel — reachable only by horizontally scrolling the whole sidebar. Caught only by actually testing in a browser (Chrome automation), not by typecheck or the dev-server smoke start. Fixed with `flex-wrap` on the row plus a `w-40` cap on the file input. **Takeaway: any new row combining a native `<input type="file">` with other inline elements needs `flex-wrap` from the start, or an explicit width budget check.**
- **No component-test infrastructure exists** (`vitest` + `jsdom`, no `@testing-library`, zero `.tsx` test files as of this writing). UI-wiring tasks in this codebase are verified manually in a real browser, not via automated component tests — this was an explicit, documented decision (see [[image-reference-line-width/Home|image-reference-line-width]] GRILL.md Q6), not an oversight. Don't try to bolt on a testing-library dependency for a single feature without discussing it first.

## Related
- [[decisions/image-width-modulation-approach]] — the feature `WidthImageControls` was built for
- `src/components/LayerPanel.tsx`, `src/components/WidthCurveEditor.tsx`, `src/components/WidthImageControls.tsx`, `src/components/ParamSlider.tsx`
