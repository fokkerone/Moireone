import type p5 from 'p5';
import type { PatternState, Point } from './types';
import { generateLayerLines } from './lineGenerator';

export function renderPattern(p: p5, state: PatternState): Point[][][] {
  (p.drawingContext as CanvasRenderingContext2D).globalAlpha = 1;
  p.background(state.background);
  p.strokeCap(p.SQUARE);
  const layerLines: Point[][][] = [];

  state.layers.forEach((layer) => {
    const lines = generateLayerLines(layer, p.width, p.height, (x, y, z) => p.noise(x, y, z));
    layerLines.push(lines);

    p.stroke(layer.color);
    p.strokeWeight(layer.weight);
    p.noFill();
    (p.drawingContext as CanvasRenderingContext2D).globalAlpha = layer.alpha;

    for (const line of lines) {
      p.beginShape();
      for (const point of line) {
        p.vertex(point.x, point.y);
      }
      p.endShape();
    }
  });

  return layerLines;
}
