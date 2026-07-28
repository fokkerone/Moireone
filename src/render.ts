import type p5 from 'p5';
import type { ColorStop, GradientType, PatternState, Point } from './types';
import { generateLayerLines } from './lineGenerator';
import { computeLineWidths } from './lineWidths';
import { buildRibbon } from './ribbon';
import { sortStops } from './colorStops';

function buildGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gradientType: GradientType,
  angleDegrees: number,
  stops: ColorStop[]
): CanvasGradient {
  let gradient: CanvasGradient;
  if (gradientType === 'radial') {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.sqrt(width * width + height * height) / 2;
    gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  } else {
    const angleRad = (angleDegrees * Math.PI) / 180;
    const diagonal = Math.sqrt(width * width + height * height);
    const half = diagonal / 2;
    const centerX = width / 2;
    const centerY = height / 2;
    const dx = Math.cos(angleRad);
    const dy = Math.sin(angleRad);
    gradient = ctx.createLinearGradient(
      centerX - dx * half,
      centerY - dy * half,
      centerX + dx * half,
      centerY + dy * half
    );
  }
  for (const stop of sortStops(stops)) {
    gradient.addColorStop(stop.position, stop.color);
  }
  return gradient;
}

export function renderPattern(p: p5, state: PatternState): Point[][][] {
  (p.drawingContext as CanvasRenderingContext2D).globalAlpha = 1;
  {
    const ctx = p.drawingContext as CanvasRenderingContext2D;
    if (state.backgroundFillMode === 'gradient') {
      ctx.fillStyle = buildGradient(
        ctx,
        p.width,
        p.height,
        state.backgroundGradientType,
        state.backgroundGradientAngle,
        state.backgroundColorStops
      );
    } else {
      ctx.fillStyle = state.backgroundSolidColor;
    }
    ctx.fillRect(0, 0, p.width, p.height);
  }
  p.strokeCap(p.SQUARE);
  const layerLines: Point[][][] = [];

  state.layers.forEach((layer) => {
    if (layer.visible) {
      const lines = generateLayerLines(layer, p.width, p.height, (x, y, z) => p.noise(x, y, z));
      layerLines.push(lines);

      const ctx = p.drawingContext as CanvasRenderingContext2D;
      (p.drawingContext as CanvasRenderingContext2D).globalAlpha = layer.alpha;

      if (layer.widthCurveEnabled) {
        p.noStroke();
        p.fill(255);
        if (layer.fillMode === 'solid') {
          ctx.fillStyle = layer.solidColor;
        } else {
          ctx.fillStyle = buildGradient(ctx, p.width, p.height, layer.gradientType, layer.gradientAngle, layer.colorStops);
        }

        for (const line of lines) {
          const widths = computeLineWidths(line, layer, p.width, p.height);
          const ribbon = buildRibbon(line, widths);
          p.beginShape();
          for (const point of ribbon) {
            p.vertex(point.x, point.y);
          }
          p.endShape(p.CLOSE);
        }
      } else {
        p.stroke(0);
        if (layer.fillMode === 'solid') {
          ctx.strokeStyle = layer.solidColor;
        } else {
          ctx.strokeStyle = buildGradient(ctx, p.width, p.height, layer.gradientType, layer.gradientAngle, layer.colorStops);
        }
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
