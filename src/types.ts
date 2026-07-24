export interface Point {
  x: number;
  y: number;
}

export type NoiseFn = (x: number, y: number, z: number) => number;

export interface LayerParams {
  colorStart: string;
  colorEnd: string;
  gradientAngle: number;
  baseAngle: number;
  noiseScale: number;
  amplitude: number;
  spacing: number;
  weight: number;
  alpha: number;
  seed: number;
  zoom: number;
  visible: boolean;
  offsetX: number;
  offsetY: number;
}

export interface PatternState {
  background: string;
  layers: LayerParams[];
}
