import { describe, it, expect } from 'vitest';
import { CANVAS_SIZE_PRESETS, DEFAULT_CANVAS_SIZE_ID, PX_PER_CM, getCanvasSize, getCanvasSizePreset } from './canvasSize';

describe('getCanvasSize', () => {
  it('returns exact portrait dimensions for a known preset (cm * PX_PER_CM)', () => {
    expect(getCanvasSize('50x70', 'portrait')).toEqual({ width: 50 * PX_PER_CM, height: 70 * PX_PER_CM });
  });

  it('returns exact landscape dimensions (portrait transposed)', () => {
    expect(getCanvasSize('50x70', 'landscape')).toEqual({ width: 70 * PX_PER_CM, height: 50 * PX_PER_CM });
  });

  it('produces landscape and portrait sizes that are structural transposes of each other, for every preset', () => {
    for (const preset of CANVAS_SIZE_PRESETS) {
      const landscape = getCanvasSize(preset.id, 'landscape');
      const portrait = getCanvasSize(preset.id, 'portrait');
      expect(landscape.width).toBe(portrait.height);
      expect(landscape.height).toBe(portrait.width);
    }
  });

  it('falls back to the first preset for an unknown size id', () => {
    expect(getCanvasSize('does-not-exist', 'portrait')).toEqual(getCanvasSize(CANVAS_SIZE_PRESETS[0].id, 'portrait'));
  });

  it('has exactly the four requested presets, each wider portrait-native ratio-consistent', () => {
    const ids = CANVAS_SIZE_PRESETS.map((p) => `${p.widthCm}x${p.heightCm}`);
    expect(ids).toEqual(['50x70', '60x90', '80x120', '120x160']);
    for (const preset of CANVAS_SIZE_PRESETS) {
      expect(preset.widthCm).toBeLessThan(preset.heightCm);
    }
  });
});

describe('getCanvasSizePreset', () => {
  it('resolves the default size id to a real preset', () => {
    const preset = getCanvasSizePreset(DEFAULT_CANVAS_SIZE_ID);
    expect(preset.id).toBe(DEFAULT_CANVAS_SIZE_ID);
  });
});
