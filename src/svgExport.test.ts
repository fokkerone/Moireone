import { describe, it, expect } from 'vitest';
import { buildSvgString } from './svgExport';
import type { PatternState, Point } from './types';

const state: PatternState = {
  background: '#111111',
  layers: [
    {
      colorStart: '#ff0000',
      colorEnd: '#0000ff',
      gradientAngle: 45,
      baseAngle: 0,
      noiseScale: 0.01,
      amplitude: 50,
      spacing: 10,
      weight: 2,
      alpha: 0.5,
      seed: 0,
      zoom: 1,
      visible: true,
      offsetX: 0,
      offsetY: 0,
      widthCurveEnabled: false,
      widthCurveShape: 'linear',
      widthMin: 1,
      widthMax: 1,
      envelopeEnabled: false,
      envelopeShape: 'linear',
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
    expect(svg).toContain('stroke="url(#layer-gradient-0)"');
    expect(svg).toContain('stroke-opacity="0.5"');
    expect(svg).toContain('stroke-width="2"');
    expect(svg).toContain('stroke-linecap="butt"');
  });

  it('includes a linearGradient definition matching the layer colorStart/colorEnd', () => {
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    const svg = buildSvgString(state, [[line]], 300, 200);
    expect(svg).toContain('<linearGradient id="layer-gradient-0"');
    expect(svg).toContain('stop-color="#ff0000"');
    expect(svg).toContain('stop-color="#0000ff"');
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

  it('omits polylines for a hidden layer even when stale cached layerLines contain points for it', () => {
    const hiddenState: PatternState = {
      background: '#111111',
      layers: [
        {
          colorStart: '#ff0000',
          colorEnd: '#0000ff',
          gradientAngle: 45,
          baseAngle: 0,
          noiseScale: 0.01,
          amplitude: 50,
          spacing: 10,
          weight: 2,
          alpha: 0.5,
          seed: 0,
          zoom: 1,
          visible: false,
          offsetX: 0,
          offsetY: 0,
          widthCurveEnabled: false,
          widthCurveShape: 'linear',
          widthMin: 1,
          widthMax: 1,
          envelopeEnabled: false,
          envelopeShape: 'linear',
        },
      ],
    };
    const staleLine: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    const svg = buildSvgString(hiddenState, [[staleLine]], 300, 200);
    expect(svg).not.toContain('<polyline');
  });

  it('renders a filled ribbon <path> instead of a <polyline> when widthCurveEnabled is true', () => {
    const widthState: PatternState = {
      background: '#111111',
      layers: [
        {
          colorStart: '#ff0000',
          colorEnd: '#0000ff',
          gradientAngle: 45,
          baseAngle: 0,
          noiseScale: 0.01,
          amplitude: 50,
          spacing: 10,
          weight: 2,
          alpha: 0.5,
          seed: 0,
          zoom: 1,
          visible: true,
          offsetX: 0,
          offsetY: 0,
          widthCurveEnabled: true,
          widthCurveShape: 'linear',
          widthMin: 2,
          widthMax: 8,
          envelopeEnabled: false,
          envelopeShape: 'linear',
        },
      ],
    };
    const line: Point[] = [
      { x: 0, y: 100 },
      { x: 10, y: 100 },
      { x: 20, y: 100 },
    ];
    const svg = buildSvgString(widthState, [[line]], 300, 200);
    expect(svg).not.toContain('<polyline');
    expect(svg).toContain('<path');
    expect(svg).toContain('fill="url(#layer-gradient-0)"');
    expect(svg).toContain('stroke="none"');
  });
});
