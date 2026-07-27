import { describe, it, expect } from 'vitest';
import { buildSvgString } from './svgExport';
import type { PatternState, Point } from './types';

const state: PatternState = {
  backgroundFillMode: 'solid',
  backgroundSolidColor: '#111111',
  backgroundColorStops: [{ id: 'bg0', position: 0, color: '#111111' }, { id: 'bg1', position: 1, color: '#111111' }],
  backgroundGradientAngle: 90, backgroundGradientType: 'linear',
  animationPlaying: false,
  animationSpeed: 1,
  orientation: 'landscape',
  layers: [
    {
      fillMode: 'gradient',
      solidColor: '#ff0000',
      colorStops: [
        { id: 'a', position: 0, color: '#ff0000' },
        { id: 'b', position: 1, color: '#0000ff' },
      ],
      gradientAngle: 45, gradientType: 'linear',
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
      widthStart: 1,
      widthCenter: 1,
      widthEnd: 1,
      macroShape: 'smooth',
      macroRadius: 800,
      textureAmplitude: 0,
      animationPaused: false,
      widthMode: 'alongLine',
      widthCenterX: 0,
      widthCenterY: 0,
      widthRadius: 400,
      widthAngle: 0,
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

  it('wraps each visible layer\'s lines in its own named <g> group', () => {
    const twoLayerState: PatternState = {
      ...state,
      layers: [state.layers[0], { ...state.layers[0], visible: false }, state.layers[0]],
    };
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    const svg = buildSvgString(twoLayerState, [[line], [line], [line]], 300, 200);

    expect(svg).toContain('<g id="layer-0"');
    expect(svg).toContain('inkscape:label="Layer 1"');
    expect(svg).not.toContain('id="layer-1"');
    expect(svg).toContain('<g id="layer-2"');
    expect(svg).toContain('inkscape:label="Layer 3"');

    const group0Match = svg.match(/<g id="layer-0"[^>]*>([^]*?)<\/g>/);
    expect(group0Match).not.toBeNull();
    expect(group0Match![1]).toContain('<polyline');

    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();
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
      backgroundFillMode: 'solid',
      backgroundSolidColor: '#111111',
      backgroundColorStops: [{ id: 'bg0', position: 0, color: '#111111' }, { id: 'bg1', position: 1, color: '#111111' }],
      backgroundGradientAngle: 90, backgroundGradientType: 'linear',
  animationPlaying: false,
  animationSpeed: 1,
  orientation: 'landscape',
      layers: [
        {
          fillMode: 'gradient',
          solidColor: '#ff0000',
          colorStops: [
            { id: 'a', position: 0, color: '#ff0000' },
            { id: 'b', position: 1, color: '#0000ff' },
          ],
          gradientAngle: 45, gradientType: 'linear',
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
          widthStart: 1,
          widthCenter: 1,
          widthEnd: 1,
          macroShape: 'smooth',
          macroRadius: 800,
          textureAmplitude: 0,
      animationPaused: false,
          widthMode: 'alongLine',
          widthCenterX: 0,
          widthCenterY: 0,
          widthRadius: 400,
          widthAngle: 0,
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
      backgroundFillMode: 'solid',
      backgroundSolidColor: '#111111',
      backgroundColorStops: [{ id: 'bg0', position: 0, color: '#111111' }, { id: 'bg1', position: 1, color: '#111111' }],
      backgroundGradientAngle: 90, backgroundGradientType: 'linear',
  animationPlaying: false,
  animationSpeed: 1,
  orientation: 'landscape',
      layers: [
        {
          fillMode: 'gradient',
          solidColor: '#ff0000',
          colorStops: [
            { id: 'a', position: 0, color: '#ff0000' },
            { id: 'b', position: 1, color: '#0000ff' },
          ],
          gradientAngle: 45, gradientType: 'linear',
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
          widthStart: 2,
          widthCenter: 8,
          widthEnd: 2,
          macroShape: 'smooth',
          macroRadius: 800,
          textureAmplitude: 0,
      animationPaused: false,
          widthMode: 'alongLine',
          widthCenterX: 0,
          widthCenterY: 0,
          widthRadius: 400,
          widthAngle: 0,
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
      backgroundFillMode: 'solid',
      backgroundSolidColor: '#111111',
      backgroundColorStops: [{ id: 'bg0', position: 0, color: '#111111' }, { id: 'bg1', position: 1, color: '#111111' }],
      backgroundGradientAngle: 90, backgroundGradientType: 'linear',
  animationPlaying: false,
  animationSpeed: 1,
  orientation: 'landscape',
      layers: [
        {
          fillMode: 'gradient',
          solidColor: '#ff0000',
          colorStops: [
            { id: 'a', position: 0, color: '#ff0000' },
            { id: 'b', position: 1, color: '#0000ff' },
          ],
          gradientAngle: 45, gradientType: 'linear',
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
          widthStart: 2,
          widthCenter: 20,
          widthEnd: 2,
          macroShape: 'smooth',
          macroRadius: 800,
          textureAmplitude: 0,
      animationPaused: false,
          widthMode: 'byPosition',
          widthCenterX: 0,
          widthCenterY: 0,
          widthRadius: 100,
          widthAngle: 0,
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

  it('renders a solid-fill layer with the flat color and no linearGradient element', () => {
    const solidState: PatternState = {
      backgroundFillMode: 'solid',
      backgroundSolidColor: '#111111',
      backgroundColorStops: [{ id: 'bg0', position: 0, color: '#111111' }, { id: 'bg1', position: 1, color: '#111111' }],
      backgroundGradientAngle: 90, backgroundGradientType: 'linear',
      animationPlaying: false,
      animationSpeed: 1,
  orientation: 'landscape',
      layers: [
        {
          fillMode: 'solid',
          solidColor: '#abcdef',
          colorStops: [
            { id: 'a', position: 0, color: '#ff0000' },
            { id: 'b', position: 1, color: '#0000ff' },
          ],
          gradientAngle: 45, gradientType: 'linear',
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
          widthStart: 1,
          widthCenter: 1,
          widthEnd: 1,
          macroShape: 'smooth',
          macroRadius: 800,
          textureAmplitude: 0,
          animationPaused: false,
          widthMode: 'alongLine',
          widthCenterX: 0,
          widthCenterY: 0,
          widthRadius: 400,
          widthAngle: 0,
        },
      ],
    };
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    const svg = buildSvgString(solidState, [[line]], 300, 200);
    expect(svg).toContain('stroke="#abcdef"');
    expect(svg).not.toContain('<linearGradient');
  });

  it('renders a gradient with three color stops, one <stop> per entry at the correct offsets', () => {
    const threeStopState: PatternState = {
      backgroundFillMode: 'solid',
      backgroundSolidColor: '#111111',
      backgroundColorStops: [{ id: 'bg0', position: 0, color: '#111111' }, { id: 'bg1', position: 1, color: '#111111' }],
      backgroundGradientAngle: 90, backgroundGradientType: 'linear',
      animationPlaying: false,
      animationSpeed: 1,
  orientation: 'landscape',
      layers: [
        {
          fillMode: 'gradient',
          solidColor: '#ff0000',
          colorStops: [
            { id: 'a', position: 0, color: '#ff0000' },
            { id: 'b', position: 0.5, color: '#00ff00' },
            { id: 'c', position: 1, color: '#0000ff' },
          ],
          gradientAngle: 45, gradientType: 'linear',
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
          widthStart: 1,
          widthCenter: 1,
          widthEnd: 1,
          macroShape: 'smooth',
          macroRadius: 800,
          textureAmplitude: 0,
          animationPaused: false,
          widthMode: 'alongLine',
          widthCenterX: 0,
          widthCenterY: 0,
          widthRadius: 400,
          widthAngle: 0,
        },
      ],
    };
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    const svg = buildSvgString(threeStopState, [[line]], 300, 200);
    const stopMatches = [...svg.matchAll(/<stop offset="([^"]+)" stop-color="([^"]+)" \/>/g)];
    expect(stopMatches).toHaveLength(3);
    expect(stopMatches[0][1]).toBe('0%');
    expect(stopMatches[0][2]).toBe('#ff0000');
    expect(stopMatches[1][1]).toBe('50%');
    expect(stopMatches[1][2]).toBe('#00ff00');
    expect(stopMatches[2][1]).toBe('100%');
    expect(stopMatches[2][2]).toBe('#0000ff');
  });

  it('widthMode "byAngle" makes the ribbon wide near the axis origin and narrow along the axis direction', () => {
    const byAngleState: PatternState = {
      backgroundFillMode: 'solid',
      backgroundSolidColor: '#111111',
      backgroundColorStops: [{ id: 'bg0', position: 0, color: '#111111' }, { id: 'bg1', position: 1, color: '#111111' }],
      backgroundGradientAngle: 90, backgroundGradientType: 'linear',
      animationPlaying: false,
      animationSpeed: 1,
      orientation: 'landscape',
      layers: [
        {
          fillMode: 'gradient',
          solidColor: '#ff0000',
          colorStops: [
            { id: 'a', position: 0, color: '#ff0000' },
            { id: 'b', position: 1, color: '#0000ff' },
          ],
          gradientAngle: 45, gradientType: 'linear',
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
          widthStart: 2,
          widthCenter: 10,
          widthEnd: 2,
          macroShape: 'smooth',
          macroRadius: 800,
          textureAmplitude: 0,
          animationPaused: false,
          widthMode: 'byAngle',
          widthCenterX: 0,
          widthCenterY: 0,
          widthRadius: 100,
          widthAngle: 0,
        },
      ],
    };

    // Canvas is 200x200, so the axis origin (width/2 + widthCenterX,
    // height/2 + widthCenterY) is (100, 100). widthAngle=0 means the axis is
    // horizontal, so this horizontal line lies exactly along it: x=100 is at
    // the origin (signed distance 0, the tent's center/thick point), and
    // x=200 is at signed distance 100 == widthRadius (fully at the "end"
    // extreme, thin).
    const line: Point[] = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ];
    const svg = buildSvgString(byAngleState, [[line]], 200, 200);

    const pathMatch = svg.match(/<path d="([^"]+)"/);
    expect(pathMatch).not.toBeNull();
    const d = pathMatch![1];

    // buildRibbon's contract: n "upper" points in point order, followed by n
    // "lower" points in REVERSE point order -- for our 2-point line the 4
    // ribbon vertices are [upper0, upper1, lower1, lower0].
    const coords = [...d.matchAll(/(-?\d+\.\d+),(-?\d+\.\d+)/g)].map(([, x, y]) => ({
      x: Number(x),
      y: Number(y),
    }));
    expect(coords).toHaveLength(4);

    const [upper0, upper1, lower1, lower0] = coords;

    const widthAtOrigin = Math.abs(upper0.y - lower0.y);
    const widthAtFarEnd = Math.abs(upper1.y - lower1.y);

    expect(upper0.x).toBeCloseTo(100, 6);
    expect(upper1.x).toBeCloseTo(200, 6);

    // Near the axis origin -> full widthCenter (thick).
    expect(widthAtOrigin).toBeCloseTo(10, 6);
    // 100+ px away along the axis (at widthRadius) -> full widthEnd (thin).
    expect(widthAtFarEnd).toBeCloseTo(2, 6);
  });

  it('renders a background gradient with a <linearGradient id="background-gradient"> and a fill referencing it', () => {
    const gradientBgState: PatternState = {
      ...state,
      backgroundFillMode: 'gradient',
      backgroundColorStops: [
        { id: 'bg-a', position: 0, color: '#ff0000' },
        { id: 'bg-b', position: 0.5, color: '#00ff00' },
        { id: 'bg-c', position: 1, color: '#0000ff' },
      ],
      backgroundGradientAngle: 45, backgroundGradientType: 'linear',
    };
    const svg = buildSvgString(gradientBgState, [[]], 300, 200);

    expect(svg).toContain('fill="url(#background-gradient)"');
    expect(svg).toContain('<linearGradient id="background-gradient"');

    const defsMatch = svg.match(/<linearGradient id="background-gradient"[^]*?<\/linearGradient>/);
    expect(defsMatch).not.toBeNull();
    const stopMatches = [...defsMatch![0].matchAll(/<stop offset="([^"]+)" stop-color="([^"]+)" \/>/g)];
    expect(stopMatches).toHaveLength(3);
    expect(stopMatches[0][1]).toBe('0%');
    expect(stopMatches[0][2]).toBe('#ff0000');
    expect(stopMatches[1][1]).toBe('50%');
    expect(stopMatches[1][2]).toBe('#00ff00');
    expect(stopMatches[2][1]).toBe('100%');
    expect(stopMatches[2][2]).toBe('#0000ff');
  });

  it('renders a radial gradient layer with a <radialGradient> element and the correct stops', () => {
    const radialLayerState: PatternState = {
      ...state,
      layers: [
        {
          ...state.layers[0],
          gradientType: 'radial',
        },
      ],
    };
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    const svg = buildSvgString(radialLayerState, [[line]], 300, 200);

    expect(svg).toContain('stroke="url(#layer-gradient-0)"');
    expect(svg).not.toContain('<linearGradient id="layer-gradient-0"');
    expect(svg).toContain('<radialGradient id="layer-gradient-0"');

    const defsMatch = svg.match(/<radialGradient id="layer-gradient-0"[^]*?<\/radialGradient>/);
    expect(defsMatch).not.toBeNull();
    const stopMatches = [...defsMatch![0].matchAll(/<stop offset="([^"]+)" stop-color="([^"]+)" \/>/g)];
    expect(stopMatches).toHaveLength(2);
    expect(stopMatches[0][1]).toBe('0%');
    expect(stopMatches[0][2]).toBe('#ff0000');
    expect(stopMatches[1][1]).toBe('100%');
    expect(stopMatches[1][2]).toBe('#0000ff');
  });

  it('renders a radial background gradient with a <radialGradient id="background-gradient"> and a fill referencing it', () => {
    const radialBgState: PatternState = {
      ...state,
      backgroundFillMode: 'gradient',
      backgroundGradientType: 'radial',
      backgroundColorStops: [
        { id: 'bg-a', position: 0, color: '#ff0000' },
        { id: 'bg-b', position: 1, color: '#0000ff' },
      ],
    };
    const svg = buildSvgString(radialBgState, [[]], 300, 200);

    expect(svg).toContain('fill="url(#background-gradient)"');
    expect(svg).toContain('<radialGradient id="background-gradient"');
    expect(svg).not.toContain('<linearGradient id="background-gradient"');
  });
});
