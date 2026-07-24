import { describe, it, expect } from 'vitest';
import { buildRibbon } from './ribbon';
import type { Point } from './types';

describe('buildRibbon', () => {
  it('offsets a horizontal line perpendicularly by half the constant width', () => {
    const line: Point[] = [
      { x: 0, y: 100 },
      { x: 10, y: 100 },
      { x: 20, y: 100 },
    ];
    const widths = [10, 10, 10];
    const ribbon = buildRibbon(line, widths);
    const upper = ribbon.slice(0, line.length);
    const lower = ribbon.slice(line.length).reverse();

    // For a horizontal line, the perpendicular direction is purely vertical.
    // With this implementation's sign convention (perpX = -dy/len, perpY =
    // dx/len), the "upper" array (added first, using +perp) lands at
    // y = 100 + 5 = 105, and the "lower" array (using -perp) lands at
    // y = 100 - 5 = 95 -- a full 10px apart (the ribbon width), split
    // evenly (5px) on each side of the original line, confirming both the
    // perpendicular direction and the magnitude of the offset are correct.
    for (const p of upper) {
      expect(p.y).toBeCloseTo(105, 9);
    }
    for (const p of lower) {
      expect(p.y).toBeCloseTo(95, 9);
    }
    expect(Math.abs(upper[0].y - lower[0].y)).toBeCloseTo(10, 9);
  });

  it('returns an array with length equal to 2 * line.length', () => {
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 0 },
    ];
    const widths = [4, 4, 4, 4];
    const ribbon = buildRibbon(line, widths);
    expect(ribbon.length).toBe(2 * line.length);
  });

  it('does not throw and produces finite coordinates for a 2-point line', () => {
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    const widths = [4, 4];
    expect(() => buildRibbon(line, widths)).not.toThrow();
    const ribbon = buildRibbon(line, widths);
    expect(ribbon.length).toBe(4);
    for (const p of ribbon) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });
});
