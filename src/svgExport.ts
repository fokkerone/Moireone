import type { PatternState, Point } from './types';
import { widthAt } from './widthProfile';
import { buildRibbon } from './ribbon';

function buildGradientDef(
  layerIndex: number,
  width: number,
  height: number,
  angleDegrees: number,
  colorStart: string,
  colorEnd: string
): string {
  const angleRad = (angleDegrees * Math.PI) / 180;
  const diagonal = Math.sqrt(width * width + height * height);
  const half = diagonal / 2;
  const centerX = width / 2;
  const centerY = height / 2;
  const dx = Math.cos(angleRad);
  const dy = Math.sin(angleRad);
  const x1 = centerX - dx * half;
  const y1 = centerY - dy * half;
  const x2 = centerX + dx * half;
  const y2 = centerY + dy * half;

  return `<linearGradient id="layer-gradient-${layerIndex}" gradientUnits="userSpaceOnUse" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"><stop offset="0%" stop-color="${colorStart}" /><stop offset="100%" stop-color="${colorEnd}" /></linearGradient>`;
}

export function buildSvgString(
  state: PatternState,
  layerLines: Point[][][],
  width: number,
  height: number
): string {
  const rect = `<rect x="0" y="0" width="${width}" height="${height}" fill="${state.background}" />`;

  const gradientDefs: string[] = [];
  const polylines: string[] = [];
  state.layers.forEach((layer, layerIndex) => {
    if (!layer.visible) return;
    gradientDefs.push(
      buildGradientDef(layerIndex, width, height, layer.gradientAngle, layer.colorStart, layer.colorEnd)
    );
    const lines = layerLines[layerIndex] ?? [];
    for (const line of lines) {
      if (layer.widthCurveEnabled) {
        const widths = line.map((point, i) => {
          if (layer.widthMode === 'byPosition') {
            const centerX = width / 2 + layer.widthCenterX;
            const centerY = height / 2 + layer.widthCenterY;
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
        const d = ribbon
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)},${p.y.toFixed(2)}`)
          .join(' ') + ' Z';
        polylines.push(
          `<path d="${d}" fill="url(#layer-gradient-${layerIndex})" fill-opacity="${layer.alpha}" stroke="none" />`
        );
      } else {
        const points = line.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
        polylines.push(
          `<polyline points="${points}" fill="none" stroke="url(#layer-gradient-${layerIndex})" stroke-opacity="${layer.alpha}" stroke-width="${layer.weight}" stroke-linecap="butt" />`
        );
      }
    }
  });

  const defs = `<defs>${gradientDefs.join('')}</defs>`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    rect,
    defs,
    ...polylines,
    '</svg>',
  ].join('\n');
}

export function exportSvg(
  state: PatternState,
  layerLines: Point[][][],
  width: number,
  height: number
): void {
  const svg = buildSvgString(state, layerLines, width, height);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'moire-pattern.svg';
  link.click();
  URL.revokeObjectURL(url);
}
