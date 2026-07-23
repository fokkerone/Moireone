# Moiré-Flowfield-Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive p5.js/TypeScript sketch that layers 2–5 independently-configurable Perlin-noise flow-field line patterns into a Moiré effect, controllable via an HTML panel, exportable as SVG.

**Architecture:** Pure, unit-tested logic modules (`flowfield.ts`, `lineGenerator.ts`, `state.ts`, `svgExport.ts`) compute angles, line geometry, and SVG strings without touching p5 or the DOM. Thin, manually-verified glue modules (`render.ts`, `controls.ts`, `main.ts`) wire that logic to the p5 canvas and an HTML control panel. State flows one way: control input → state update → `p.redraw()` → `renderPattern()` recomputes and caches line geometry → SVG export reads the cache.

**Tech Stack:** p5.js (instance mode), TypeScript, Vite, Vitest + jsdom for unit tests, pnpm.

## Global Constraints

- No animation loop — the pattern is static; canvas uses `p.noLoop()` and only redraws via explicit `p.redraw()` on parameter change.
- Flow field is Perlin-noise based only — no image-derived field data.
- Export format is SVG only — no PNG export.
- Background is a single solid color via color picker — no gradient.
- Every layer has fully independent parameters: color, base angle, noise scale, noise strength, spacing, stroke weight, opacity.
- Layer count is adjustable between 2 and 5 via a slider.
- Layers combine via alpha opacity only — no blend modes.

---

## Task 1: Test tooling + shared types + flowfield module

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/types.ts`
- Create: `src/flowfield.ts`
- Test: `src/flowfield.test.ts`

**Interfaces:**
- Produces: `Point { x: number; y: number }`, `NoiseFn = (x: number, y: number, z: number) => number`, `LayerParams { color: string; baseAngle: number; noiseScale: number; noiseStrength: number; spacing: number; weight: number; alpha: number; seed: number }`, `PatternState { background: string; layers: LayerParams[] }` — used by every later task.
- Produces: `fieldAngle(layer: LayerParams, x: number, y: number, noise: NoiseFn): number` — used by Task 2.

- [ ] **Step 1: Install Vitest and jsdom**

Run: `pnpm add -D vitest jsdom`
Expected: adds `vitest` and `jsdom` to `devDependencies` in `package.json`.

- [ ] **Step 2: Add the test script to package.json**

Modify `package.json` scripts block to:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

- [ ] **Step 3: Create the Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});
```

- [ ] **Step 4: Create the shared types module**

Create `src/types.ts`:

```ts
export interface Point {
  x: number;
  y: number;
}

export type NoiseFn = (x: number, y: number, z: number) => number;

export interface LayerParams {
  color: string;
  baseAngle: number;
  noiseScale: number;
  noiseStrength: number;
  spacing: number;
  weight: number;
  alpha: number;
  seed: number;
}

export interface PatternState {
  background: string;
  layers: LayerParams[];
}
```

- [ ] **Step 5: Write the failing test for fieldAngle**

Create `src/flowfield.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fieldAngle } from './flowfield';
import type { LayerParams, NoiseFn } from './types';

const baseLayer: LayerParams = {
  color: '#ff0000',
  baseAngle: 45,
  noiseScale: 0.01,
  noiseStrength: 30,
  spacing: 10,
  weight: 1,
  alpha: 1,
  seed: 0,
};

describe('fieldAngle', () => {
  it('returns baseAngle unchanged when noise is exactly 0.5 (neutral)', () => {
    const neutralNoise: NoiseFn = () => 0.5;
    expect(fieldAngle(baseLayer, 100, 100, neutralNoise)).toBe(45);
  });

  it('adds the full positive deviation when noise is 1', () => {
    const maxNoise: NoiseFn = () => 1;
    expect(fieldAngle(baseLayer, 100, 100, maxNoise)).toBe(45 + 30);
  });

  it('adds the full negative deviation when noise is 0', () => {
    const minNoise: NoiseFn = () => 0;
    expect(fieldAngle(baseLayer, 100, 100, minNoise)).toBe(45 - 30);
  });

  it('passes noise-scaled coordinates and the layer seed to the noise function', () => {
    let received: [number, number, number] | null = null;
    const spyNoise: NoiseFn = (x, y, z) => {
      received = [x, y, z];
      return 0.5;
    };
    fieldAngle({ ...baseLayer, noiseScale: 0.02, seed: 7 }, 50, 200, spyNoise);
    expect(received).toEqual([1, 4, 7]);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `pnpm exec vitest run src/flowfield.test.ts`
Expected: FAIL — `src/flowfield.ts` does not exist yet (module not found).

- [ ] **Step 7: Implement flowfield.ts**

Create `src/flowfield.ts`:

```ts
import type { LayerParams, NoiseFn } from './types';

export function fieldAngle(
  layer: LayerParams,
  x: number,
  y: number,
  noise: NoiseFn
): number {
  const n = noise(x * layer.noiseScale, y * layer.noiseScale, layer.seed);
  const deviationDegrees = (n - 0.5) * 2 * layer.noiseStrength;
  return layer.baseAngle + deviationDegrees;
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm exec vitest run src/flowfield.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/types.ts src/flowfield.ts src/flowfield.test.ts
git commit -m "Add test tooling, shared types, and flowfield angle calculation"
```

---

## Task 2: Line generator

**Files:**
- Create: `src/lineGenerator.ts`
- Test: `src/lineGenerator.test.ts`

**Interfaces:**
- Consumes: `fieldAngle(layer, x, y, noise)` from Task 1's `src/flowfield.ts`; `LayerParams`, `NoiseFn`, `Point` from `src/types.ts`.
- Produces: `generateLayerLines(layer: LayerParams, width: number, height: number, noise: NoiseFn): Point[][]` — used by Task 5 (`render.ts`).

- [ ] **Step 1: Write the failing tests**

Create `src/lineGenerator.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateLayerLines } from './lineGenerator';
import type { LayerParams, NoiseFn } from './types';

const straightLayer: LayerParams = {
  color: '#00ff00',
  baseAngle: 0,
  noiseScale: 0.01,
  noiseStrength: 0,
  spacing: 20,
  weight: 1,
  alpha: 1,
  seed: 0,
};

const neutralNoise: NoiseFn = () => 0.5;

describe('generateLayerLines', () => {
  it('produces at least one line covering a 200x200 canvas', () => {
    const lines = generateLayerLines(straightLayer, 200, 200, neutralNoise);
    expect(lines.length).toBeGreaterThan(0);
  });

  it('moves in a straight horizontal line when noiseStrength is 0 and baseAngle is 0', () => {
    const lines = generateLayerLines(straightLayer, 200, 200, neutralNoise);
    const line = lines.find((l) => l.some((p) => Math.abs(p.y - 100) < 1));
    expect(line).toBeDefined();
    const uniqueYs = new Set(line!.map((p) => Math.round(p.y)));
    expect(uniqueYs.size).toBe(1);
  });

  it('keeps every point of every line within the canvas bounds', () => {
    const lines = generateLayerLines(straightLayer, 200, 200, neutralNoise);
    for (const line of lines) {
      for (const point of line) {
        expect(point.x).toBeGreaterThanOrEqual(-0.001);
        expect(point.x).toBeLessThanOrEqual(200.001);
        expect(point.y).toBeGreaterThanOrEqual(-0.001);
        expect(point.y).toBeLessThanOrEqual(200.001);
      }
    }
  });

  it('produces more lines when spacing is smaller', () => {
    const wideSpacing = generateLayerLines(straightLayer, 200, 200, neutralNoise);
    const tightSpacing = generateLayerLines({ ...straightLayer, spacing: 5 }, 200, 200, neutralNoise);
    expect(tightSpacing.length).toBeGreaterThan(wideSpacing.length);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/lineGenerator.test.ts`
Expected: FAIL — `src/lineGenerator.ts` does not exist yet.

- [ ] **Step 3: Implement lineGenerator.ts**

Create `src/lineGenerator.ts`:

```ts
import type { LayerParams, NoiseFn, Point } from './types';
import { fieldAngle } from './flowfield';

const STEP_LENGTH = 4;
const MAX_STEPS = 2000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function isInsideCanvas(point: Point, width: number, height: number): boolean {
  return point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height;
}

export function generateLayerLines(
  layer: LayerParams,
  width: number,
  height: number,
  noise: NoiseFn
): Point[][] {
  const diagonal = Math.sqrt(width * width + height * height);
  const perpendicularAngle = toRadians(layer.baseAngle + 90);
  const perpX = Math.cos(perpendicularAngle);
  const perpY = Math.sin(perpendicularAngle);
  const centerX = width / 2;
  const centerY = height / 2;
  const travelAngle = toRadians(layer.baseAngle);
  const backX = -Math.cos(travelAngle);
  const backY = -Math.sin(travelAngle);

  const lines: Point[][] = [];
  const halfCount = Math.ceil(diagonal / layer.spacing / 2);

  for (let i = -halfCount; i <= halfCount; i++) {
    const offset = i * layer.spacing;
    const startX = centerX + perpX * offset + backX * diagonal;
    const startY = centerY + perpY * offset + backY * diagonal;

    const points: Point[] = [];
    let x = startX;
    let y = startY;
    let steps = 0;
    let hasEnteredCanvas = false;

    while (steps < MAX_STEPS) {
      const inside = isInsideCanvas({ x, y }, width, height);
      if (inside) {
        hasEnteredCanvas = true;
        points.push({ x, y });
      } else if (hasEnteredCanvas) {
        break;
      }

      const angle = toRadians(fieldAngle(layer, x, y, noise));
      x += Math.cos(angle) * STEP_LENGTH;
      y += Math.sin(angle) * STEP_LENGTH;
      steps++;
    }

    if (points.length > 1) {
      lines.push(points);
    }
  }

  return lines;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/lineGenerator.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lineGenerator.ts src/lineGenerator.test.ts
git commit -m "Add flow-field parallel line generator"
```

---

## Task 3: Default palette + layer state management

**Files:**
- Create: `src/palette.ts`
- Create: `src/state.ts`
- Test: `src/state.test.ts`

**Interfaces:**
- Consumes: `LayerParams`, `PatternState` from `src/types.ts`.
- Produces: `getDefaultLayerColor(index: number): string`; `MIN_LAYERS = 2`, `MAX_LAYERS = 5`; `createDefaultLayer(index: number): LayerParams`; `createDefaultState(): PatternState`; `setLayerCount(state: PatternState, count: number): PatternState` — used by Task 6 (`controls.ts`) and Task 7 (`main.ts`).

- [ ] **Step 1: Create the default color palette**

Create `src/palette.ts`:

```ts
export const DEFAULT_LAYER_COLORS = ['#ff5ea8', '#5ec8ff', '#a8ff5e', '#ffcf5e', '#c85eff'];

export function getDefaultLayerColor(index: number): string {
  return DEFAULT_LAYER_COLORS[index % DEFAULT_LAYER_COLORS.length];
}
```

- [ ] **Step 2: Write the failing tests for state management**

Create `src/state.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createDefaultState, setLayerCount, MIN_LAYERS, MAX_LAYERS } from './state';

describe('createDefaultState', () => {
  it('starts with exactly 2 layers', () => {
    const state = createDefaultState();
    expect(state.layers.length).toBe(2);
  });
});

describe('setLayerCount', () => {
  it('adds layers up to the requested count', () => {
    const updated = setLayerCount(createDefaultState(), 4);
    expect(updated.layers.length).toBe(4);
  });

  it('removes layers down to the requested count, keeping earlier layers unchanged', () => {
    const state = setLayerCount(createDefaultState(), 4);
    const firstLayerBefore = state.layers[0];
    const reduced = setLayerCount(state, 2);
    expect(reduced.layers.length).toBe(2);
    expect(reduced.layers[0]).toEqual(firstLayerBefore);
  });

  it('clamps counts below MIN_LAYERS up to MIN_LAYERS', () => {
    const updated = setLayerCount(createDefaultState(), 0);
    expect(updated.layers.length).toBe(MIN_LAYERS);
  });

  it('clamps counts above MAX_LAYERS down to MAX_LAYERS', () => {
    const updated = setLayerCount(createDefaultState(), 10);
    expect(updated.layers.length).toBe(MAX_LAYERS);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/state.test.ts`
Expected: FAIL — `src/state.ts` does not exist yet.

- [ ] **Step 4: Implement state.ts**

Create `src/state.ts`:

```ts
import type { LayerParams, PatternState } from './types';
import { getDefaultLayerColor } from './palette';

export const MIN_LAYERS = 2;
export const MAX_LAYERS = 5;

export function createDefaultLayer(index: number): LayerParams {
  return {
    color: getDefaultLayerColor(index),
    baseAngle: (index * 25) % 360,
    noiseScale: 0.01,
    noiseStrength: 20,
    spacing: 14,
    weight: 1.5,
    alpha: 0.6,
    seed: index * 100,
  };
}

export function createDefaultState(): PatternState {
  return {
    background: '#000000',
    layers: [createDefaultLayer(0), createDefaultLayer(1)],
  };
}

export function setLayerCount(state: PatternState, count: number): PatternState {
  const clamped = Math.min(MAX_LAYERS, Math.max(MIN_LAYERS, count));
  const layers = state.layers.slice(0, clamped);
  while (layers.length < clamped) {
    layers.push(createDefaultLayer(layers.length));
  }
  return { ...state, layers };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/state.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/palette.ts src/state.ts src/state.test.ts
git commit -m "Add default layer palette and layer-count state management"
```

---

## Task 4: SVG export

**Files:**
- Create: `src/svgExport.ts`
- Test: `src/svgExport.test.ts`

**Interfaces:**
- Consumes: `PatternState`, `Point` from `src/types.ts`.
- Produces: `buildSvgString(state: PatternState, layerLines: Point[][][], width: number, height: number): string`; `exportSvg(state: PatternState, layerLines: Point[][][], width: number, height: number): void` — used by Task 7 (`main.ts`).

- [ ] **Step 1: Write the failing tests for buildSvgString**

Create `src/svgExport.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSvgString } from './svgExport';
import type { PatternState, Point } from './types';

const state: PatternState = {
  background: '#111111',
  layers: [
    {
      color: '#ff0000',
      baseAngle: 0,
      noiseScale: 0.01,
      noiseStrength: 0,
      spacing: 10,
      weight: 2,
      alpha: 0.5,
      seed: 0,
    },
  ],
};

describe('buildSvgString', () => {
  it('includes a background rect matching the state background color and canvas size', () => {
    const svg = buildSvgString(state, [[]], 300, 200);
    expect(svg).toContain('fill="#111111"');
    expect(svg).toContain('width="300"');
    expect(svg).toContain('height="200"');
  });

  it('renders one polyline per line with the layer color, opacity, and stroke width', () => {
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    const svg = buildSvgString(state, [[line]], 300, 200);
    expect(svg).toContain('points="0.00,0.00 10.00,10.00"');
    expect(svg).toContain('stroke="#ff0000"');
    expect(svg).toContain('stroke-opacity="0.5"');
    expect(svg).toContain('stroke-width="2"');
  });

  it('produces parseable, error-free XML', () => {
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    const svg = buildSvgString(state, [[line]], 300, 200);
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/svgExport.test.ts`
Expected: FAIL — `src/svgExport.ts` does not exist yet.

- [ ] **Step 3: Implement svgExport.ts**

Create `src/svgExport.ts`:

```ts
import type { PatternState, Point } from './types';

export function buildSvgString(
  state: PatternState,
  layerLines: Point[][][],
  width: number,
  height: number
): string {
  const rect = `<rect x="0" y="0" width="${width}" height="${height}" fill="${state.background}" />`;

  const polylines: string[] = [];
  state.layers.forEach((layer, layerIndex) => {
    const lines = layerLines[layerIndex] ?? [];
    for (const line of lines) {
      const points = line.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
      polylines.push(
        `<polyline points="${points}" fill="none" stroke="${layer.color}" stroke-opacity="${layer.alpha}" stroke-width="${layer.weight}" />`
      );
    }
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    rect,
    ...polylines,
    '</svg>',
  ].join('\n');
}

export function exportSvg(
  state: PatternState,
  layerLines: Point[][][],
  width: number,
  height: number
): void {
  const svg = buildSvgString(state, layerLines, width, height);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'moire-pattern.svg';
  link.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/svgExport.test.ts`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/svgExport.ts src/svgExport.test.ts
git commit -m "Add SVG serialization and export-to-file logic"
```

---

## Task 5: Canvas rendering

**Files:**
- Create: `src/render.ts`

**Interfaces:**
- Consumes: `generateLayerLines(layer, width, height, noise)` from Task 2; `PatternState`, `Point` from `src/types.ts`.
- Produces: `renderPattern(p: p5, state: PatternState): Point[][][]` — used by Task 7 (`main.ts`). Return value is one `Point[][]` per layer, in `state.layers` order — this is the cache Task 4's `exportSvg` consumes as `layerLines`.

No automated test: this module talks directly to the p5 canvas API, which requires a real WebGL/2D rendering context. It is verified manually in Task 7's browser check.

- [ ] **Step 1: Implement render.ts**

Create `src/render.ts`:

```ts
import type p5 from 'p5';
import type { PatternState, Point } from './types';
import { generateLayerLines } from './lineGenerator';

export function renderPattern(p: p5, state: PatternState): Point[][][] {
  p.background(state.background);
  const layerLines: Point[][][] = [];

  state.layers.forEach((layer) => {
    const lines = generateLayerLines(layer, p.width, p.height, (x, y, z) => p.noise(x, y, z));
    layerLines.push(lines);

    p.stroke(layer.color);
    p.strokeWeight(layer.weight);
    p.noFill();
    (p.drawingContext as CanvasRenderingContext2D).globalAlpha = layer.alpha;

    for (const line of lines) {
      p.beginShape();
      for (const point of line) {
        p.vertex(point.x, point.y);
      }
      p.endShape();
    }
  });

  return layerLines;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/render.ts
git commit -m "Add p5 canvas rendering for layered flow-field lines"
```

---

## Task 6: HTML control panel

**Files:**
- Create: `src/controls.ts`

**Interfaces:**
- Consumes: `LayerParams`, `PatternState` from `src/types.ts`; `MIN_LAYERS`, `MAX_LAYERS`, `setLayerCount(state, count)` from Task 3's `src/state.ts`.
- Produces: `createControls(container: HTMLElement, initialState: PatternState, onChange: (state: PatternState) => void): void`. Builds a global section (layer-count slider, background color picker, an `<button id="export-svg-button">`) and one `<fieldset>` block per layer (color, angle, noise scale, noise strength, spacing, weight, opacity). Calls `onChange` with the updated state on every input event. Used by Task 7 (`main.ts`), which also wires a click listener onto `#export-svg-button`.

No automated test: this module only builds and wires DOM elements: verified manually in Task 7's browser check by moving each control and confirming the canvas updates.

- [ ] **Step 1: Implement controls.ts**

Create `src/controls.ts`:

```ts
import type { LayerParams, PatternState } from './types';
import { MIN_LAYERS, MAX_LAYERS, setLayerCount } from './state';

type ChangeHandler = (state: PatternState) => void;

function createSlider(
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  onInput: (value: number) => void
): HTMLElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'control-row';
  wrapper.textContent = label;

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener('input', () => onInput(Number(input.value)));

  wrapper.appendChild(input);
  return wrapper;
}

function createColorPicker(
  label: string,
  value: string,
  onInput: (value: string) => void
): HTMLElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'control-row';
  wrapper.textContent = label;

  const input = document.createElement('input');
  input.type = 'color';
  input.value = value;
  input.addEventListener('input', () => onInput(input.value));

  wrapper.appendChild(input);
  return wrapper;
}

function renderLayerBlock(
  layer: LayerParams,
  index: number,
  updateLayer: (index: number, patch: Partial<LayerParams>) => void
): HTMLElement {
  const block = document.createElement('fieldset');
  block.className = 'layer-block';

  const legend = document.createElement('legend');
  legend.textContent = `Layer ${index + 1}`;
  block.appendChild(legend);

  block.appendChild(createColorPicker('Farbe', layer.color, (v) => updateLayer(index, { color: v })));
  block.appendChild(createSlider('Winkel', 0, 360, 1, layer.baseAngle, (v) => updateLayer(index, { baseAngle: v })));
  block.appendChild(createSlider('Noise-Scale', 0.001, 0.05, 0.001, layer.noiseScale, (v) => updateLayer(index, { noiseScale: v })));
  block.appendChild(createSlider('Noise-Stärke', 0, 180, 1, layer.noiseStrength, (v) => updateLayer(index, { noiseStrength: v })));
  block.appendChild(createSlider('Abstand', 4, 60, 1, layer.spacing, (v) => updateLayer(index, { spacing: v })));
  block.appendChild(createSlider('Strichstärke', 0.5, 6, 0.1, layer.weight, (v) => updateLayer(index, { weight: v })));
  block.appendChild(createSlider('Deckkraft', 0, 1, 0.01, layer.alpha, (v) => updateLayer(index, { alpha: v })));

  return block;
}

export function createControls(
  container: HTMLElement,
  initialState: PatternState,
  onChange: ChangeHandler
): void {
  let state = initialState;

  const globalSection = document.createElement('div');
  globalSection.className = 'global-controls';
  container.appendChild(globalSection);

  const layersSection = document.createElement('div');
  layersSection.className = 'layers-controls';
  container.appendChild(layersSection);

  function updateLayer(index: number, patch: Partial<LayerParams>): void {
    const layers = state.layers.map((layer, i) => (i === index ? { ...layer, ...patch } : layer));
    state = { ...state, layers };
    onChange(state);
  }

  function renderLayers(): void {
    layersSection.innerHTML = '';
    state.layers.forEach((layer, index) => {
      layersSection.appendChild(renderLayerBlock(layer, index, updateLayer));
    });
  }

  globalSection.appendChild(
    createSlider('Anzahl Layer', MIN_LAYERS, MAX_LAYERS, 1, state.layers.length, (count) => {
      state = setLayerCount(state, count);
      renderLayers();
      onChange(state);
    })
  );

  globalSection.appendChild(
    createColorPicker('Hintergrund', state.background, (color) => {
      state = { ...state, background: color };
      onChange(state);
    })
  );

  const exportButton = document.createElement('button');
  exportButton.textContent = 'Als SVG exportieren';
  exportButton.id = 'export-svg-button';
  globalSection.appendChild(exportButton);

  renderLayers();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/controls.ts
git commit -m "Add dynamic HTML control panel for layers and global settings"
```

---

## Task 7: Wire everything together in main.ts and the page layout

**Files:**
- Modify: `src/main.ts`
- Modify: `index.html`

**Interfaces:**
- Consumes: `createDefaultState()` (Task 3), `renderPattern(p, state)` (Task 5), `createControls(container, initialState, onChange)` (Task 6), `exportSvg(state, layerLines, width, height)` (Task 4), `Point` (Task 1).

- [ ] **Step 1: Replace src/main.ts**

Overwrite `src/main.ts`:

```ts
import p5 from 'p5';
import type { Point } from './types';
import { createDefaultState } from './state';
import { renderPattern } from './render';
import { createControls } from './controls';
import { exportSvg } from './svgExport';

let currentState = createDefaultState();
let cachedLines: Point[][][] = [];

const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.noLoop();

    const controlsContainer = document.getElementById('controls')!;
    createControls(controlsContainer, currentState, (nextState) => {
      currentState = nextState;
      p.redraw();
    });

    document.getElementById('export-svg-button')!.addEventListener('click', () => {
      exportSvg(currentState, cachedLines, p.width, p.height);
    });
  };

  p.draw = () => {
    cachedLines = renderPattern(p, currentState);
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    p.redraw();
  };
};

new p5(sketch);
```

- [ ] **Step 2: Replace index.html**

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
      #controls {
        position: fixed;
        top: 0;
        right: 0;
        width: 280px;
        height: 100vh;
        overflow-y: auto;
        background: rgba(20, 20, 20, 0.85);
        color: #fff;
        font-family: sans-serif;
        font-size: 13px;
        padding: 12px;
        box-sizing: border-box;
        z-index: 10;
      }
      #controls fieldset {
        margin-bottom: 12px;
        border: 1px solid #444;
      }
      #controls .control-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
      }
      #controls .control-row input[type="range"] {
        flex: 1;
      }
      #controls button {
        width: 100%;
        padding: 8px;
        margin-top: 8px;
      }
    </style>
  </head>
  <body>
    <div id="controls"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`
Expected: PASS — all tests from Tasks 1–4 still green (16 tests total).

- [ ] **Step 4: Manual browser verification**

Run: `pnpm dev` (dev server at `http://localhost:6880`)

Check in the browser:
1. Canvas fills the screen, control panel sidebar appears on the right.
2. Moving any layer's angle/noise-scale/noise-strength/spacing/weight/opacity slider visibly changes only that layer's lines.
3. Changing a layer's color picker changes only that layer's line color.
4. Moving the "Anzahl Layer" slider from 2 up to 5 adds new layer blocks with their own controls, and back down to 2 removes them while the remaining layers' settings stay unchanged.
5. Changing the background color picker changes the canvas background.
6. Clicking "Als SVG exportieren" downloads a `.svg` file; opening it in the browser shows the same pattern as the canvas.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts index.html
git commit -m "Wire flow-field layers, controls, and SVG export into the sketch"
```
