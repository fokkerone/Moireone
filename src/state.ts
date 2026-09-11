import type { LayerParams, PatternState } from './types';
import { getDefaultLayerColor, getDefaultLayerColorEnd } from './palette';
import { DEFAULT_CANVAS_SIZE_ID } from './canvasSize';

export const MIN_LAYERS = 2;
export const MAX_LAYERS = 5;

export function createDefaultLayer(index: number): LayerParams {
  return {
    fillMode: 'gradient',
    solidColor: getDefaultLayerColor(index),
    colorStops: [
      { id: `${index}-stop-0`, position: 0, color: getDefaultLayerColor(index) },
      { id: `${index}-stop-1`, position: 1, color: getDefaultLayerColorEnd(index) },
    ],
    gradientAngle: 90,
    gradientType: 'linear',
    baseAngle: (index * 25) % 360,
    amplitude: 300,
    spacing: 14,
    weight: 1.5,
    alpha: 0.6,
    seed: index * 100,
    visible: true,
    offsetX: 0,
    offsetY: 0,
    widthCurveEnabled: false,
    widthCurveShape: 'linear',
    widthStart: 1,
    widthCenter: 4,
    widthEnd: 1,
    widthMode: 'alongLine',
    widthCenterX: 0,
    widthCenterY: 0,
    widthRadius: 400,
    widthAngle: 0,
    macroShape: 'smooth',
    macroRadius: 800,
    textureAmplitude: 0,
    animationPaused: false,
    widthImageEnabled: false,
    widthImageInvert: false,
    widthImageStrength: 1,
    widthImageData: null,
    fieldPoleDistance: 200,
    fieldStrength: 0.6,
    fieldLineCount: 24,
    radialOvality: 1,
    radialTwist: 0.5,
  };
}

export function createDefaultState(): PatternState {
  return {
    backgroundFillMode: 'solid',
    backgroundSolidColor: '#000000',
    backgroundColorStops: [
      { id: 'bg-stop-0', position: 0, color: '#000000' },
      { id: 'bg-stop-1', position: 1, color: '#000000' },
    ],
    backgroundGradientAngle: 90,
    backgroundGradientType: 'linear',
    layers: [createDefaultLayer(0), createDefaultLayer(1)],
    animationPlaying: false,
    animationSpeed: 1,
    orientation: 'landscape',
    canvasSizeId: DEFAULT_CANVAS_SIZE_ID,
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
