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

// Walks a raw (unclipped) path and splits it into the in-canvas runs, using
// the same exit/re-entry segmenting rule as the parallel-line generator
// below: a run of 2+ in-canvas points becomes one line; anything shorter is
// dropped rather than kept as a degenerate 0-1 point "line".
function clipPathToCanvas(rawPoints: Point[], width: number, height: number): Point[][] {
  const lines: Point[][] = [];
  let segment: Point[] = [];
  for (const point of rawPoints) {
    if (isInsideCanvas(point, width, height)) {
      segment.push(point);
    } else if (segment.length > 1) {
      lines.push(segment);
      segment = [];
    } else {
      segment = [];
    }
  }
  if (segment.length > 1) {
    lines.push(segment);
  }
  return lines;
}

export function generateLayerLines(
  layer: LayerParams,
  width: number,
  height: number,
  noise: NoiseFn
): Point[][] {
  if (layer.macroShape === 'fieldLines') {
    return generateFieldLines(layer, width, height);
  }
  if (layer.macroShape === 'radial') {
    return generateRadialLines(layer, width, height);
  }

  const macroShape = layer.macroShape;
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
    const distanceFromCenter = Math.abs(s * STEP_LENGTH - diagonal);
    const macroOffset = macroShapeOffset(macroShape, distanceFromCenter, layer.macroRadius, layer.amplitude);
    const textureOffset = layer.textureAmplitude > 0
      ? layer.textureAmplitude * (noise(bx * TEXTURE_NOISE_SCALE, by * TEXTURE_NOISE_SCALE, layer.seed) - 0.5) * 2
      : 0;
    displacements[s] = macroOffset + textureOffset;
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

// --- Field Lines -----------------------------------------------------------
//
// Traces the field lines of a two-pole (dipole) point-charge field: a "+"
// pole and a "-" pole, `fieldPoleDistance` apart, centered at the layer's
// position (offsetX/offsetY) and oriented along baseAngle. Lines start on a
// small circle around the "+" pole and are integrated outward, step by
// step, following the local field direction until they either reach the
// "-" pole or run away past the generous tracing bounds.
//
// `fieldStrength` (0..1) blends each step's direction between a pure
// radial ray away from the "+" pole (strength 0 -- straight lines, same as
// ignoring the "-" pole) and the true dipole field direction (strength 1 --
// full curvature toward the "-" pole), the same lerp-by-strength idiom used
// by the width-image feature.
function generateFieldLines(layer: LayerParams, width: number, height: number): Point[][] {
  const rot = toRadians(layer.baseAngle);
  const axisX = Math.cos(rot);
  const axisY = Math.sin(rot);
  const centerX = width / 2 + layer.offsetX;
  const centerY = height / 2 + layer.offsetY;

  const poleDistance = Math.max(1, layer.fieldPoleDistance);
  const half = poleDistance / 2;
  const poleAx = centerX - axisX * half; // "+" pole -- lines originate here
  const poleAy = centerY - axisY * half;
  const poleBx = centerX + axisX * half; // "-" pole -- lines curve toward here
  const poleBy = centerY + axisY * half;

  const strength = Math.min(1, Math.max(0, layer.fieldStrength));
  const startRadius = Math.max(4, poleDistance * 0.08);
  const captureRadius = Math.max(2, poleDistance * 0.03);
  const lineCount = Math.max(6, Math.round((2 * Math.PI * startRadius) / Math.max(1, layer.spacing)));

  const diagonal = Math.sqrt(width * width + height * height);
  const maxSteps = Math.ceil((4 * diagonal) / STEP_LENGTH);
  const runawayLimit = 6 * Math.max(width, height);
  const minRadius = 1e-3;

  const lines: Point[][] = [];

  for (let i = 0; i < lineCount; i++) {
    const startAngle = (i / lineCount) * Math.PI * 2;
    let px = poleAx + Math.cos(startAngle) * startRadius;
    let py = poleAy + Math.sin(startAngle) * startRadius;
    const rawPoints: Point[] = [{ x: px, y: py }];

    for (let s = 0; s < maxSteps; s++) {
      const dAx = px - poleAx;
      const dAy = py - poleAy;
      const rA = Math.max(minRadius, Math.hypot(dAx, dAy));
      const dBx = px - poleBx;
      const dBy = py - poleBy;
      const rB = Math.max(minRadius, Math.hypot(dBx, dBy));

      // Dipole field direction: inverse-square contribution away from the
      // "+" pole minus the same from the "-" pole (only the direction of
      // the resultant vector is used, so its overall magnitude cancels out
      // in the normalize below).
      const fx = dAx / (rA * rA * rA) - dBx / (rB * rB * rB);
      const fy = dAy / (rA * rA * rA) - dBy / (rB * rB * rB);
      const fieldLen = Math.max(minRadius, Math.hypot(fx, fy));
      const trueDirX = fx / fieldLen;
      const trueDirY = fy / fieldLen;

      const radialDirX = dAx / rA;
      const radialDirY = dAy / rA;

      let dirX = radialDirX + (trueDirX - radialDirX) * strength;
      let dirY = radialDirY + (trueDirY - radialDirY) * strength;
      const dirLen = Math.max(minRadius, Math.hypot(dirX, dirY));
      dirX /= dirLen;
      dirY /= dirLen;

      px += dirX * STEP_LENGTH;
      py += dirY * STEP_LENGTH;
      rawPoints.push({ x: px, y: py });

      if (rB < captureRadius) {
        break;
      }
      if (Math.abs(px - centerX) > runawayLimit || Math.abs(py - centerY) > runawayLimit) {
        break;
      }
    }

    lines.push(...clipPathToCanvas(rawPoints, width, height));
  }

  return lines;
}

// --- Radial (spiral) --------------------------------------------------------
//
// Rays grow outward from the layer's center (offsetX/offsetY) with
// increasing radius, squashed into an oval (`radialOvality`, 1 = circular)
// and twisted so the angle drifts with radius (`radialTwist`) -- a linear
// transform of a straight ray would still be a straight line, so the twist
// is what makes each one an actual curve rather than a spoke.
function generateRadialLines(layer: LayerParams, width: number, height: number): Point[][] {
  const rot = toRadians(layer.baseAngle);
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  const centerX = width / 2 + layer.offsetX;
  const centerY = height / 2 + layer.offsetY;

  const diagonal = Math.sqrt(width * width + height * height);
  const reach = 2 * diagonal;
  const numSteps = Math.ceil(reach / STEP_LENGTH);

  const refRadius = Math.max(10, layer.macroRadius);
  const numSpokes = Math.max(8, Math.round((2 * Math.PI * refRadius) / Math.max(1, layer.spacing)));
  const ovality = Math.max(0.1, layer.radialOvality);
  const twist = layer.radialTwist;

  const lines: Point[][] = [];

  for (let i = 0; i < numSpokes; i++) {
    const baseAngle = (i / numSpokes) * Math.PI * 2;
    const rawPoints: Point[] = [];

    for (let s = 1; s <= numSteps; s++) {
      const r = s * STEP_LENGTH;
      const angle = baseAngle + twist * (r / refRadius);
      const lx = Math.cos(angle) * r;
      const ly = Math.sin(angle) * r * ovality;
      rawPoints.push({
        x: centerX + lx * cosR - ly * sinR,
        y: centerY + lx * sinR + ly * cosR,
      });
    }

    lines.push(...clipPathToCanvas(rawPoints, width, height));
  }

  return lines;
}
