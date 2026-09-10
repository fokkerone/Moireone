# Image-Referenced Line Width Specification

**Slug:** image-reference-line-width
**Status:** draft
**Depends on:** none

## Purpose

Layers in this app can already vary line width along a parametric
start/center/end curve. This feature lets a layer additionally use the
brightness of a user-supplied reference image to scale that width at every
point along every line, so the rendered pattern visually approximates the
tonal structure of the reference image (dark areas read as thicker lines,
light areas as thinner ones, invertible). The modulation is additive to the
existing width system: it does not replace the curve, the width modes, or
the line-generation shapes a layer already produces — it only scales the
width that the existing pipeline would otherwise produce.

## Requirements

### Requirement: Per-layer reference image
Each layer SHALL support an optional reference image, independent of every
other layer's reference image.

#### Scenario: Setting an image on one layer does not affect others
- GIVEN a pattern with two layers, neither having a reference image
- WHEN the user assigns a reference image to layer 1 only
- THEN layer 1's rendered line widths reflect the image
- AND layer 2's rendered line widths are unchanged

#### Scenario: Clearing a layer's reference image
- GIVEN a layer with a reference image assigned and image modulation enabled
- WHEN the user clears/removes the reference image from that layer
- THEN the layer's rendered line widths return exactly to what they would
  be with no image ever assigned (pure curve/mode-driven widths)

### Requirement: Image modulation only applies when width curves are enabled
Image-based width modulation SHALL only have an effect on a layer when that
layer's existing width-curve system (`widthCurveEnabled`) is on. A layer
rendering constant-weight strokes (width curve disabled) SHALL be unaffected
by having a reference image assigned.

#### Scenario: Width curve disabled, image assigned
- GIVEN a layer with `widthCurveEnabled` set to false and a reference image
  assigned with strength > 0
- WHEN the layer is rendered
- THEN line widths are the layer's constant stroke weight, unaffected by
  the image

### Requirement: Brightness-driven width scaling
The system SHALL compute, for each vertex of each line in a layer with an
enabled reference image, a brightness value sampled from the reference
image at that vertex's canvas position, and SHALL use that brightness to
scale the width the curve/mode system would otherwise produce at that
vertex.

#### Scenario: Dark image region produces thicker line (default, not inverted)
- GIVEN a layer with a reference image assigned, strength = 1, invert = false
- AND a vertex whose canvas position maps to a fully black region of the
  image
- WHEN widths are computed
- THEN the width at that vertex equals the curve/mode-computed base width
  at full scale (unreduced)

#### Scenario: Light image region produces thinner line (default, not inverted)
- GIVEN a layer with a reference image assigned, strength = 1, invert = false
- AND a vertex whose canvas position maps to a fully white region of the
  image
- WHEN widths are computed
- THEN the width at that vertex is scaled down to the configured minimum
  width floor (see Non-Functional Requirements), never negative or zero

#### Scenario: Invert toggle reverses the tonal direction
- GIVEN the same setup as the two scenarios above, but with invert = true
- WHEN widths are computed
- THEN the vertex over the black region gets the scaled-down (thin) result
  and the vertex over the white region gets the full-scale (thick) result

#### Scenario: Modulation applies per vertex, not per line
- GIVEN a layer with `widthMode: 'alongLine'`, a reference image assigned,
  and strength = 1
- AND a single line whose vertices cross from a dark image region to a
  light image region
- WHEN widths are computed
- THEN different vertices along that same line receive different widths,
  tracking the image brightness at each vertex's own position

#### Scenario: Modulation composes with byPosition/byAngle modes
- GIVEN a layer with `widthMode: 'byPosition'` (or `'byAngle'`), a
  reference image assigned, and strength = 1
- WHEN widths are computed for a line
- THEN each vertex still receives the same base width as it would under
  the mode's existing constant-per-line behavior, but individually scaled
  by that vertex's own image-brightness sample (so a single line may now
  show varying width along its length, driven by the image, even though
  the underlying curve value is constant across the line)

### Requirement: Strength control
The system SHALL provide a per-layer strength value in the range [0, 1]
that controls how strongly image brightness scales the base width.

#### Scenario: Strength = 0 disables the visual effect
- GIVEN a layer with a reference image assigned and strength = 0
- WHEN widths are computed
- THEN every vertex's width equals the curve/mode-computed base width,
  regardless of image content (image has no visible effect)

#### Scenario: Strength between 0 and 1 blends the effect
- GIVEN a layer with a reference image assigned and strength = 0.5
- AND a vertex over a fully white image region (brightness factor 0 under
  non-inverted mapping)
- WHEN widths are computed
- THEN the resulting width is exactly halfway between the full base width
  and zero (i.e. `baseWidth * 0.5`), then clamped to the minimum width
  floor if that halfway value falls below it — the floor is a clamp
  applied after blending, not one of the blend's two endpoints; only at
  strength = 1 does a fully-white, non-inverted vertex land exactly on the
  floor

### Requirement: Image-to-canvas mapping
The system SHALL map the reference image onto canvas coordinates using
"cover" fit: the image is scaled uniformly (preserving aspect ratio) to
fully cover the canvas' width and height, centered, with any overflow
outside the canvas bounds cropped.

#### Scenario: Wide image on a tall canvas
- GIVEN a canvas taller than it is wide, and a reference image wider than
  it is tall
- WHEN the image is mapped for sampling
- THEN the image is scaled up until its height matches the canvas height,
  it is horizontally centered, and its left/right edges extend beyond the
  canvas bounds

#### Scenario: Sampling never falls outside the source image
- GIVEN any canvas and any reference image mapped via cover fit
- WHEN a vertex at any position within the canvas bounds is sampled
- THEN the corresponding image sample position is always within the
  source image's pixel bounds (cover fit guarantees full coverage)

## Error Behavior

- The system SHALL NOT crash or produce `NaN`/negative widths when a
  reference image is assigned but has not yet finished loading/decoding;
  widths SHALL fall back to the curve/mode-computed base width (as if
  strength were 0) until the image is ready.
- The system SHALL reject non-image files at the point of assignment
  (upload) and SHALL leave any previously assigned reference image
  unchanged if a rejected file is offered as a replacement.
- The system SHALL NOT allow strength or invert settings to affect a layer
  that has no reference image assigned (no-op, not an error).

## Non-Functional Requirements

- **Minimum width floor:** scaled widths SHALL be clamped to a minimum of
  0.1 (same units as existing width values) so that lines remain
  continuous (never disappear or produce degenerate/zero-width geometry)
  even in fully-white, non-inverted regions at strength 1.
- **Consistency between preview and export:** for a given layer
  configuration (including reference image, strength, invert) and a given
  canvas size, the width computed for SVG export SHALL be identical to the
  width used for the live on-screen render, for every vertex.
- **Performance:** brightness sampling SHALL be an O(1) lookup per vertex
  at render/export time (no per-vertex image decoding or re-scaling
  work); any expensive image processing SHALL happen once, when the
  reference image is assigned, not on every render/export pass.
- **Sampling stays in bounds:** computed pixel indices SHALL be clamped to
  `[0, width-1]` / `[0, height-1]` of the reference image data, so that
  floating-point rounding at canvas edges can never read outside the
  sampled array.
- **Bounded image size:** a reference image SHALL be downscaled, before
  luminance conversion, so neither dimension exceeds 1024px — brightness
  sampling does not need full source resolution, and this bounds memory
  and decode time for large uploads (e.g. camera photos).

## Out of Scope

- Persisting the reference image across page reloads/sessions (no project
  save/load exists in the app today).
- Alpha-channel/silhouette masking or single-color-channel sampling modes
  — brightness/grayscale luminance is the only sampling source.
- Manual image placement controls (pan, zoom, rotate, custom offset) —
  mapping is fixed "cover" fit only.
- Per-line (midpoint-only) sampling variant for the image — sampling is
  always per-vertex.
- A new straight-parallel-line-grid layer type — this feature only changes
  the width *source* for whatever lines a layer already generates.
- Real gaps/breaks in line geometry where brightness is at its lightest —
  widths approach a minimum floor but the line stays a single continuous
  stroke.
- Gamma/contrast/blur pre-processing of the reference image before
  brightness sampling.
- A global (project-wide, shared-across-layers) reference image — each
  layer's reference image is independent.

## Glossary

- **Reference image:** an image the user assigns to a single layer, used
  only as a data source for width scaling — never drawn/composited onto
  the canvas itself.
- **Brightness / luminance:** a normalized 0 (black) to 1 (white) value
  derived from a reference image's pixel color at a sampled position.
- **Brightness factor:** the value, derived from luminance and the
  invert setting, that scales the base width (1 = no reduction, 0 = full
  reduction to the minimum floor).
- **Base width:** the width a vertex would have from the existing
  curve/widthMode system alone, with no reference image involved.
- **Strength:** a per-layer [0, 1] value controlling how much the
  brightness factor is allowed to pull the final width away from the base
  width.
