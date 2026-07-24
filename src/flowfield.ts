import type { LayerParams, NoiseFn } from './types';

export function fieldAngle(
  layer: LayerParams,
  x: number,
  y: number,
  noise: NoiseFn
): number {
  const n = noise(x * layer.noiseScale, y * layer.noiseScale, layer.seed);
  const deviationDegrees = (n - 0.5) * 2 * layer.noiseStrength;
  return layer.baseAngle + deviationDegrees;
}
