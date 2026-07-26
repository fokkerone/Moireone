import type { LayerParams } from './types';

export const ANIMATABLE_RANGES = {
  baseAngle: { min: 0, max: 360 },
  amplitude: { min: 0, max: 1400 },
  noiseScale: { min: 0.0002, max: 0.05 },
  zoom: { min: -50, max: 50 },
} as const;

export type AnimatableField = keyof typeof ANIMATABLE_RANGES;

const BASE_PERIOD_MS = 20000;

const FIELD_PHASE_OFFSETS: Record<AnimatableField, number> = {
  baseAngle: 0,
  amplitude: Math.PI / 2,
  noiseScale: Math.PI,
  zoom: (3 * Math.PI) / 2,
};

function oscillate(
  elapsedMs: number,
  speed: number,
  fieldPhase: number,
  seedPhase: number,
  min: number,
  max: number
): number {
  const angularFrequency = (2 * Math.PI) / BASE_PERIOD_MS;
  const wave = Math.sin(angularFrequency * elapsedMs * speed + fieldPhase + seedPhase);
  return min + (max - min) * (0.5 + 0.5 * wave);
}

export function computeAnimatedValues(
  layer: LayerParams,
  elapsedMs: number,
  speed: number
): Pick<LayerParams, AnimatableField> {
  const seedPhase = (layer.seed % 360) * (Math.PI / 180);

  const result = {} as Pick<LayerParams, AnimatableField>;
  for (const field of Object.keys(ANIMATABLE_RANGES) as AnimatableField[]) {
    const { min, max } = ANIMATABLE_RANGES[field];
    result[field] = oscillate(elapsedMs, speed, FIELD_PHASE_OFFSETS[field], seedPhase, min, max);
  }
  return result;
}
