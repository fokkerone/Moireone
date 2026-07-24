import { describe, it, expect } from 'vitest';
import { lineOffset } from './flowfield';
import type { LayerParams, NoiseFn } from './types';

const baseLayer: LayerParams = {
  colorStart: '#000000', colorEnd: '#ffffff', gradientAngle: 90,
  baseAngle: 45,
  noiseScale: 0.01,
  amplitude: 30,
  spacing: 10,
  weight: 1,
  alpha: 1,
  seed: 0,
  zoom: 1,
  visible: true,
};

describe('lineOffset', () => {
  it('returns 0 when noise is exactly 0.5 (neutral), regardless of amplitude', () => {
    const neutralNoise: NoiseFn = () => 0.5;
    expect(lineOffset(baseLayer, 100, 100, neutralNoise)).toBe(0);
    expect(lineOffset({ ...baseLayer, amplitude: 999 }, 100, 100, neutralNoise)).toBe(0);
  });

  it('returns +amplitude when noise is 1', () => {
    const maxNoise: NoiseFn = () => 1;
    expect(lineOffset(baseLayer, 100, 100, maxNoise)).toBe(30);
  });

  it('returns -amplitude when noise is 0', () => {
    const minNoise: NoiseFn = () => 0;
    expect(lineOffset(baseLayer, 100, 100, minNoise)).toBe(-30);
  });

  it('passes noise-scaled coordinates and the layer seed to the noise function', () => {
    let received: [number, number, number] | null = null;
    const spyNoise: NoiseFn = (x, y, z) => {
      received = [x, y, z];
      return 0.5;
    };
    lineOffset({ ...baseLayer, noiseScale: 0.02, seed: 7 }, 50, 200, spyNoise);
    expect(received).toEqual([1, 4, 7]);
  });

  it('divides noiseScale by zoom before sampling the noise function', () => {
    let receivedA: [number, number, number] | null = null;
    const spyA: NoiseFn = (x, y, z) => {
      receivedA = [x, y, z];
      return 0.5;
    };
    lineOffset({ ...baseLayer, noiseScale: 0.02, zoom: 2 }, 50, 200, spyA);

    let receivedB: [number, number, number] | null = null;
    const spyB: NoiseFn = (x, y, z) => {
      receivedB = [x, y, z];
      return 0.5;
    };
    lineOffset({ ...baseLayer, noiseScale: 0.01, zoom: 1 }, 50, 200, spyB);

    expect(receivedA).toEqual(receivedB);
  });

  it('treats zoom: 0 as zoom: 1 (no divide-by-zero, finite result)', () => {
    const realNoise: NoiseFn = () => 0.5;
    const result = lineOffset({ ...baseLayer, zoom: 0 }, 50, 200, realNoise);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBe(0);

    const nonNeutralNoise: NoiseFn = () => 1;
    const resultZoomZero = lineOffset({ ...baseLayer, zoom: 0 }, 50, 200, nonNeutralNoise);
    const resultZoomOne = lineOffset({ ...baseLayer, zoom: 1 }, 50, 200, nonNeutralNoise);
    expect(Number.isFinite(resultZoomZero)).toBe(true);
    expect(resultZoomZero).toBe(resultZoomOne);
  });
});
