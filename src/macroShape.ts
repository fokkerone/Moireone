export type MacroShape = 'circle' | 'parabola' | 'smooth';

export function macroShapeOffset(
  shape: MacroShape,
  distance: number,
  radius: number,
  amplitude: number
): number {
  if (radius <= 0) {
    return 0;
  }
  const t = Math.min(1, Math.max(0, distance / radius));
  switch (shape) {
    case 'circle':
      return amplitude * Math.sqrt(Math.max(0, 1 - t * t));
    case 'parabola':
      return amplitude * Math.max(0, 1 - t * t);
    case 'smooth':
      return amplitude * ((Math.cos(Math.PI * t) + 1) / 2);
  }
}
