import { describe, it, expect } from 'vitest';
import { getCanvasSize } from './canvasSize';

describe('getCanvasSize', () => {
  it('returns exact landscape dimensions', () => {
    expect(getCanvasSize('landscape')).toEqual({ width: 1600, height: 1000 });
  });

  it('returns exact portrait dimensions (landscape transposed)', () => {
    expect(getCanvasSize('portrait')).toEqual({ width: 1000, height: 1600 });
  });

  it('produces landscape and portrait sizes that are structural transposes of each other', () => {
    const landscape = getCanvasSize('landscape');
    const portrait = getCanvasSize('portrait');

    expect(landscape.width).toBe(portrait.height);
    expect(landscape.height).toBe(portrait.width);
  });
});
