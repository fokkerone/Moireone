export type Orientation = 'landscape' | 'portrait';

export const BASE_WIDTH = 1600;
export const BASE_HEIGHT = 1000;

export function getCanvasSize(orientation: Orientation): { width: number; height: number } {
  return orientation === 'landscape'
    ? { width: BASE_WIDTH, height: BASE_HEIGHT }
    : { width: BASE_HEIGHT, height: BASE_WIDTH };
}
