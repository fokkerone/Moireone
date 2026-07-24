import type { LayerParams, PatternState } from './types';
import { getDefaultLayerColor } from './palette';

export const MIN_LAYERS = 2;
export const MAX_LAYERS = 5;

export function createDefaultLayer(index: number): LayerParams {
  return {
    color: getDefaultLayerColor(index),
    baseAngle: (index * 25) % 360,
    noiseScale: 0.01,
    noiseStrength: 20,
    spacing: 14,
    weight: 1.5,
    alpha: 0.6,
    seed: index * 100,
  };
}

export function createDefaultState(): PatternState {
  return {
    background: '#000000',
    layers: [createDefaultLayer(0), createDefaultLayer(1)],
  };
}

export function setLayerCount(state: PatternState, count: number): PatternState {
  const clamped = Math.min(MAX_LAYERS, Math.max(MIN_LAYERS, count));
  const layers = state.layers.slice(0, clamped);
  while (layers.length < clamped) {
    layers.push(createDefaultLayer(layers.length));
  }
  return { ...state, layers };
}
