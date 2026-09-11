import type { Orientation } from './canvasSize';

export type { Orientation };

export interface Point {
  x: number;
  y: number;
}

export type NoiseFn = (x: number, y: number, z: number) => number;

export interface ColorStop {
  id: string;
  position: number; // 0 to 1
  color: string;
}

export type GradientType = 'linear' | 'radial';

export interface LayerParams {
  fillMode: 'solid' | 'gradient';
  solidColor: string;
  colorStops: ColorStop[];
  gradientAngle: number;
  gradientType: GradientType;
  baseAngle: number;
  amplitude: number;
  spacing: number;
  weight: number;
  alpha: number;
  seed: number;
  visible: boolean;
  offsetX: number;
  offsetY: number;
  widthCurveEnabled: boolean;
  widthCurveShape: 'linear' | 'parabola';
  widthStart: number;
  widthCenter: number;
  widthEnd: number;
  widthMode: 'alongLine' | 'byPosition' | 'byAngle';
  widthCenterX: number;
  widthCenterY: number;
  widthRadius: number;
  widthAngle: number;
  macroShape: 'circle' | 'parabola' | 'smooth';
  macroRadius: number;
  textureAmplitude: number;
  animationPaused: boolean;
  widthImageEnabled: boolean;
  widthImageInvert: boolean;
  widthImageStrength: number;
  widthImageData: { width: number; height: number; luminance: Float32Array } | null;
}

export interface PatternState {
  backgroundFillMode: 'solid' | 'gradient';
  backgroundSolidColor: string;
  backgroundColorStops: ColorStop[];
  backgroundGradientAngle: number;
  backgroundGradientType: GradientType;
  layers: LayerParams[];
  animationPlaying: boolean;
  animationSpeed: number;
  orientation: Orientation;
  /** Id of the selected preset from `CANVAS_SIZE_PRESETS` (canvasSize.ts). */
  canvasSizeId: string;
}
