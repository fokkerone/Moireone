import type { Point } from './types';

export function buildRibbon(line: Point[], widths: number[]): Point[] {
  const n = line.length;
  const upper: Point[] = [];
  const lower: Point[] = [];
  for (let i = 0; i < n; i++) {
    const prev = line[Math.max(0, i - 1)];
    const next = line[Math.min(n - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / len;
    const perpY = dx / len;
    const halfWidth = widths[i] / 2;
    upper.push({ x: line[i].x + perpX * halfWidth, y: line[i].y + perpY * halfWidth });
    lower.push({ x: line[i].x - perpX * halfWidth, y: line[i].y - perpY * halfWidth });
  }
  return [...upper, ...lower.reverse()];
}
