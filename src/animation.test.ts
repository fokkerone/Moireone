import { describe, it, expect } from 'vitest';
import { computeAnimatedValues, ANIMATABLE_RANGES } from './animation';
import type { LayerParams } from './types';

function makeLayer(overrides: Partial<LayerParams> = {}): LayerParams {
  return {
    fillMode: 'gradient',
    solidColor: '#000000',
    colorStops: [
      { id: 's0', position: 0, color: '#000000' },
      { id: 's1', position: 1, color: '#ffffff' },
    ],
    gradientAngle: 90, gradientType: 'linear',
    baseAngle: 0,
    noiseScale: 0.001,
    amplitude: 300,
    spacing: 14,
    weight: 1.5,
    alpha: 0.6,
    seed: 0,
    zoom: 1,
    visible: true,
    offsetX: 0,
    offsetY: 0,
    widthCurveEnabled: false,
    widthCurveShape: 'linear',
    widthStart: 1,
    widthCenter: 4,
    widthEnd: 1,
    widthMode: 'alongLine',
    widthCenterX: 0,
    widthCenterY: 0,
    widthRadius: 400,
    widthAngle: 0,
    widthImageEnabled: false,
    widthImageInvert: false,
    widthImageStrength: 1,
    widthImageData: null,
    macroShape: 'smooth',
    macroRadius: 800,
    textureAmplitude: 0,
    animationPaused: false,
    ...overrides,
  };
}

describe('computeAnimatedValues', () => {
  it('computes exact hand-calculated values at elapsedMs=0, seed=0', () => {
    const layer = makeLayer({ seed: 0 });
    const result = computeAnimatedValues(layer, 0, 1);

    // baseAngle: phase 0 -> wave = sin(0) = 0 -> midpoint of [0, 360] = 180
    expect(result.baseAngle).toBe(180);

    // amplitude: phase Math.PI/2 -> wave = sin(Math.PI/2) = 1 -> max = 1500
    expect(result.amplitude).toBeCloseTo(1500, 10);

    // noiseScale: phase Math.PI -> wave = sin(Math.PI) ~= 1.2246e-16 (not exactly 0)
    // result = min + (max-min)*(0.5 + 0.5*wave) ~= midpoint of [0.0002, 0.05]
    const { min: nsMin, max: nsMax } = ANIMATABLE_RANGES.noiseScale;
    const expectedNoiseScale = nsMin + (nsMax - nsMin) * (0.5 + 0.5 * Math.sin(Math.PI));
    expect(result.noiseScale).toBeCloseTo(expectedNoiseScale, 10);
    // also close to the true midpoint given how tiny the epsilon is
    expect(result.noiseScale).toBeCloseTo((nsMin + nsMax) / 2, 6);

    // zoom: phase 3*Math.PI/2 -> wave = sin(3*Math.PI/2) = -1 -> min = -50
    expect(result.zoom).toBeCloseTo(-50, 10);
  });

  it('stays within [min, max] inclusive for every field across many elapsed times and speeds', () => {
    const layer = makeLayer({ seed: 42 });
    const elapsedSamples = [0, 1000, 5000, 10000, 20000, 50000];
    const speedSamples = [1, 2.5];

    for (const speed of speedSamples) {
      for (const elapsedMs of elapsedSamples) {
        const result = computeAnimatedValues(layer, elapsedMs, speed);
        for (const field of Object.keys(ANIMATABLE_RANGES) as (keyof typeof ANIMATABLE_RANGES)[]) {
          const { min, max } = ANIMATABLE_RANGES[field];
          const value = result[field];
          expect(value).toBeGreaterThanOrEqual(min);
          expect(value).toBeLessThanOrEqual(max);
        }
      }
    }
  });

  it('produces different values for layers with different seeds at the same elapsedMs/speed', () => {
    const layerA = makeLayer({ seed: 0 });
    const layerB = makeLayer({ seed: 100 });

    const resultA = computeAnimatedValues(layerA, 3000, 1);
    const resultB = computeAnimatedValues(layerB, 3000, 1);

    const fields = Object.keys(ANIMATABLE_RANGES) as (keyof typeof ANIMATABLE_RANGES)[];
    const meaningfullyDifferent = fields.some((field) => Math.abs(resultA[field] - resultB[field]) > 1e-6);
    expect(meaningfullyDifferent).toBe(true);
  });

  it('is a pure function: identical inputs produce identical outputs', () => {
    const layer = makeLayer({ seed: 7 });
    const resultA = computeAnimatedValues(layer, 12345, 1.75);
    const resultB = computeAnimatedValues(layer, 12345, 1.75);

    expect(resultA).toEqual(resultB);
  });
});
