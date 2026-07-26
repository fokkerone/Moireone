import { describe, it, expect } from 'vitest';
import { macroShapeOffset } from './macroShape';
import type { MacroShape } from './macroShape';

const SHAPES: MacroShape[] = ['circle', 'parabola', 'smooth'];

describe('macroShapeOffset', () => {
  it('returns exactly amplitude at distance=0 for every shape', () => {
    expect(macroShapeOffset('circle', 0, 100, 50)).toBe(50);
    expect(macroShapeOffset('parabola', 0, 100, 50)).toBe(50);
    expect(macroShapeOffset('smooth', 0, 100, 50)).toBe(50);
  });

  it('returns exactly 0 at distance=radius for circle and parabola, ~0 for smooth', () => {
    expect(macroShapeOffset('circle', 100, 100, 50)).toBe(0);
    expect(macroShapeOffset('parabola', 100, 100, 50)).toBe(0);
    expect(macroShapeOffset('smooth', 100, 100, 50)).toBeCloseTo(0, 9);
  });

  it('returns exactly 0 beyond the radius for every shape (clamped)', () => {
    for (const shape of SHAPES) {
      expect(macroShapeOffset(shape, 150, 100, 50)).toBe(0);
      expect(macroShapeOffset(shape, 1000, 100, 50)).toBe(0);
    }
  });

  it('computes the exact expected value at the midpoint (distance = radius/2) for each shape', () => {
    const amplitude = 50;
    const radius = 100;
    const distance = radius / 2;

    const circle = macroShapeOffset('circle', distance, radius, amplitude);
    const parabola = macroShapeOffset('parabola', distance, radius, amplitude);
    const smooth = macroShapeOffset('smooth', distance, radius, amplitude);

    expect(circle).toBeCloseTo(amplitude * Math.sqrt(0.75), 9);
    expect(parabola).toBeCloseTo(amplitude * 0.75, 9);
    expect(smooth).toBeCloseTo(amplitude * 0.5, 9);

    // Genuine numeric distinguishing test between the three shapes at the
    // midpoint, not just "they're different".
    expect(circle).toBeGreaterThan(parabola);
    expect(parabola).toBeGreaterThan(smooth);
  });

  it('returns 0 for radius <= 0 regardless of distance/amplitude, without NaN/Infinity', () => {
    for (const shape of SHAPES) {
      expect(macroShapeOffset(shape, 0, 0, 50)).toBe(0);
      expect(macroShapeOffset(shape, 50, 0, 50)).toBe(0);
      expect(macroShapeOffset(shape, 50, -100, 50)).toBe(0);
      expect(macroShapeOffset(shape, 0, -1, 999)).toBe(0);

      const result = macroShapeOffset(shape, 50, -10, 50);
      expect(Number.isNaN(result)).toBe(false);
      expect(Number.isFinite(result)).toBe(true);
    }
  });

  it('is monotonically non-increasing as distance increases from 0 to radius', () => {
    const amplitude = 50;
    const radius = 100;
    const samples = [0, radius * 0.25, radius * 0.5, radius * 0.75, radius];

    for (const shape of SHAPES) {
      let previous = macroShapeOffset(shape, samples[0], radius, amplitude);
      for (let i = 1; i < samples.length; i++) {
        const current = macroShapeOffset(shape, samples[i], radius, amplitude);
        expect(current).toBeLessThanOrEqual(previous + 1e-9);
        previous = current;
      }
    }
  });
});
