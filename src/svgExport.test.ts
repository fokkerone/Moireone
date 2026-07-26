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
      widthMode: 'alongLine',
      widthCenterX: 0,
      widthCenterY: 0,
      widthRadius: 400,
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
          widthMode: 'alongLine',
          widthCenterX: 0,
          widthCenterY: 0,
          widthRadius: 400,
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
          widthMode: 'alongLine',
          widthCenterX: 0,
          widthCenterY: 0,
          widthRadius: 400,
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

  it('widthMode "byPosition" makes the ribbon wide near the reference point and narrow far from it', () => {
    const byPositionState: PatternState = {
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
          widthMax: 20,
          envelopeEnabled: false,
          envelopeShape: 'linear',
          widthMode: 'byPosition',
          widthCenterX: 0,
          widthCenterY: 0,
          widthRadius: 100,
        },
      ],
    };

    // Canvas is 200x200, so the reference point (width/2 + widthCenterX,
    // height/2 + widthCenterY) is (100, 100). This horizontal line passes
    // straight through it: x=100 sits exactly at distance 0, x=150 sits at
    // distance 50 (half the radius), and x=200 sits at distance 100 (at the
    // radius, i.e. fully at widthMin).
    const line: Point[] = [
      { x: 100, y: 100 },
      { x: 150, y: 100 },
      { x: 200, y: 100 },
    ];
    const svg = buildSvgString(byPositionState, [[line]], 200, 200);

    const pathMatch = svg.match(/<path d="([^"]+)"/);
    expect(pathMatch).not.toBeNull();
    const d = pathMatch![1];

    // Parse every "X,Y" coordinate pair out of the path's M/L commands, in
    // order. buildRibbon's contract is: n "upper" points in point order,
    // followed by n "lower" points in REVERSE point order -- so for our
    // 3-point line the 6 ribbon vertices are
    // [upper0, upper1, upper2, lower2, lower1, lower0].
    const coords = [...d.matchAll(/(-?\d+\.\d+),(-?\d+\.\d+)/g)].map(([, x, y]) => ({
      x: Number(x),
      y: Number(y),
    }));
    expect(coords).toHaveLength(6);

    const [upper0, upper1, upper2, lower2, lower1, lower0] = coords;

    // The generating line is perfectly horizontal, so buildRibbon's
    // perpendicular is purely vertical: upper/lower share the same x as the
    // source point, and the ribbon width at each point is the vertical gap
    // between its upper and lower boundary.
    const widthAt100 = Math.abs(upper0.y - lower0.y);
    const widthAt150 = Math.abs(upper1.y - lower1.y);
    const widthAt200 = Math.abs(upper2.y - lower2.y);

    expect(upper0.x).toBeCloseTo(100, 6);
    expect(upper1.x).toBeCloseTo(150, 6);
    expect(upper2.x).toBeCloseTo(200, 6);

    // Distance 0 (at the reference point) -> full widthMax.
    expect(widthAt100).toBeCloseTo(20, 6);
    // Distance == radius (100) -> full widthMin.
    expect(widthAt200).toBeCloseTo(2, 6);
    // Distance == half the radius (50), linear shape -> exact midpoint.
    expect(widthAt150).toBeCloseTo(11, 6);

    // The ribbon must strictly narrow as distance from the reference point
    // increases, with no per-line end-tapering (unlike 'alongLine' mode).
    expect(widthAt100).toBeGreaterThan(widthAt150);
    expect(widthAt150).toBeGreaterThan(widthAt200);
  });
});
