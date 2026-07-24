export interface Point {
  x: number;
  y: number;
}

export type NoiseFn = (x: number, y: number, z: number) => number;

export interface LayerParams {
  color: string;
  baseAngle: number;
  noiseScale: number;
  noiseStrength: number;
  spacing: number;
  weight: number;
  alpha: number;
  seed: number;
  zoom: number;
  turnRate: number;
}

export interface PatternState {
  background: string;
  layers: LayerParams[];
}
