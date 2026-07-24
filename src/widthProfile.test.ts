import { describe, it, expect } from 'vitest';
import { widthAt } from './widthProfile';

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
