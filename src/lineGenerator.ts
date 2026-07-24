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

  const lines: Point[][] = [];
  const halfCount = Math.ceil(diagonal / layer.spacing / 2);

  for (let i = -halfCount; i <= halfCount; i++) {
    const offset = i * layer.spacing;
    const startX = centerX + perpX * offset + backX * diagonal;
    const startY = centerY + perpY * offset + backY * diagonal;

    let points: Point[] = [];
    let x = startX;
    let y = startY;
    let steps = 0;
    let hasEnteredCanvas = false;

    while (steps < MAX_STEPS) {
      const inside = isInsideCanvas({ x, y }, width, height);
      if (inside) {
        hasEnteredCanvas = true;
        points.push({ x, y });
      } else if (hasEnteredCanvas) {
        // The walk has left the canvas after previously being inside it.
        // Complete the current segment (if it has enough points to be a
        // line) and start accumulating a fresh segment in case the flow
        // field curves the walk back into the canvas later.
        if (points.length > 1) {
          lines.push(points);
        }
        points = [];
        hasEnteredCanvas = false;
      }

      const angle = toRadians(fieldAngle(layer, x, y, noise));
      x += Math.cos(angle) * STEP_LENGTH;
      y += Math.sin(angle) * STEP_LENGTH;
      steps++;
    }

    if (points.length > 1) {
      lines.push(points);
    }
  }

  return lines;
}
