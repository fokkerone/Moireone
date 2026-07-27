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

export function widthAt3(
  t: number,
  shape: WidthCurveShape,
  startValue: number,
  centerValue: number,
  endValue: number
): number {
  const clampedT = Math.min(1, Math.max(0, t));
  if (clampedT <= 0.5) {
    const localT = clampedT / 0.5;
    const factor = shape === 'parabola' ? localT * localT : localT;
    return startValue + (centerValue - startValue) * factor;
  }
  const localT = (clampedT - 0.5) / 0.5;
  const factor = shape === 'parabola' ? localT * localT : localT;
  return centerValue + (endValue - centerValue) * factor;
}
