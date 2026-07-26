import type { LayerParams, PatternState } from './types';
import { getDefaultLayerColor, getDefaultLayerColorEnd } from './palette';

export const MIN_LAYERS = 2;
export const MAX_LAYERS = 5;

export function createDefaultLayer(index: number): LayerParams {
  return {
    colorStart: getDefaultLayerColor(index),
    colorEnd: getDefaultLayerColorEnd(index),
    gradientAngle: 90,
    baseAngle: (index * 25) % 360,
    noiseScale: 0.001,
    amplitude: 300,
    spacing: 14,
    weight: 1.5,
    alpha: 0.6,
    seed: index * 100,
    zoom: 1,
    visible: true,
    offsetX: 0,
    offsetY: 0,
    widthCurveEnabled: false,
    widthCurveShape: 'linear',
    widthMin: 1,
    widthMax: 4,
    widthMode: 'alongLine',
    widthCenterX: 0,
    widthCenterY: 0,
    widthRadius: 400,
    macroShape: 'smooth',
    macroRadius: 800,
    textureAmplitude: 0,
    animationPaused: false,
  };
}

export function createDefaultState(): PatternState {
  return {
    background: '#000000',
    layers: [createDefaultLayer(0), createDefaultLayer(1)],
    animationPlaying: false,
    animationSpeed: 1,
  };
}

export function duplicateLayer(state: PatternState, index: number): PatternState {
  if (state.layers.length >= MAX_LAYERS) {
    return state;
  }
  const layers = [...state.layers];
  const copy: LayerParams = { ...layers[index] };
  layers.splice(index + 1, 0, copy);
  return { ...state, layers };
}

export function removeLayer(state: PatternState, index: number): PatternState {
  if (state.layers.length <= MIN_LAYERS) {
    return state;
  }
  const layers = state.layers.filter((_, i) => i !== index);
  return { ...state, layers };
}

export function reorderLayers(state: PatternState, fromIndex: number, toIndex: number): PatternState {
  const layers = [...state.layers];
  const [moved] = layers.splice(fromIndex, 1);
  layers.splice(toIndex, 0, moved);
  return { ...state, layers };
}

export function setGlobalSpacing(state: PatternState, spacing: number): PatternState {
  return { ...state, layers: state.layers.map((layer) => ({ ...layer, spacing })) };
}

export function setGlobalWeight(state: PatternState, weight: number): PatternState {
  return { ...state, layers: state.layers.map((layer) => ({ ...layer, weight })) };
}
