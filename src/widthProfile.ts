export type WidthCurveShape = 'linear' | 'parabola';

export function widthAt(
  t: number,
  shape: WidthCurveShape,
  widthMin: number,
  widthMax: number
): number {
  const distFromCenter = Math.min(1, Math.abs(t - 0.5) * 2);
  const factor = shape === 'parabola' ? distFromCenter * distFromCenter : distFromCenter;
  return widthMax - (widthMax - widthMin) * factor;
}
