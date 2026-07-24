import type { PatternState, Point } from './types';

export function buildSvgString(
  state: PatternState,
  layerLines: Point[][][],
  width: number,
  height: number
): string {
  const rect = `<rect x="0" y="0" width="${width}" height="${height}" fill="${state.background}" />`;

  const polylines: string[] = [];
  state.layers.forEach((layer, layerIndex) => {
    if (!layer.visible) return;
    const lines = layerLines[layerIndex] ?? [];
    for (const line of lines) {
      const points = line.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
      polylines.push(
        `<polyline points="${points}" fill="none" stroke="${layer.color}" stroke-opacity="${layer.alpha}" stroke-width="${layer.weight}" stroke-linecap="butt" />`
      );
    }
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    rect,
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
