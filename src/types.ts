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
  macroShape: 'circle' | 'parabola' | 'smooth' | 'fieldLines' | 'radial' | 'rings';
  macroRadius: number;
  textureAmplitude: number;
  animationPaused: boolean;
  // 'fieldLines' macro shape: two-pole (dipole) field-line tracing.
  fieldPoleDistance: number;
  fieldStrength: number;
  fieldLineCount: number;
  // 'radial' macro shape: spiral rays growing outward from the layer
  // center (offsetX/offsetY), squashed into an oval and twisted with radius.
  // 'rings' macro shape: concentric circle/oval outlines of growing radius
  // around the same center; reuses radialOvality for the oval squash and
  // `spacing` (the global "Abstand" slider) for the radius step between rings.
  radialOvality: number;
  radialTwist: number;
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
}
