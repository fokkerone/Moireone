import { describe, it, expect } from 'vitest';
import { buildSvgString } from './svgExport';
import type { PatternState, Point } from './types';

const state: PatternState = {
  background: '#111111',
  layers: [
    {
      color: '#ff0000',
      baseAngle: 0,
      noiseScale: 0.01,
      noiseStrength: 0,
      spacing: 10,
      weight: 2,
      alpha: 0.5,
      seed: 0,
      zoom: 1,
      turnRate: 1000,
    },
  ],
};

describe('buildSvgString', () => {
  it('includes a background rect matching the state background color and canvas size', () => {
    const svg = buildSvgString(state, [[]], 300, 200);
    expect(svg).toContain('fill="#111111"');
    expect(svg).toContain('width="300"');
    expect(svg).toContain('height="200"');
  });

  it('renders one polyline per line with the layer color, opacity, and stroke width', () => {
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    const svg = buildSvgString(state, [[line]], 300, 200);
    expect(svg).toContain('points="0.00,0.00 10.00,10.00"');
    expect(svg).toContain('stroke="#ff0000"');
    expect(svg).toContain('stroke-opacity="0.5"');
    expect(svg).toContain('stroke-width="2"');
    expect(svg).toContain('stroke-linecap="butt"');
  });

  it('produces parseable, error-free XML', () => {
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    const svg = buildSvgString(state, [[line]], 300, 200);
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
  });
});
