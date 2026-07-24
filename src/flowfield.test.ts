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
  turnRate: 1000,
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
