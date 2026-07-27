import { describe, it, expect } from 'vitest';
import { widthAt, widthAt3 } from './widthProfile';

describe('widthAt', () => {
  it('returns widthMax at the center (t=0.5) for linear', () => {
    expect(widthAt(0.5, 'linear', 1, 5)).toBe(5);
  });

  it('returns widthMin at both ends (t=0 and t=1) for linear', () => {
    expect(widthAt(0, 'linear', 1, 5)).toBe(1);
    expect(widthAt(1, 'linear', 1, 5)).toBe(1);
  });

  it('returns 3 at t=0.25 for linear (halfway between center and edge)', () => {
    expect(widthAt(0.25, 'linear', 1, 5)).toBe(3);
  });

  it('returns 4 at t=0.25 for parabola, distinguishing it from linear at the same point', () => {
    const parabolaWidth = widthAt(0.25, 'parabola', 1, 5);
    const linearWidth = widthAt(0.25, 'linear', 1, 5);
    expect(parabolaWidth).toBe(4);
    expect(parabolaWidth).toBeGreaterThan(linearWidth);
  });

  it('never returns a value outside [widthMin, widthMax] for any t in [0,1]', () => {
    const widthMin = 1;
    const widthMax = 5;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const linearWidth = widthAt(t, 'linear', widthMin, widthMax);
      const parabolaWidth = widthAt(t, 'parabola', widthMin, widthMax);
      expect(linearWidth).toBeGreaterThanOrEqual(widthMin);
      expect(linearWidth).toBeLessThanOrEqual(widthMax);
      expect(parabolaWidth).toBeGreaterThanOrEqual(widthMin);
      expect(parabolaWidth).toBeLessThanOrEqual(widthMax);
    }
  });
});

describe('widthAt3', () => {
  it('returns exactly startValue at t=0, centerValue at t=0.5, endValue at t=1, for both shapes', () => {
    for (const shape of ['linear', 'parabola'] as const) {
      expect(widthAt3(0, shape, 2, 6, 10)).toBe(2);
      expect(widthAt3(0.5, shape, 2, 6, 10)).toBe(6);
      expect(widthAt3(1, shape, 2, 6, 10)).toBe(10);
    }
  });

  it('is backward-compatible with widthAt for the "linear" shape at every t, when startValue === endValue', () => {
    const cases: Array<[number, number, number]> = [
      [1, 5, 0],
      [1, 5, 0.1],
      [1, 5, 0.25],
      [1, 5, 0.4],
      [1, 5, 0.5],
      [1, 5, 0.6],
      [1, 5, 0.75],
      [1, 5, 0.9],
      [1, 5, 1],
      [0, 10, 0.9],
      [2, 8, 0.1],
    ];
    for (const [min, max, t] of cases) {
      expect(widthAt3(t, 'linear', min, max, min)).toBeCloseTo(widthAt(t, 'linear', min, max), 10);
    }
  });

  it('is backward-compatible with widthAt for the "parabola" shape at the boundary points and the whole second half (t >= 0.5)', () => {
    // NOTE: for 'parabola', widthAt3 only reproduces the old widthAt exactly
    // at t=0, t=0.5, t=1, and everywhere in the second half (t >= 0.5). In
    // the first half (t < 0.5) the two formulas diverge -- e.g. at t=0.25
    // with min=1, max=5, widthAt gives 4 but widthAt3(t, shape, min, max, min)
    // gives 2. This is an intentional consequence of the exact widthAt3
    // formula mandated for this task; see the follow-up assertion below that
    // documents (not hides) the first-half divergence.
    const cases: Array<[number, number, number]> = [
      [1, 5, 0],
      [1, 5, 0.5],
      [1, 5, 0.6],
      [1, 5, 0.75],
      [1, 5, 0.9],
      [1, 5, 1],
      [2, 8, 0.65],
    ];
    for (const [min, max, t] of cases) {
      expect(widthAt3(t, 'parabola', min, max, min)).toBeCloseTo(widthAt(t, 'parabola', min, max), 10);
    }
  });

  it('documents that "parabola" widthAt3 and widthAt diverge in the first half (t < 0.5) even when startValue === endValue', () => {
    // This is a known, intentional divergence (see comment above) coming
    // from the exact widthAt3 formula specified for this task -- it is not
    // a bug in this test. Migrating an existing 'parabola'-shaped layer to
    // widthStart = widthEnd = oldMin, widthCenter = oldMax will visibly
    // change the rendered width in the first half of each line/segment.
    const old = widthAt(0.25, 'parabola', 1, 5);
    const next = widthAt3(0.25, 'parabola', 1, 5, 1);
    expect(old).toBe(4);
    expect(next).toBe(2);
    expect(next).not.toBe(old);
  });

  it('supports a genuine monotonic ramp (start !== end), not clamped to old min/max semantics', () => {
    // start=2, center=6, end=10: strictly increasing, not a symmetric tent.
    const atQuarter = widthAt3(0.25, 'linear', 2, 6, 10);
    const atThreeQuarter = widthAt3(0.75, 'linear', 2, 6, 10);
    expect(atQuarter).toBeGreaterThan(2);
    expect(atQuarter).toBeLessThan(6);
    expect(atThreeQuarter).toBeGreaterThan(6);
    expect(atThreeQuarter).toBeLessThan(10);
    // Hand-computed exact values for linear shape:
    // t=0.25 -> localT = 0.25/0.5 = 0.5 -> 2 + (6-2)*0.5 = 4
    expect(atQuarter).toBe(4);
    // t=0.75 -> localT = (0.75-0.5)/0.5 = 0.5 -> 6 + (10-6)*0.5 = 8
    expect(atThreeQuarter).toBe(8);

    // Hand-computed exact value for parabola shape at t=0.25:
    // localT = 0.5, factor = 0.5^2 = 0.25 -> 2 + (6-2)*0.25 = 3
    expect(widthAt3(0.25, 'parabola', 2, 6, 10)).toBe(3);
  });

  it('never returns a value outside [min(start,center,end), max(start,center,end)] for any t in [0,1]', () => {
    const start = 2;
    const center = 6;
    const end = 10;
    const lo = Math.min(start, center, end);
    const hi = Math.max(start, center, end);
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const linearWidth = widthAt3(t, 'linear', start, center, end);
      const parabolaWidth = widthAt3(t, 'parabola', start, center, end);
      expect(linearWidth).toBeGreaterThanOrEqual(lo);
      expect(linearWidth).toBeLessThanOrEqual(hi);
      expect(parabolaWidth).toBeGreaterThanOrEqual(lo);
      expect(parabolaWidth).toBeLessThanOrEqual(hi);
    }
  });
});
