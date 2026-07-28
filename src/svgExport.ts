import type { ColorStop, GradientType, PatternState, Point } from './types';
import { computeLineWidths } from './lineWidths';
import { buildRibbon } from './ribbon';
import { sortStops } from './colorStops';

function buildGradientDef(
  gradientId: number | string,
  width: number,
  height: number,
  gradientType: GradientType,
  angleDegrees: number,
  stops: ColorStop[]
): string {
  const stopEls = sortStops(stops)
    .map((stop) => `<stop offset="${stop.position * 100}%" stop-color="${stop.color}" />`)
    .join('');

  if (gradientType === 'radial') {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.sqrt(width * width + height * height) / 2;
    return `<radialGradient id="${gradientId}" gradientUnits="userSpaceOnUse" cx="${centerX.toFixed(2)}" cy="${centerY.toFixed(2)}" r="${radius.toFixed(2)}">${stopEls}</radialGradient>`;
  }

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

  return `<linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}">${stopEls}</linearGradient>`;
}

export function buildSvgString(
  state: PatternState,
  layerLines: Point[][][],
  width: number,
  height: number
): string {
  const backgroundPaint =
    state.backgroundFillMode === 'gradient' ? 'url(#background-gradient)' : state.backgroundSolidColor;
  const rect = `<rect x="0" y="0" width="${width}" height="${height}" fill="${backgroundPaint}" />`;

  const gradientDefs: string[] = [];
  if (state.backgroundFillMode === 'gradient') {
    gradientDefs.push(
      buildGradientDef(
        'background-gradient',
        width,
        height,
        state.backgroundGradientType,
        state.backgroundGradientAngle,
        state.backgroundColorStops
      )
    );
  }
  const layerGroups: string[] = [];
  state.layers.forEach((layer, layerIndex) => {
    if (!layer.visible) return;
    if (layer.fillMode === 'gradient') {
      gradientDefs.push(
        buildGradientDef(
          `layer-gradient-${layerIndex}`,
          width,
          height,
          layer.gradientType,
          layer.gradientAngle,
          layer.colorStops
        )
      );
    }
    const paint = layer.fillMode === 'solid' ? layer.solidColor : `url(#layer-gradient-${layerIndex})`;
    const lines = layerLines[layerIndex] ?? [];
    const polylines: string[] = [];
    for (const line of lines) {
      if (layer.widthCurveEnabled) {
        const widths = computeLineWidths(line, layer, width, height);
        const ribbon = buildRibbon(line, widths);
        const d = ribbon
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)},${p.y.toFixed(2)}`)
          .join(' ') + ' Z';
        polylines.push(
          `<path d="${d}" fill="${paint}" fill-opacity="${layer.alpha}" stroke="none" />`
        );
      } else {
        const points = line.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
        polylines.push(
          `<polyline points="${points}" fill="none" stroke="${paint}" stroke-opacity="${layer.alpha}" stroke-width="${layer.weight}" stroke-linecap="butt" />`
        );
      }
    }
    const layerName = `Layer ${layerIndex + 1}`;
    layerGroups.push(
      `<g id="layer-${layerIndex}" inkscape:label="${layerName}" inkscape:groupmode="layer">${polylines.join('')}</g>`
    );
  });

  const defs = `<defs>${gradientDefs.join('')}</defs>`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    rect,
    defs,
    ...layerGroups,
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
