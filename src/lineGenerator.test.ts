import { describe, it, expect } from 'vitest';
import { generateLayerLines } from './lineGenerator';
import type { LayerParams, NoiseFn } from './types';

const MAX_STEPS = 2000;

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

  it('generates lines that are exact rigid (parallel) translates of one another', () => {
    const width = 400;
    const height = 400;

    const curvingLayer: LayerParams = {
      color: '#ff00ff',
      baseAngle: 0,
      noiseScale: 0.01,
      noiseStrength: 15,
      spacing: 40,
      weight: 1,
      alpha: 1,
      seed: 0,
    };

    // Deterministic, non-constant noise: the path genuinely curves (it is
    // NOT a constant deviation), so if lines were still sampling the field
    // independently at their own (x, y) they would drift apart or converge
    // instead of staying rigidly parallel.
    const curvingNoise: NoiseFn = (x) => 0.5 + 0.3 * Math.sin(x);

    const lines = generateLayerLines(curvingLayer, width, height, curvingNoise);

    // Group lines by point-count. With baseAngle 0 the perpendicular offset
    // between parallel lines is purely vertical, so every line shares the
    // exact same x-trajectory (only its constant y-offset differs). Lines
    // whose y stays within the canvas for the whole transit will therefore
    // all have identical length (same entry/exit step indices).
    const byLength = new Map<number, (typeof lines)[number][]>();
    for (const line of lines) {
      const group = byLength.get(line.length) ?? [];
      group.push(line);
      byLength.set(line.length, group);
    }

    let chosenPair: [(typeof lines)[number], (typeof lines)[number]] | undefined;
    for (const [length, group] of byLength) {
      if (length > 50 && group.length >= 2) {
        chosenPair = [group[0], group[1]];
        break;
      }
    }

    expect(chosenPair).toBeDefined();
    const [lineA, lineB] = chosenPair!;
    expect(lineA.length).toBe(lineB.length);
    expect(lineA.length).toBeGreaterThan(50);

    const EPSILON = 1e-9;
    const firstDx = lineB[0].x - lineA[0].x;
    const firstDy = lineB[0].y - lineA[0].y;

    for (let k = 0; k < lineA.length; k++) {
      const dx = lineB[k].x - lineA[k].x;
      const dy = lineB[k].y - lineA[k].y;
      expect(Math.abs(dx - firstDx)).toBeLessThan(EPSILON);
      expect(Math.abs(dy - firstDy)).toBeLessThan(EPSILON);
    }

    // Because baseAngle is 0, the perpendicular direction is purely
    // vertical: the constant separation vector must have (almost) no
    // horizontal component.
    expect(Math.abs(firstDx)).toBeLessThan(1e-6);

    // The constant vertical separation must be a whole-number multiple of
    // the layer's spacing (since every start point is offset by i * spacing
    // along the perpendicular direction).
    const spacingMultiple = firstDy / curvingLayer.spacing;
    expect(Math.abs(spacingMultiple - Math.round(spacingMultiple))).toBeLessThan(1e-6);
    expect(Math.round(spacingMultiple)).not.toBe(0);
  });

  it('samples the noise field exactly MAX_STEPS times total, regardless of line count', () => {
    let callCount = 0;
    const spyNoise: NoiseFn = () => {
      callCount++;
      return 0.5;
    };

    // A small spacing produces many parallel lines (far more than one
    // sample-per-line-per-step would allow us to ignore); the noise field
    // must still only be sampled once, along the single reference spine.
    generateLayerLines({ ...straightLayer, spacing: 2 }, 200, 200, spyNoise);

    expect(callCount).toBe(MAX_STEPS);
  });
});
