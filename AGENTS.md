# Agent Instructions

## UI/UX and frontend work

This project's control panel is React 19 + Vite + Tailwind CSS v4 + shadcn/ui
(Base UI-backed, "base-nova" style) rendering a p5.js canvas + SVG export.

For any task that touches how the UI looks, is laid out, or behaves
(components, color/typography/spacing decisions, accessibility, new controls,
reviewing existing UI for consistency), explicitly invoke these installed
skills before making changes:

- **`ui-ux-pro-max`** — design-intelligence database (styles, color palettes,
  typography, UX guidelines, chart types) covering this project's stack
  (React, Tailwind, shadcn/ui). Use for layout/visual-design decisions and
  UI reviews.
- **`ui-styling`** — shadcn/ui + Tailwind CSS + canvas-based visual design
  patterns specifically. Use when building or editing components (sliders,
  editors, panels) or canvas/SVG-facing visual output.

Skip both for pure logic changes (line generation, width/gradient math,
state management, tests) that don't change what's rendered or how it's
styled.

Do not invoke the other skills bundled in the same plugin (`design`,
`banner-design`, `brand`, `slides`, `design-system`) for this project — they
target logos, brand identity, banners, and slide decks, none of which apply
here.
