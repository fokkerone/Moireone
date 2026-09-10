import type { LayerParams, NoiseFn, Point } from './types';
import { macroShapeOffset } from './macroShape';

const STEP_LENGTH = 4;

// Spatial frequency of the noise used for the optional per-layer texture
// displacement. Previously exposed as adjustable `noiseScale` / `zoom`
// layer params; those controls were removed and this fixed value (the old
// default) is used instead.
const TEXTURE_NOISE_SCALE = 0.001;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function isInsideCanvas(point: Point, width: number, height: number): boolean {
  return point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height;
}

export function generateLayerLines(
  layer: LayerParams,
  width: number,
  height: number,
  noise: NoiseFn
): Point[][] {
  const diagonal = Math.sqrt(width * width + height * height);

  // Generate the line field over twice the canvas area (in both x and y) so
  // a layer can be dragged far via offsetX/offsetY without exposing empty
  // edges. `reach` is the diagonal of that 2x-canvas box (= 2 * diagonal),
  // used as the half-length along the travel axis and the half-width across
  // it; everything outside the real canvas is clipped by isInsideCanvas.
  const reach = 2 * diagonal;

  const travelAngle = toRadians(layer.baseAngle);
  const travelX = Math.cos(travelAngle);
  const travelY = Math.sin(travelAngle);

  const perpAngle = toRadians(layer.baseAngle + 90);
  const perpX = Math.cos(perpAngle);
  const perpY = Math.sin(perpAngle);

  const centerX = width / 2 + layer.offsetX;
  const centerY = height / 2 + layer.offsetY;

  // Start well behind the canvas along the travel axis, symmetric to the
  // old spine-start construction, so every line spans the full canvas
  // regardless of baseAngle.
  const startX = centerX - travelX * reach;
  const startY = centerY - travelY * reach;

  const numSteps = Math.ceil((2 * reach) / STEP_LENGTH);

  // Precompute the base (undisplaced) travel-line point and the shared
  // perpendicular displacement ONCE per step -- every parallel line reads
  // from these same arrays, which is what guarantees exact parallelism.
  const baseXs = new Array<number>(numSteps);
  const baseYs = new Array<number>(numSteps);
  const displacements = new Array<number>(numSteps);
  for (let s = 0; s < numSteps; s++) {
    const bx = startX + travelX * STEP_LENGTH * s;
    const by = startY + travelY * STEP_LENGTH * s;
    baseXs[s] = bx;
    baseYs[s] = by;
    const distanceFromCenter = Math.abs(s * STEP_LENGTH - reach);
    const macroOffset = macroShapeOffset(layer.macroShape, distanceFromCenter, layer.macroRadius, layer.amplitude);
    const textureOffset = layer.textureAmplitude > 0
      ? layer.textureAmplitude * (noise(bx * TEXTURE_NOISE_SCALE, by * TEXTURE_NOISE_SCALE, layer.seed) - 0.5) * 2
      : 0;
    displacements[s] = macroOffset + textureOffset;
  }

  const halfCount = Math.ceil(reach / layer.spacing);
  const lines: Point[][] = [];

  for (let i = -halfCount; i <= halfCount; i++) {
    const constantOffset = i * layer.spacing;
    let currentSegment: Point[] = [];

    for (let s = 0; s < numSteps; s++) {
      const totalOffset = displacements[s] + constantOffset;
      const point: Point = {
        x: baseXs[s] + perpX * totalOffset,
        y: baseYs[s] + perpY * totalOffset,
      };

      if (isInsideCanvas(point, width, height)) {
        currentSegment.push(point);
      } else if (currentSegment.length > 1) {
        lines.push(currentSegment);
        currentSegment = [];
      } else {
        currentSegment = [];
      }
    }

    if (currentSegment.length > 1) {
      lines.push(currentSegment);
    }
  }

  return lines;
}
