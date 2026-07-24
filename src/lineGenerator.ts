import type { LayerParams, NoiseFn, Point } from './types';
import { fieldAngle } from './flowfield';

const STEP_LENGTH = 4;
const MAX_STEPS = 2000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function isInsideCanvas(point: Point, width: number, height: number): boolean {
  return point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height;
}

interface Vector {
  dx: number;
  dy: number;
}

function traceSpineMovements(
  layer: LayerParams,
  startX: number,
  startY: number,
  noise: NoiseFn
): Vector[] {
  const movements: Vector[] = [];
  let x = startX;
  let y = startY;

  for (let step = 0; step < MAX_STEPS; step++) {
    const angle = toRadians(fieldAngle(layer, x, y, noise));
    const dx = Math.cos(angle) * STEP_LENGTH;
    const dy = Math.sin(angle) * STEP_LENGTH;
    movements.push({ dx, dy });
    x += dx;
    y += dy;
  }

  return movements;
}

function traceLineFromMovements(
  startX: number,
  startY: number,
  movements: Vector[],
  width: number,
  height: number
): Point[][] {
  const segments: Point[][] = [];
  let currentSegment: Point[] = [];
  let x = startX;
  let y = startY;

  for (const { dx, dy } of movements) {
    if (isInsideCanvas({ x, y }, width, height)) {
      currentSegment.push({ x, y });
    } else if (currentSegment.length > 1) {
      segments.push(currentSegment);
      currentSegment = [];
    } else {
      currentSegment = [];
    }
    x += dx;
    y += dy;
  }

  if (currentSegment.length > 1) {
    segments.push(currentSegment);
  }

  return segments;
}

export function generateLayerLines(
  layer: LayerParams,
  width: number,
  height: number,
  noise: NoiseFn
): Point[][] {
  const diagonal = Math.sqrt(width * width + height * height);
  const perpendicularAngle = toRadians(layer.baseAngle + 90);
  const perpX = Math.cos(perpendicularAngle);
  const perpY = Math.sin(perpendicularAngle);
  const centerX = width / 2;
  const centerY = height / 2;
  const travelAngle = toRadians(layer.baseAngle);
  const backX = -Math.cos(travelAngle);
  const backY = -Math.sin(travelAngle);

  const spineStartX = centerX + backX * diagonal;
  const spineStartY = centerY + backY * diagonal;
  const movements = traceSpineMovements(layer, spineStartX, spineStartY, noise);

  const lines: Point[][] = [];
  const halfCount = Math.ceil(diagonal / layer.spacing / 2);

  for (let i = -halfCount; i <= halfCount; i++) {
    const offset = i * layer.spacing;
    const startX = spineStartX + perpX * offset;
    const startY = spineStartY + perpY * offset;

    const segments = traceLineFromMovements(startX, startY, movements, width, height);
    lines.push(...segments);
  }

  return lines;
}
