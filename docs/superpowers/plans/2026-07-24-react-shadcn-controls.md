# React/shadcn/Tailwind Control-Panel Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vanilla-DOM control panel and p5 wiring with a React + Tailwind v4 + shadcn/ui application, and add: a per-layer `zoom` parameter, global (not per-layer) spacing/weight controls with wider ranges, flat line caps, and layer duplicate/delete/drag-reorder instead of a layer-count slider.

**Architecture:** The existing pure logic modules (`flowfield.ts`, `lineGenerator.ts`, `palette.ts`, `svgExport.ts`) stay framework-agnostic and unit-tested; `state.ts` gains new pure layer-management functions (also unit-tested). A new React layer (`main.tsx`, `App.tsx`, `components/*`) replaces `main.ts`/`controls.ts` — React components and the p5-lifecycle wrapper are not unit-tested (documented exception, same as the previous `render.ts`/`controls.ts`/`main.ts`), verified manually in the browser at the end.

**Tech Stack:** React 19, Vite + `@vitejs/plugin-react`, Tailwind CSS v4 (CSS-first config via `@tailwindcss/vite`), shadcn/ui (current version, "new-york" style: Accordion, Slider, Input, Button, Label), `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` for layer drag-reordering, pnpm, Vitest (unchanged for pure modules).

## Global Constraints

- Pure logic modules (`types.ts`, `flowfield.ts`, `lineGenerator.ts`, `palette.ts`, `svgExport.ts`) keep their existing behavior and test coverage; only `LayerParams` gains a `zoom: number` field and `flowfield.ts`/`svgExport.ts` get the small additions described in Tasks 1 and 3.
- New required `LayerParams.zoom` field: range 1–20, default 1. `fieldAngle` must sample the noise function at `layer.noiseScale / layer.zoom`, not `layer.noiseScale` directly.
- Global (not per-layer) spacing control: range 4–50. Global (not per-layer) weight control: range 0.5–50. Both write the same value into every layer in `state.layers`.
- Line caps must be flat/square, not rounded: `p.strokeCap(p.SQUARE)` on canvas, `stroke-linecap="butt"` in exported SVG.
- No global "Anzahl Layer" slider — layer count is managed via per-layer duplicate/remove buttons, still bounded by `MIN_LAYERS = 2` / `MAX_LAYERS = 5` (reuse the existing exported constants from `state.ts`).
- No automated tests for React components or the p5-lifecycle wrapper (documented exception — same policy as the prior `controls.ts`/`main.ts`/`render.ts`). All new pure functions in `state.ts` get unit tests in the same style as the existing tests.
- shadcn/ui and its CLI evolve; the exact CLI flags for non-interactive use are not pinned in this plan (a plan cannot reliably freeze a third-party CLI's interactive/non-interactive flag surface). Task 5 instructs the implementer to check `--help` output and choose the correct non-interactive flags themselves, documenting the exact command used in their report — this is the one place in this plan where the implementer must exercise judgment about exact command syntax rather than transcribe literal instructions.

---

## Task 1: Add `zoom` to LayerParams and wire it into `fieldAngle`

**Files:**
- Modify: `src/types.ts`
- Modify: `src/flowfield.ts`
- Modify: `src/state.ts` (only `createDefaultLayer`)
- Modify: `src/flowfield.test.ts`
- Modify: `src/lineGenerator.test.ts`
- Modify: `src/svgExport.test.ts`

**Interfaces:**
- Produces: `LayerParams.zoom: number` — consumed by `fieldAngle` (this task) and later by `LayerPanel.tsx` (Task 8).
- Produces: `fieldAngle` now divides `noiseScale` by `zoom` before sampling — no signature change.

- [ ] **Step 1: Add the `zoom` field to `LayerParams`**

In `src/types.ts`, add `zoom: number;` to the `LayerParams` interface (any position, e.g. right after `seed`).

- [ ] **Step 2: Write the failing test for zoom-scaled sampling**

In `src/flowfield.test.ts`, add `zoom: 1` to the existing `baseLayer` object literal (required now that `zoom` is non-optional), then add this test inside the existing `describe('fieldAngle', ...)` block:

```ts
  it('divides noiseScale by zoom before sampling the noise function', () => {
    let receivedA: [number, number, number] | null = null;
    const spyA: NoiseFn = (x, y, z) => {
      receivedA = [x, y, z];
      return 0.5;
    };
    fieldAngle({ ...baseLayer, noiseScale: 0.02, zoom: 2 }, 50, 200, spyA);

    let receivedB: [number, number, number] | null = null;
    const spyB: NoiseFn = (x, y, z) => {
      receivedB = [x, y, z];
      return 0.5;
    };
    fieldAngle({ ...baseLayer, noiseScale: 0.01, zoom: 1 }, 50, 200, spyB);

    expect(receivedA).toEqual(receivedB);
  });
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm exec vitest run src/flowfield.test.ts`
Expected: FAIL — `Property 'zoom' is missing` (TypeScript) or the test fails because `fieldAngle` doesn't yet divide by zoom.

- [ ] **Step 4: Implement the zoom division in `fieldAngle`**

In `src/flowfield.ts`, change the body of `fieldAngle` from:

```ts
  const n = noise(x * layer.noiseScale, y * layer.noiseScale, layer.seed);
```

to:

```ts
  const effectiveScale = layer.noiseScale / layer.zoom;
  const n = noise(x * effectiveScale, y * effectiveScale, layer.seed);
```

- [ ] **Step 5: Add the default `zoom` value**

In `src/state.ts`, add `zoom: 1,` to the object returned by `createDefaultLayer`.

- [ ] **Step 6: Fix compilation by adding `zoom: 1` to every remaining `LayerParams` literal**

`LayerParams` is now missing a required field everywhere else it's constructed as a literal. Add `zoom: 1,` to every `LayerParams`-typed object literal in `src/lineGenerator.test.ts` and `src/svgExport.test.ts` (every layer object such as `straightLayer`, `curvingLayer`, `extremeLayer`, `bounceLayer`, and the layer literal in `svgExport.test.ts` — search each file for `LayerParams` to find them all). Do not change any other field or assertion in these files.

- [ ] **Step 7: Run the full suite and typecheck**

Run: `pnpm test`
Expected: PASS — all tests green, including the new zoom test.

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/types.ts src/flowfield.ts src/state.ts src/flowfield.test.ts src/lineGenerator.test.ts src/svgExport.test.ts
git commit -m "Add zoom parameter that scales effective noise sampling frequency"
```

---

## Task 2: Replace `setLayerCount` with duplicate/remove/reorder/global-param functions

**Files:**
- Modify: `src/state.ts`
- Modify: `src/state.test.ts`

**Interfaces:**
- Consumes: `LayerParams`, `PatternState` from `src/types.ts`; `MIN_LAYERS`, `MAX_LAYERS`, `createDefaultLayer`, `createDefaultState` (unchanged, stay exported).
- Produces: `duplicateLayer(state, index): PatternState`, `removeLayer(state, index): PatternState`, `reorderLayers(state, fromIndex, toIndex): PatternState`, `setGlobalSpacing(state, spacing): PatternState`, `setGlobalWeight(state, weight): PatternState` — used by Task 11 (`App.tsx`) and Task 9 (`LayerAccordion.tsx` for reorder), Task 10 (`Sidebar.tsx` for global spacing/weight).
- Removes: `setLayerCount` (no longer exported; the global "Anzahl Layer" slider is gone per the design).

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `src/state.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import {
  createDefaultState,
  duplicateLayer,
  removeLayer,
  reorderLayers,
  setGlobalSpacing,
  setGlobalWeight,
  MIN_LAYERS,
  MAX_LAYERS,
} from './state';

describe('createDefaultState', () => {
  it('starts with exactly 2 layers', () => {
    const state = createDefaultState();
    expect(state.layers.length).toBe(2);
  });
});

describe('duplicateLayer', () => {
  it('inserts a copy of the layer directly after it', () => {
    const state = createDefaultState();
    const updated = duplicateLayer(state, 0);
    expect(updated.layers.length).toBe(3);
    expect(updated.layers[1]).toEqual(state.layers[0]);
    expect(updated.layers[1]).not.toBe(state.layers[0]);
  });

  it('does not exceed MAX_LAYERS', () => {
    let state = createDefaultState();
    while (state.layers.length < MAX_LAYERS) {
      state = duplicateLayer(state, 0);
    }
    const beforeCount = state.layers.length;
    const updated = duplicateLayer(state, 0);
    expect(updated.layers.length).toBe(beforeCount);
    expect(updated).toEqual(state);
  });
});

describe('removeLayer', () => {
  it('removes the layer at the given index', () => {
    let state = createDefaultState();
    state = duplicateLayer(state, 0);
    const updated = removeLayer(state, 1);
    expect(updated.layers.length).toBe(2);
  });

  it('does not go below MIN_LAYERS', () => {
    const state = createDefaultState();
    const updated = removeLayer(state, 0);
    expect(updated.layers.length).toBe(MIN_LAYERS);
    expect(updated).toEqual(state);
  });
});

describe('reorderLayers', () => {
  it('moves a layer from one index to another', () => {
    let state = createDefaultState();
    state = duplicateLayer(state, 0);
    const original = state.layers;
    const updated = reorderLayers(state, 0, 2);
    expect(updated.layers[2]).toEqual(original[0]);
    expect(updated.layers.length).toBe(original.length);
  });
});

describe('setGlobalSpacing', () => {
  it('sets the same spacing on every layer', () => {
    let state = createDefaultState();
    state = duplicateLayer(state, 0);
    const updated = setGlobalSpacing(state, 33);
    for (const layer of updated.layers) {
      expect(layer.spacing).toBe(33);
    }
  });
});

describe('setGlobalWeight', () => {
  it('sets the same weight on every layer', () => {
    let state = createDefaultState();
    state = duplicateLayer(state, 0);
    const updated = setGlobalWeight(state, 12);
    for (const layer of updated.layers) {
      expect(layer.weight).toBe(12);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/state.test.ts`
Expected: FAIL — the new functions don't exist yet.

- [ ] **Step 3: Implement the new functions and remove `setLayerCount`**

In `src/state.ts`, delete the `setLayerCount` function entirely, and add these five functions (after `createDefaultState`):

```ts
export function duplicateLayer(state: PatternState, index: number): PatternState {
  if (state.layers.length >= MAX_LAYERS) {
    return state;
  }
  const layers = [...state.layers];
  const copy: LayerParams = { ...layers[index] };
  layers.splice(index + 1, 0, copy);
  return { ...state, layers };
}

export function removeLayer(state: PatternState, index: number): PatternState {
  if (state.layers.length <= MIN_LAYERS) {
    return state;
  }
  const layers = state.layers.filter((_, i) => i !== index);
  return { ...state, layers };
}

export function reorderLayers(state: PatternState, fromIndex: number, toIndex: number): PatternState {
  const layers = [...state.layers];
  const [moved] = layers.splice(fromIndex, 1);
  layers.splice(toIndex, 0, moved);
  return { ...state, layers };
}

export function setGlobalSpacing(state: PatternState, spacing: number): PatternState {
  return { ...state, layers: state.layers.map((layer) => ({ ...layer, spacing })) };
}

export function setGlobalWeight(state: PatternState, weight: number): PatternState {
  return { ...state, layers: state.layers.map((layer) => ({ ...layer, weight })) };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/state.test.ts`
Expected: PASS — all 7 tests green.

Run: `pnpm exec tsc --noEmit`
Expected: no errors. (If any other file still imports `setLayerCount`, this will surface it — at this point in the plan nothing else should, since `controls.ts` is deleted in Task 11 and not modified before then; if `tsc` reports an error from `controls.ts` referencing `setLayerCount`, that is expected and will be resolved when Task 11 deletes that file — note it in your report but do not fix `controls.ts` in this task.)

- [ ] **Step 5: Commit**

```bash
git add src/state.ts src/state.test.ts
git commit -m "Replace setLayerCount with duplicate/remove/reorder and global spacing/weight setters"
```

---

## Task 3: Flat line caps (canvas + SVG)

**Files:**
- Modify: `src/render.ts`
- Modify: `src/svgExport.ts`
- Modify: `src/svgExport.test.ts`

**Interfaces:** No signature changes to `renderPattern` or `buildSvgString`/`exportSvg`.

- [ ] **Step 1: Add `strokeCap` to canvas rendering**

In `src/render.ts`, add `p.strokeCap(p.SQUARE);` once, right after `p.background(state.background);` and before the `state.layers.forEach(...)` loop (stroke cap is a global drawing style in p5, doesn't need to be set per-layer).

- [ ] **Step 2: Write the failing test for the SVG line-cap attribute**

In `src/svgExport.test.ts`, add this assertion inside the existing `it('renders one polyline per line with the layer color, opacity, and stroke width', ...)` test, right after the existing `expect(svg).toContain('stroke-width="2"');` line:

```ts
    expect(svg).toContain('stroke-linecap="butt"');
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm exec vitest run src/svgExport.test.ts`
Expected: FAIL — the generated SVG doesn't contain `stroke-linecap="butt"` yet.

- [ ] **Step 4: Add the SVG attribute**

In `src/svgExport.ts`, change the `polylines.push(...)` call inside `buildSvgString` from:

```ts
      polylines.push(
        `<polyline points="${points}" fill="none" stroke="${layer.color}" stroke-opacity="${layer.alpha}" stroke-width="${layer.weight}" />`
      );
```

to:

```ts
      polylines.push(
        `<polyline points="${points}" fill="none" stroke="${layer.color}" stroke-opacity="${layer.alpha}" stroke-width="${layer.weight}" stroke-linecap="butt" />`
      );
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm exec vitest run src/svgExport.test.ts`
Expected: PASS.

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/render.ts src/svgExport.ts src/svgExport.test.ts
git commit -m "Use flat (butt/square) line caps on canvas and in SVG export"
```

---

## Task 4: React + Tailwind v4 + dnd-kit project tooling

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`
- Create: `src/index.css`

**Interfaces:** Pure infrastructure — no application code changes. The existing vanilla app (`index.html` → `src/main.ts`) must keep working unchanged after this task; nothing is wired to the new tooling yet.

- [ ] **Step 1: Install dependencies**

Run: `pnpm add react react-dom`
Run: `pnpm add -D @vitejs/plugin-react @types/react @types/react-dom tailwindcss @tailwindcss/vite @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

- [ ] **Step 2: Update `vite.config.ts`**

Add the React and Tailwind Vite plugins alongside the existing config. The file should end up as:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 6880,
    strictPort: true,
  },
});
```

- [ ] **Step 3: Create the Tailwind entry CSS file**

Create `src/index.css`:

```css
@import "tailwindcss";
```

(Not imported anywhere yet — that happens in Task 11 when `main.tsx` replaces `main.ts`.)

- [ ] **Step 4: Update `tsconfig.json` for JSX and path aliases**

Add `"jsx": "react-jsx"` and a `"paths"` entry mapping `"@/*"` to `["./src/*"]` to `compilerOptions` in `tsconfig.json` (needed by shadcn/ui's generated imports in later tasks). Also add `"baseUrl": "."` if not already present, since `paths` requires it.

- [ ] **Step 5: Verify nothing broke**

Run: `pnpm test`
Expected: PASS — all existing tests unaffected (no test file touched this task).

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vite.config.ts tsconfig.json src/index.css
git commit -m "Add React, Tailwind v4, and dnd-kit tooling (not yet wired into the app)"
```

---

## Task 5: shadcn/ui setup and component generation

**Files:**
- Created by the shadcn CLI: `components.json`, `src/lib/utils.ts`, `src/components/ui/accordion.tsx`, `src/components/ui/slider.tsx`, `src/components/ui/input.tsx`, `src/components/ui/button.tsx`, `src/components/ui/label.tsx`, plus CSS variable additions to `src/index.css`.

**Interfaces:** Produces the five shadcn components (`Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent`, `Slider`, `Input`, `Button`, `Label`) importable from `@/components/ui/*` — consumed by Tasks 6, 8, 9, 10.

This task involves an external CLI whose exact non-interactive flags may have changed since this plan was written — see the Global Constraints note. Use your judgment here, but do not change anything else about the plan's intent (five specific components, `@/*` import alias, "new-york" style if the CLI still exposes that choice).

- [ ] **Step 1: Check the CLI's non-interactive options**

Run: `pnpm dlx shadcn@latest init --help`

Read the output to find the flags for a non-interactive run (commonly a `-d`/`--defaults` and/or `-y`/`--yes` flag, and a way to specify the base color, e.g. `-b neutral` or `--base-color neutral`). Use whatever the current CLI actually supports.

- [ ] **Step 2: Run shadcn init non-interactively**

Run the init command with the flags you found in Step 1 (falling back to accepting prompts programmatically via a tool like `yes` only if truly no non-interactive flag exists — prefer real flags). Confirm afterward that `components.json` and `src/lib/utils.ts` were created, and that `tsconfig.json`'s path alias from Task 4 is still intact (the CLI may rewrite `tsconfig.json` — verify the `@/*` → `./src/*` mapping survived, and re-add it if the CLI removed it).

- [ ] **Step 3: Add the five required components**

Run: `pnpm dlx shadcn@latest add accordion slider input button label`

Confirm all five files now exist under `src/components/ui/`.

- [ ] **Step 4: Verify the project still typechecks and the old app still runs**

Run: `pnpm exec tsc --noEmit`
Expected: no errors (the new `src/components/ui/*` files and `src/lib/utils.ts` should be self-contained and type-clean; the old vanilla app is still untouched and still the active entry point).

Run: `pnpm test`
Expected: PASS — unaffected.

- [ ] **Step 5: Commit**

```bash
git add components.json src/lib src/components/ui src/index.css tsconfig.json
git commit -m "Initialize shadcn/ui and add Accordion, Slider, Input, Button, Label components"
```

In your report, state the exact commands you ran (including the exact flags chosen in Step 1) and confirm the `@/*` alias is intact in `tsconfig.json` after the CLI ran.

---

## Task 6: `ParamSlider` component

**Files:**
- Create: `src/components/ParamSlider.tsx`

**Interfaces:**
- Consumes: shadcn `Slider` from `@/components/ui/slider`, `Input` from `@/components/ui/input`, `Label` from `@/components/ui/label` (Task 5).
- Produces: `ParamSlider({ label, min, max, step, value, onChange }): JSX.Element` — used by Tasks 8 and 10.

No automated test — documented exception for React components. Verify with `pnpm exec tsc --noEmit`.

- [ ] **Step 1: Implement the component**

Create `src/components/ParamSlider.tsx`:

```tsx
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ParamSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

export function ParamSlider({ label, min, max, step, value, onChange }: ParamSliderProps) {
  function clamp(next: number): number {
    return Math.min(max, Math.max(min, next));
  }

  return (
    <div className="mb-2 flex items-center gap-2">
      <Label className="w-32 shrink-0 text-xs">{label}</Label>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => onChange(clamp(next))}
        className="flex-1"
      />
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (!Number.isNaN(next)) {
            onChange(clamp(next));
          }
        }}
        className="w-20 shrink-0 text-xs"
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ParamSlider.tsx
git commit -m "Add reusable ParamSlider component (slider + synced numeric input)"
```

---

## Task 7: `Canvas` component (p5 lifecycle wrapper)

**Files:**
- Create: `src/components/Canvas.tsx`

**Interfaces:**
- Consumes: `renderPattern(p, state): Point[][][]` from `src/render.ts`; `PatternState`, `Point` from `src/types.ts`.
- Produces: `Canvas({ state, onCachedLinesChange }): JSX.Element` — used by Task 11 (`App.tsx`). Calls `onCachedLinesChange` every time `renderPattern` runs, with its return value.

No automated test — documented exception (requires a live p5/canvas context). Verify with `pnpm exec tsc --noEmit`.

- [ ] **Step 1: Implement the component**

Create `src/components/Canvas.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import p5 from 'p5';
import type { PatternState, Point } from '../types';
import { renderPattern } from '../render';

interface CanvasProps {
  state: PatternState;
  onCachedLinesChange: (lines: Point[][][]) => void;
}

export function Canvas({ state, onCachedLinesChange }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<PatternState>(state);
  const p5Ref = useRef<p5 | null>(null);
  const onCachedLinesChangeRef = useRef(onCachedLinesChange);

  useEffect(() => {
    stateRef.current = state;
    p5Ref.current?.redraw();
  }, [state]);

  useEffect(() => {
    onCachedLinesChangeRef.current = onCachedLinesChange;
  }, [onCachedLinesChange]);

  useEffect(() => {
    const sketch = (p: p5) => {
      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.noLoop();
      };

      p.draw = () => {
        const lines = renderPattern(p, stateRef.current);
        onCachedLinesChangeRef.current(lines);
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        p.redraw();
      };
    };

    const instance = new p5(sketch, containerRef.current ?? undefined);
    p5Ref.current = instance;

    return () => {
      instance.remove();
      p5Ref.current = null;
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0" />;
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Canvas.tsx
git commit -m "Add Canvas component wrapping the p5 instance lifecycle in React"
```

---

## Task 8: `LayerPanel` component

**Files:**
- Create: `src/components/LayerPanel.tsx`

**Interfaces:**
- Consumes: `LayerParams` from `src/types.ts`; shadcn `Button` from `@/components/ui/button`; `AccordionItem`/`AccordionTrigger`/`AccordionContent` from `@/components/ui/accordion`; `ParamSlider` from `./ParamSlider` (Task 6); `lucide-react` icons (`GripVertical`, `Copy`, `Trash2` — already a transitive dependency of the shadcn Accordion component from Task 5).
- Produces: `LayerPanel({ layer, index, canDuplicate, canRemove, dragHandleProps, onUpdate, onDuplicate, onRemove }): JSX.Element` — used by Task 9.

No automated test — documented exception. Verify with `pnpm exec tsc --noEmit`.

- [ ] **Step 1: Implement the component**

Create `src/components/LayerPanel.tsx`:

```tsx
import { GripVertical, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ParamSlider } from './ParamSlider';
import type { LayerParams } from '../types';

interface LayerPanelProps {
  layer: LayerParams;
  index: number;
  canDuplicate: boolean;
  canRemove: boolean;
  dragHandleProps: Record<string, unknown>;
  onUpdate: (patch: Partial<LayerParams>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export function LayerPanel({
  layer,
  index,
  canDuplicate,
  canRemove,
  dragHandleProps,
  onUpdate,
  onDuplicate,
  onRemove,
}: LayerPanelProps) {
  return (
    <AccordionItem value={`layer-${index}`}>
      <div className="flex items-center gap-1">
        <button type="button" {...dragHandleProps} className="cursor-grab p-1">
          <GripVertical className="h-4 w-4" />
        </button>
        <AccordionTrigger className="flex-1">{`Layer ${index + 1}`}</AccordionTrigger>
        <Button size="icon" variant="ghost" disabled={!canDuplicate} onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" disabled={!canRemove} onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <AccordionContent>
        <div className="mb-2 flex items-center gap-2">
          <label className="w-32 shrink-0 text-xs">Farbe</label>
          <input
            type="color"
            value={layer.color}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="h-8 w-16 rounded border"
          />
        </div>
        <ParamSlider label="Winkel" min={0} max={360} step={1} value={layer.baseAngle} onChange={(v) => onUpdate({ baseAngle: v })} />
        <ParamSlider label="Noise-Scale" min={0.0002} max={0.05} step={0.0002} value={layer.noiseScale} onChange={(v) => onUpdate({ noiseScale: v })} />
        <ParamSlider label="Noise-Stärke" min={0} max={360} step={1} value={layer.noiseStrength} onChange={(v) => onUpdate({ noiseStrength: v })} />
        <ParamSlider label="Kurven-Trägheit" min={1} max={45} step={1} value={layer.turnRate} onChange={(v) => onUpdate({ turnRate: v })} />
        <ParamSlider label="Zoom" min={1} max={20} step={1} value={layer.zoom} onChange={(v) => onUpdate({ zoom: v })} />
        <ParamSlider label="Deckkraft" min={0} max={1} step={0.01} value={layer.alpha} onChange={(v) => onUpdate({ alpha: v })} />
      </AccordionContent>
    </AccordionItem>
  );
}
```

Note: `dragHandleProps` is typed loosely as `Record<string, unknown>` rather than dnd-kit's internal `DraggableAttributes`/`SyntheticListenerMap` types, to avoid depending on dnd-kit type-export paths that aren't guaranteed stable across versions — it's spread directly onto the handle `<button>` and works correctly at runtime regardless.

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. (If `lucide-react` is not resolvable, run `pnpm add lucide-react` explicitly — it should already be present transitively from the shadcn Accordion component, but add it directly as a dependency if `tsc`/the build complains.)

- [ ] **Step 3: Commit**

```bash
git add src/components/LayerPanel.tsx package.json pnpm-lock.yaml
git commit -m "Add LayerPanel component with per-layer controls and duplicate/remove buttons"
```

---

## Task 9: `LayerAccordion` component (drag-and-drop reordering)

**Files:**
- Create: `src/components/LayerAccordion.tsx`

**Interfaces:**
- Consumes: `LayerParams`, `PatternState` from `src/types.ts`; `MIN_LAYERS`, `MAX_LAYERS` from `src/state.ts`; `LayerPanel` from `./LayerPanel` (Task 8); shadcn `Accordion` from `@/components/ui/accordion`; `@dnd-kit/core` and `@dnd-kit/sortable`.
- Produces: `LayerAccordion({ state, onUpdateLayer, onDuplicateLayer, onRemoveLayer, onReorder }): JSX.Element` — used by Task 10 (`Sidebar.tsx`).

No automated test — documented exception. Verify with `pnpm exec tsc --noEmit`.

Known trade-off, note in your report but do not "fix" it: layer identity for drag-and-drop is derived from array index (`layer-${index}`) rather than a persistent per-layer id, since `LayerParams` has no id field and adding one is out of scope for this task. This works correctly for drag-and-drop interaction (ids are recomputed fresh from current state every render) but means React may remount a layer's DOM subtree differently after a reorder rather than preserving it — acceptable for this feature's scope.

- [ ] **Step 1: Implement the component**

Create `src/components/LayerAccordion.tsx`:

```tsx
import { Accordion } from '@/components/ui/accordion';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { LayerParams, PatternState } from '../types';
import { MAX_LAYERS, MIN_LAYERS } from '../state';
import { LayerPanel } from './LayerPanel';

interface SortableLayerProps {
  layer: LayerParams;
  index: number;
  canDuplicate: boolean;
  canRemove: boolean;
  onUpdate: (patch: Partial<LayerParams>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

function SortableLayer({
  layer,
  index,
  canDuplicate,
  canRemove,
  onUpdate,
  onDuplicate,
  onRemove,
}: SortableLayerProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `layer-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <LayerPanel
        layer={layer}
        index={index}
        canDuplicate={canDuplicate}
        canRemove={canRemove}
        dragHandleProps={{ ...attributes, ...listeners }}
        onUpdate={onUpdate}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
      />
    </div>
  );
}

interface LayerAccordionProps {
  state: PatternState;
  onUpdateLayer: (index: number, patch: Partial<LayerParams>) => void;
  onDuplicateLayer: (index: number) => void;
  onRemoveLayer: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function LayerAccordion({
  state,
  onUpdateLayer,
  onDuplicateLayer,
  onRemoveLayer,
  onReorder,
}: LayerAccordionProps) {
  const sensors = useSensors(useSensor(PointerSensor));
  const ids = state.layers.map((_, i) => `layer-${i}`);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const fromIndex = ids.indexOf(String(active.id));
    const toIndex = ids.indexOf(String(over.id));
    if (fromIndex !== -1 && toIndex !== -1) {
      onReorder(fromIndex, toIndex);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <Accordion type="multiple">
          {state.layers.map((layer, index) => (
            <SortableLayer
              key={ids[index]}
              layer={layer}
              index={index}
              canDuplicate={state.layers.length < MAX_LAYERS}
              canRemove={state.layers.length > MIN_LAYERS}
              onUpdate={(patch) => onUpdateLayer(index, patch)}
              onDuplicate={() => onDuplicateLayer(index)}
              onRemove={() => onRemoveLayer(index)}
            />
          ))}
        </Accordion>
      </SortableContext>
    </DndContext>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/LayerAccordion.tsx
git commit -m "Add LayerAccordion with dnd-kit drag-and-drop layer reordering"
```

---

## Task 10: `Sidebar` component

**Files:**
- Create: `src/components/Sidebar.tsx`

**Interfaces:**
- Consumes: `LayerParams`, `PatternState` from `src/types.ts`; shadcn `Button` from `@/components/ui/button`; `ParamSlider` from `./ParamSlider` (Task 6); `LayerAccordion` from `./LayerAccordion` (Task 9).
- Produces: `Sidebar({ state, onBackgroundChange, onGlobalSpacingChange, onGlobalWeightChange, onUpdateLayer, onDuplicateLayer, onRemoveLayer, onReorderLayers, onExport }): JSX.Element` — used by Task 11 (`App.tsx`).

No automated test — documented exception. Verify with `pnpm exec tsc --noEmit`.

- [ ] **Step 1: Implement the component**

Create `src/components/Sidebar.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { ParamSlider } from './ParamSlider';
import { LayerAccordion } from './LayerAccordion';
import type { LayerParams, PatternState } from '../types';

interface SidebarProps {
  state: PatternState;
  onBackgroundChange: (color: string) => void;
  onGlobalSpacingChange: (spacing: number) => void;
  onGlobalWeightChange: (weight: number) => void;
  onUpdateLayer: (index: number, patch: Partial<LayerParams>) => void;
  onDuplicateLayer: (index: number) => void;
  onRemoveLayer: (index: number) => void;
  onReorderLayers: (fromIndex: number, toIndex: number) => void;
  onExport: () => void;
}

export function Sidebar({
  state,
  onBackgroundChange,
  onGlobalSpacingChange,
  onGlobalWeightChange,
  onUpdateLayer,
  onDuplicateLayer,
  onRemoveLayer,
  onReorderLayers,
  onExport,
}: SidebarProps) {
  const spacing = state.layers[0]?.spacing ?? 14;
  const weight = state.layers[0]?.weight ?? 1.5;

  return (
    <div className="fixed right-0 top-0 h-screen w-72 overflow-y-auto bg-neutral-900/85 p-3 text-sm text-white">
      <div className="mb-2 flex items-center gap-2">
        <label className="w-32 shrink-0 text-xs">Hintergrund</label>
        <input
          type="color"
          value={state.background}
          onChange={(e) => onBackgroundChange(e.target.value)}
          className="h-8 w-16 rounded border"
        />
      </div>
      <ParamSlider label="Abstand" min={4} max={50} step={1} value={spacing} onChange={onGlobalSpacingChange} />
      <ParamSlider label="Linienbreite" min={0.5} max={50} step={0.5} value={weight} onChange={onGlobalWeightChange} />
      <Button className="mb-3 w-full" onClick={onExport}>
        Als SVG exportieren
      </Button>
      <LayerAccordion
        state={state}
        onUpdateLayer={onUpdateLayer}
        onDuplicateLayer={onDuplicateLayer}
        onRemoveLayer={onRemoveLayer}
        onReorder={onReorderLayers}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "Add Sidebar component with global background/spacing/weight controls"
```

---

## Task 11: Wire up `App.tsx`/`main.tsx`, replace `index.html`, remove old files, verify

**Files:**
- Create: `src/App.tsx`
- Create: `src/main.tsx`
- Modify: `index.html`
- Delete: `src/main.ts`
- Delete: `src/controls.ts`

**Interfaces:**
- Consumes: `Canvas` (Task 7), `Sidebar` (Task 10), `createDefaultState`/`duplicateLayer`/`removeLayer`/`reorderLayers`/`setGlobalSpacing`/`setGlobalWeight` (Task 2), `exportSvg` (existing, unchanged), `LayerParams`/`Point` (Task 1/existing).

- [ ] **Step 1: Create `App.tsx`**

Create `src/App.tsx`:

```tsx
import { useRef, useState } from 'react';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import {
  createDefaultState,
  duplicateLayer,
  removeLayer,
  reorderLayers,
  setGlobalSpacing,
  setGlobalWeight,
} from './state';
import { exportSvg } from './svgExport';
import type { LayerParams, Point } from './types';

export function App() {
  const [state, setState] = useState(createDefaultState());
  const cachedLinesRef = useRef<Point[][][]>([]);

  function updateLayer(index: number, patch: Partial<LayerParams>) {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((layer, i) => (i === index ? { ...layer, ...patch } : layer)),
    }));
  }

  function handleExport() {
    exportSvg(state, cachedLinesRef.current, window.innerWidth, window.innerHeight);
  }

  return (
    <>
      <Canvas
        state={state}
        onCachedLinesChange={(lines) => {
          cachedLinesRef.current = lines;
        }}
      />
      <Sidebar
        state={state}
        onBackgroundChange={(color) => setState((prev) => ({ ...prev, background: color }))}
        onGlobalSpacingChange={(spacing) => setState((prev) => setGlobalSpacing(prev, spacing))}
        onGlobalWeightChange={(weight) => setState((prev) => setGlobalWeight(prev, weight))}
        onUpdateLayer={updateLayer}
        onDuplicateLayer={(index) => setState((prev) => duplicateLayer(prev, index))}
        onRemoveLayer={(index) => setState((prev) => removeLayer(prev, index))}
        onReorderLayers={(from, to) => setState((prev) => reorderLayers(prev, from, to))}
        onExport={handleExport}
      />
    </>
  );
}
```

- [ ] **Step 2: Create `main.tsx`**

Create `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 3: Replace `index.html`**

Overwrite `index.html`:

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>moireOne</title>
    <style>
      html, body { margin: 0; padding: 0; overflow: hidden; }
      canvas { display: block; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Delete the superseded vanilla files**

```bash
git rm src/main.ts src/controls.ts
```

- [ ] **Step 5: Run the full test suite and typecheck**

Run: `pnpm test`
Expected: PASS — all tests for the pure logic modules (`flowfield`, `lineGenerator`, `state`, `svgExport`) still green; nothing here has React/DOM tests to run.

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual browser verification**

Run: `pnpm dev` (dev server at `http://localhost:6880`)

Check in the browser:
1. Canvas fills the screen behind a right-hand sidebar; pattern renders on load with the existing default parameters (large, smooth sweeping curves).
2. Each layer's Accordion panel expands/collapses; every `ParamSlider` (Winkel, Noise-Scale, Noise-Stärke, Kurven-Trägheit, Zoom, Deckkraft) moves the canvas pattern when dragged, and typing a number in its adjacent input field does the same and stays in sync with the slider.
3. The Zoom slider visibly changes curve scale/amplitude independent of Noise-Scale.
4. The global Abstand and Linienbreite sliders in the top section change spacing/line width identically across every layer at once (no more per-layer spacing/weight controls exist).
5. Duplicating a layer inserts a copy directly below it; the duplicate button disables at 5 layers.
6. Removing a layer deletes it; the remove button disables at 2 layers.
7. Dragging a layer's grip handle reorders it in the Accordion, and the draw order (which layer renders on top) visibly changes to match.
8. Changing the background color picker changes the canvas background.
9. Line ends look flat/square, not rounded, at high Linienbreite values.
10. Clicking "Als SVG exportieren" downloads a `.svg` file whose appearance matches the canvas (including flat line caps).

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/main.tsx index.html
git commit -m "Wire up React app: App/main.tsx, new index.html, remove vanilla main.ts/controls.ts"
```
