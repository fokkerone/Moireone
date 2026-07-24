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
