export type Orientation = 'landscape' | 'portrait';

export interface CanvasSizePreset {
  id: string;
  label: string;
  /** Portrait-native width in cm (the shorter side). */
  widthCm: number;
  /** Portrait-native height in cm (the longer side). */
  heightCm: number;
}

export const CANVAS_SIZE_PRESETS: CanvasSizePreset[] = [
  { id: '50x70', label: '50 × 70 cm', widthCm: 50, heightCm: 70 },
  { id: '60x90', label: '60 × 90 cm', widthCm: 60, heightCm: 90 },
  { id: '80x120', label: '80 × 120 cm', widthCm: 80, heightCm: 120 },
  { id: '120x160', label: '120 × 160 cm', widthCm: 120, heightCm: 160 },
];

export const DEFAULT_CANVAS_SIZE_ID = '80x120';

// Screen/export px per real-world cm. Arbitrary but fixed, so every preset
// keeps its correct real-world aspect ratio and relative scale to the
// others (a 120x160 canvas is always exactly 1.5x wider/taller than an
// 80x120 one, etc.).
export const PX_PER_CM = 10;

export function getCanvasSizePreset(sizeId: string): CanvasSizePreset {
  return CANVAS_SIZE_PRESETS.find((preset) => preset.id === sizeId) ?? CANVAS_SIZE_PRESETS[0];
}

export function getCanvasSize(
  sizeId: string,
  orientation: Orientation
): { width: number; height: number } {
  const preset = getCanvasSizePreset(sizeId);
  const portraitWidth = preset.widthCm * PX_PER_CM;
  const portraitHeight = preset.heightCm * PX_PER_CM;
  return orientation === 'landscape'
    ? { width: portraitHeight, height: portraitWidth }
    : { width: portraitWidth, height: portraitHeight };
}
