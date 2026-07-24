import type { LayerParams, NoiseFn } from './types';

export function fieldAngle(
  layer: LayerParams,
  x: number,
  y: number,
  noise: NoiseFn
): number {
  const effectiveScale = layer.noiseScale / layer.zoom;
  const n = noise(x * effectiveScale, y * effectiveScale, layer.seed);
  const deviationDegrees = (n - 0.5) * 2 * layer.noiseStrength;
  return layer.baseAngle + deviationDegrees;
}
