import type { LayerParams, Point } from './types';
import { widthAt3 } from './widthProfile';

function widthFromNormalizedT(layer: LayerParams, t: number): number {
  return widthAt3(t, layer.widthCurveShape, layer.widthStart, layer.widthCenter, layer.widthEnd);
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
    return line.map(() => constantWidth);
  }

  return line.map((_, i) => widthFromNormalizedT(layer, i / (line.length - 1 || 1)));
}
