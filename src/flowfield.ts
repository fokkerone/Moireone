import type { LayerParams, NoiseFn } from './types';

export function lineOffset(layer: LayerParams, x: number, y: number, noise: NoiseFn): number {
  const safeZoom = layer.zoom === 0 ? 1 : layer.zoom;
  const effectiveScale = layer.noiseScale / safeZoom;
  const n = noise(x * effectiveScale, y * effectiveScale, layer.seed);
  return layer.amplitude * (n - 0.5) * 2;
}
