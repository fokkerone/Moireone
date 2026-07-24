import type { LayerParams, NoiseFn, Point } from './types';
import { lineOffset } from './flowfield';

const STEP_LENGTH = 4;

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
  const startX = centerX - travelX * diagonal;
  const startY = centerY - travelY * diagonal;

  const numSteps = Math.ceil((2 * diagonal) / STEP_LENGTH);

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
    displacements[s] = lineOffset(layer, bx, by, noise);
  }

  const halfCount = Math.ceil(diagonal / layer.spacing / 2);
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
