# Discussion: Image-Referenced Line Width

Date: 2026-09-02
Participants: human + AI

## What We're Building

Layers currently get their line width from a parametric start/center/end curve
(`widthProfile.ts`), sampled either along each line's own length (`alongLine`)
or from a single reference point per line (`byPosition`/`byAngle`). We're
adding an optional **image-reference modulation**: the user uploads a
reference image per layer, and the line width at each vertex is scaled by the
brightness of the image at that vertex's (x, y) canvas position — so the
resulting line drawing visually approximates the reference image's tonal
values (dark areas → thicker lines, light areas → thinner lines, by default).

This is a modulation layered on top of the existing width system, not a
replacement mode — it works together with whatever `widthMode` and
start/center/end curve the layer already has.

**Reference images provided by the user** (fetched and reviewed during
discussion): two halftone-style portraits built from vertical line grids,
where each line's thickness follows the underlying image's brightness along
its length — thick/solid over dark tonal areas, tapering to very thin (in
one image, fully gapped) over light areas. These clarified two things: (1)
per-vertex, along-the-line brightness sampling is exactly the right mental
model (matches our earlier decision), and (2) the app will **reuse its
existing line layers** (whatever shape they already generate — straight,
wavy, radial, etc.) rather than adding a new straight-line-grid generator;
only the width source changes. See decisions below on the gap question.

## Goals
- Let a layer's line width follow the luminance of a user-supplied image,
  independent of which `widthMode` (`alongLine`/`byPosition`/`byAngle`) is
  active.
- Sample brightness per vertex (finest-grained, most faithful to the source
  image), not just once per line.
- Give the user control over how strongly the image affects width (strength
  slider) and which tonal direction means "thicker" (invert toggle).
- Keep the feature per-layer, consistent with how all other width settings
  already work per layer.

## Non-Goals (explicitly out of scope)
- No project save/load or serialization of the uploaded image — the app has
  no persistence layer today; the image lives only in in-memory layer state
  for the current session.
- No alpha-channel/silhouette masking mode and no single-color-channel
  sampling mode — brightness/grayscale is the only sampling source for now.
- No manual image placement UI (pan/zoom/rotate/offset) — image-to-canvas
  mapping is a fixed "cover" fit, not user-adjustable.
- No per-line (midpoint-only) sampling variant for the image — always
  per-vertex.
- Not replacing or removing the existing start/center/end curve UI or the
  `byPosition`/`byAngle` modes — this is additive.

## Constraints
- **Technical:** No existing image-upload/File API usage anywhere in the
  codebase (`src/`) — this introduces new infrastructure: file input,
  image decoding, and per-pixel brightness sampling against canvas
  coordinates. Needs to work at SVG-export time too (`svgExport.ts`), where
  widths get baked into static path data — sampling must be synchronous/
  precomputed (e.g. decode to an offscreen canvas + `getImageData` once,
  then do cheap array lookups per vertex).
- **Scope:** Per-layer image (each layer optionally has its own reference
  image), matching the existing per-layer width settings.
- **Other:** Image-to-canvas mapping uses "cover" semantics (like CSS
  `background-size: cover`): image is scaled proportionally to fully cover
  the canvas, with overflow cropped — no distortion, no user-facing
  positioning controls in this iteration.

## Key Decisions Made

### Decision: What image property drives width
**We will:** Use brightness/grayscale luminance of the reference image.
**Because:** It's the classic, predictable halftone-style mapping and needs
no extra channel/mask conventions from the user.
**We won't:** Use the alpha channel as a silhouette mask, or let the user
pick an arbitrary color channel — deferred as future extensions if needed.

### Decision: Sampling granularity
**We will:** Sample the image per vertex, at each vertex's actual (x, y)
position on the canvas — same granularity as `alongLine` width variation.
**Because:** This is the closest match to "make the line look like the
image" — coarser per-line sampling would lose most of the image's detail.
**We won't:** Add a per-line (midpoint-only) sampling variant for images in
this iteration.

### Decision: Relationship to the existing width curve
**We will:** Treat the image as a **modulator**: compute the normal
start/center/end curve width as today, then scale it by a brightness-derived
factor (0..1, controlled by strength) sampled at that vertex.
**Because:** This composes with all three existing `widthMode` values for
free, and preserves the existing curve UI/semantics instead of introducing a
parallel "replace everything" code path.
**We won't:** Add a `widthMode: 'byImage'` that fully replaces the
start/center/end curve with a min/max-width-from-brightness mapping.

### Decision: Light-area behavior (no gaps)
**We will:** Let width approach a small minimum value (e.g. clamped to a
configurable minimum, not literally 0) in bright image areas — the line gets
very thin but never fully breaks into separate segments.
**Because:** The reference images show full gaps in light areas, but
producing real gaps requires splitting a single line's geometry into
multiple disconnected sub-strokes wherever width crosses near-zero — a much
bigger change to the rendering/export geometry pipeline than a continuous
per-vertex width scale. The user confirmed thin-but-continuous is
acceptable for this iteration.
**We won't:** Implement line-splitting/gap geometry in this iteration —
flagged as a possible future enhancement if the thin-line result doesn't
read close enough to the reference look in practice.

### Decision: Which lines get modulated
**We will:** Apply the image-brightness modulation to whatever lines a
layer already generates today (straight, wavy, radial, etc.) — no new line
generator.
**Because:** The user confirmed the goal is only to change the *width
source*, not to add a new straight-parallel-line-grid layer type like the
reference images happen to use.
**We won't:** Build a dedicated straight-line-grid layer type as part of
this feature.

### Decision: Image-to-canvas mapping
**We will:** Use "cover" fit — image scaled proportionally to fill the
canvas, cropped as needed, mapped 1:1 to canvas coordinates.
**Because:** Simplest correct default; avoids stretch-induced distortion and
avoids building a positioning UI for a first iteration.
**We won't:** Build contain/offset/scale/rotate controls now.

### Decision: User controls
**We will:** Add an **invert** toggle (dark=thick vs. light=thick) and a
**strength** slider (0 = pure curve, no image influence; 1 = full image
influence) per layer, alongside the image upload control.
**Because:** These are the minimum controls needed to make the effect usable
across different source images without redoing the image each time.
**We won't:** Expose gamma/contrast/blur pre-processing controls in this
iteration.

### Decision: Persistence
**We will:** Keep the uploaded image and its derived brightness data in
in-memory layer state only, for the current session.
**Because:** The app currently has no save/load or serialization mechanism
at all (confirmed: no `localStorage`/`IndexedDB`/JSON project
serialization anywhere in `src/`), so there is nothing to integrate with.
**We won't:** Design a serialization format for the image in this pass —
that's a separate concern for whenever project persistence is added.

## Open Questions
- [ ] What should width modulation do for canvas areas the image doesn't
      cover after "cover" cropping — can this actually happen? (With `cover`
      fit, by definition the image always fully covers the canvas, so
      probably a non-issue — confirm during spec/implementation.)
- [ ] Exact formula for combining strength + brightness factor with the base
      curve width (e.g. `finalWidth = baseWidth * lerp(1, brightnessFactor, strength)`)
      — to be pinned down precisely in the spec.
- [ ] UI placement: where in `LayerPanel.tsx` does the image upload +
      invert + strength control live relative to the existing
      `WidthCurveEditor`?
- [ ] Accepted image formats / max resolution / any downscaling before
      sampling for performance?
- [ ] What's the minimum clamped width value in fully-bright areas (e.g. a
      fixed px floor, or a percentage of the layer's configured min width)?

## Success Criteria
- [ ] A layer can have an optional reference image uploaded via the UI.
- [ ] With an image set and strength > 0, rendered line widths visibly vary
      according to the image's brightness at each vertex's position, for
      all three `widthMode` values.
- [ ] Strength slider smoothly blends between "no image influence" (0) and
      "full image influence" (1).
- [ ] Invert toggle flips which tonal direction produces thicker lines.
- [ ] SVG export (`svgExport.ts`) produces the same widths as the live
      render — no divergence between preview and export.
- [ ] Removing/clearing the reference image restores the previous
      curve-only behavior exactly.

## Risks
- **Performance:** Per-vertex image sampling for many lines/vertices could
  be slow if done naively (e.g. re-decoding the image per lookup).
  Mitigation: decode once to an offscreen canvas/`ImageData` and reuse a
  fast typed-array lookup for every sample.
- **Cover-fit mismatch surprises:** Users may expect the image to map 1:1
  without cropping (like `stretch`) and be confused when parts of a
  non-matching-aspect-ratio image are cropped. Mitigation: this is explicitly
  a known trade-off accepted for this iteration (see Non-Goals); revisit if
  it proves confusing in practice.
- **No persistence:** Uploaded reference images are lost on page
  reload/refresh, same as all other current project state. Accepted as
  consistent with existing app behavior, not a regression.

## Wiki References
None — no `superspec/wiki/` exists yet for this project; this is the first
SuperSpecs feature discussion for this repo. Findings from direct codebase
inspection are captured in the Constraints/Decisions above instead.

Two external reference images (halftone vertical-line portraits) were
fetched and reviewed live during this discussion to ground the "what should
the line look like" question; they are not stored in the repo, only
described in the Decisions above.
