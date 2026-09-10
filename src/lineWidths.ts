import type { LayerParams, Point } from './types';
import { widthAt3 } from './widthProfile';

function widthFromNormalizedT(layer: LayerParams, t: number): number {
  return widthAt3(t, layer.widthCurveShape, layer.widthStart, layer.widthCenter, layer.widthEnd);
}

const MIN_WIDTH = 0.1;

/**
 * Scale a base width (from the curve/widthMode system) by the layer's
 * reference-image brightness at a given canvas position, per the
 * image-reference-line-width spec:
 *
 * - No-op (returns baseWidth unchanged) when the layer has no image
 *   modulation enabled, or has no loaded image data yet.
 * - brightnessFactor: 1 = full width, 0 = fully reduced. Dark image regions
 *   map to factor 1 unless inverted.
 * - strength blends between "no effect" (scale 1) and "fully driven by the
 *   image" (scale = brightnessFactor).
 * - The result is clamped to a minimum width floor so lines never vanish.
 */
function applyImageScaling(
  baseWidth: number,
  point: Point,
  layer: LayerParams,
  canvasWidth: number,
  canvasHeight: number
): number {
  if (!layer.widthImageEnabled || !layer.widthImageData) {
    return baseWidth;
  }

  const luminance = sampleImageLuminance(layer.widthImageData, point.x, point.y, canvasWidth, canvasHeight);
  const brightnessFactor = layer.widthImageInvert ? luminance : 1 - luminance;
  const scale = 1 + (brightnessFactor - 1) * layer.widthImageStrength;

  return Math.max(MIN_WIDTH, baseWidth * scale);
}

/**
 * Per-line width profile for a ribbon.
 *
 * 'alongLine' varies continuously along each line's own length (unchanged).
 * 'byPosition'/'byAngle' instead evaluate a single reference point (the
 * line's midpoint) and apply that ONE resulting width to every vertex, so
 * each line stays a constant thickness along its length while different
 * lines (at different overall positions) still end up with different
 * thicknesses.
 */
export function computeLineWidths(
  line: Point[],
  layer: LayerParams,
  canvasWidth: number,
  canvasHeight: number
): number[] {
  if (layer.widthMode === 'byPosition' || layer.widthMode === 'byAngle') {
    const midPoint = line[Math.floor(line.length / 2)];
    let normalizedT: number;

    if (layer.widthMode === 'byPosition') {
      const centerX = canvasWidth / 2 + layer.widthCenterX;
      const centerY = canvasHeight / 2 + layer.widthCenterY;
      const dx = midPoint.x - centerX;
      const dy = midPoint.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const normalizedDistance = Math.min(1, distance / layer.widthRadius);
      normalizedT = 0.5 + normalizedDistance * 0.5;
    } else {
      const angleRad = (layer.widthAngle * Math.PI) / 180;
      const axisX = Math.cos(angleRad);
      const axisY = Math.sin(angleRad);
      const originX = canvasWidth / 2 + layer.widthCenterX;
      const originY = canvasHeight / 2 + layer.widthCenterY;
      const dx = midPoint.x - originX;
      const dy = midPoint.y - originY;
      const signedDistance = dx * axisX + dy * axisY;
      normalizedT = 0.5 + Math.max(-0.5, Math.min(0.5, signedDistance / (2 * layer.widthRadius)));
    }

    const constantWidth = widthFromNormalizedT(layer, normalizedT);
    return line.map((point) => applyImageScaling(constantWidth, point, layer, canvasWidth, canvasHeight));
  }

  return line.map((point, i) =>
    applyImageScaling(
      widthFromNormalizedT(layer, i / (line.length - 1 || 1)),
      point,
      layer,
      canvasWidth,
      canvasHeight
    )
  );
}

/**
 * Sample a reference image's luminance at a canvas position, using "cover"
 * fit: the image is scaled uniformly (preserving aspect ratio) to fully
 * cover the canvas, centered, with overflow cropped. Returns the raw
 * luminance (0..1) at the nearest image pixel to the mapped position; does
 * NOT apply any invert flag (that's the caller's responsibility).
 *
 * The computed pixel index is clamped to the image's bounds so that
 * floating-point rounding at canvas edges can never index outside the
 * luminance array.
 */
export function sampleImageLuminance(
  imageData: { width: number; height: number; luminance: Float32Array },
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number
): number {
  const scale = Math.max(canvasWidth / imageData.width, canvasHeight / imageData.height);
  const scaledWidth = imageData.width * scale;
  const scaledHeight = imageData.height * scale;
  const offsetX = (canvasWidth - scaledWidth) / 2;
  const offsetY = (canvasHeight - scaledHeight) / 2;

  const imgX = (x - offsetX) / scale;
  const imgY = (y - offsetY) / scale;

  const col = Math.min(imageData.width - 1, Math.max(0, Math.floor(imgX)));
  const row = Math.min(imageData.height - 1, Math.max(0, Math.floor(imgY)));

  return imageData.luminance[row * imageData.width + col];
}
