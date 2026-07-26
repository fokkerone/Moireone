import type p5 from 'p5';
import type { PatternState, Point } from './types';
import { generateLayerLines } from './lineGenerator';
import { widthAt } from './widthProfile';
import { buildRibbon } from './ribbon';

function buildGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  angleDegrees: number,
  colorStart: string,
  colorEnd: string
): CanvasGradient {
  const angleRad = (angleDegrees * Math.PI) / 180;
  const diagonal = Math.sqrt(width * width + height * height);
  const half = diagonal / 2;
  const centerX = width / 2;
  const centerY = height / 2;
  const dx = Math.cos(angleRad);
  const dy = Math.sin(angleRad);
  const gradient = ctx.createLinearGradient(
    centerX - dx * half,
    centerY - dy * half,
    centerX + dx * half,
    centerY + dy * half
  );
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

export function renderPattern(p: p5, state: PatternState): Point[][][] {
  (p.drawingContext as CanvasRenderingContext2D).globalAlpha = 1;
  p.background(state.background);
  p.strokeCap(p.SQUARE);
  const layerLines: Point[][][] = [];

  state.layers.forEach((layer) => {
    if (layer.visible) {
      const lines = generateLayerLines(layer, p.width, p.height, (x, y, z) => p.noise(x, y, z));
      layerLines.push(lines);

      const ctx = p.drawingContext as CanvasRenderingContext2D;
      const gradient = buildGradient(ctx, p.width, p.height, layer.gradientAngle, layer.colorStart, layer.colorEnd);
      (p.drawingContext as CanvasRenderingContext2D).globalAlpha = layer.alpha;

      if (layer.widthCurveEnabled) {
        p.noStroke();
        p.fill(255);
        ctx.fillStyle = gradient;

        for (const line of lines) {
          const widths = line.map((point, i) => {
            if (layer.widthMode === 'byPosition') {
              const centerX = p.width / 2 + layer.widthCenterX;
              const centerY = p.height / 2 + layer.widthCenterY;
              const dx = point.x - centerX;
              const dy = point.y - centerY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const normalizedDistance = Math.min(1, distance / layer.widthRadius);
              const t = 0.5 + normalizedDistance * 0.5;
              return widthAt(t, layer.widthCurveShape, layer.widthMin, layer.widthMax);
            }
            return widthAt(i / (line.length - 1 || 1), layer.widthCurveShape, layer.widthMin, layer.widthMax);
          });
          const ribbon = buildRibbon(line, widths);
          p.beginShape();
          for (const point of ribbon) {
            p.vertex(point.x, point.y);
          }
          p.endShape(p.CLOSE);
        }
      } else {
        p.stroke(0);
        ctx.strokeStyle = gradient;
        p.strokeWeight(layer.weight);
        p.noFill();

        for (const line of lines) {
          p.beginShape();
          for (const point of line) {
            p.vertex(point.x, point.y);
          }
          p.endShape();
        }
      }
    } else {
      layerLines.push([]);
    }
  });

  return layerLines;
}
