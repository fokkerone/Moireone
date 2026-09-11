import { describe, it, expect } from 'vitest';
import { buildSvgString } from './svgExport';
import { computeLineWidths } from './lineWidths';
import { buildRibbon } from './ribbon';
import type { PatternState, Point } from './types';

const state: PatternState = {
  backgroundFillMode: 'solid',
  backgroundSolidColor: '#111111',
  backgroundColorStops: [{ id: 'bg0', position: 0, color: '#111111' }, { id: 'bg1', position: 1, color: '#111111' }],
  backgroundGradientAngle: 90, backgroundGradientType: 'linear',
  animationPlaying: false,
  animationSpeed: 1,
  orientation: 'landscape',
  canvasSizeId: '80x120',
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
      amplitude: 50,
      spacing: 10,
      weight: 2,
      alpha: 0.5,
      seed: 0,
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
      widthImageEnabled: false,
      widthImageInvert: false,
      widthImageStrength: 1,
      widthImageData: null,
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

  it('ignores an assigned reference image entirely when widthCurveEnabled is false (spec: image modulation only applies when width curves are enabled)', () => {
    const disabledCurveWithImageState: PatternState = {
      ...state,
      layers: [
        {
          ...state.layers[0],
          widthCurveEnabled: false,
          widthImageEnabled: true,
          widthImageStrength: 1,
          widthImageData: { width: 2, height: 2, luminance: new Float32Array([0, 0, 0, 0]) },
        },
      ],
    };
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    const svg = buildSvgString(disabledCurveWithImageState, [[line]], 300, 200);
    // Same output as the plain widthCurveEnabled:false case above: a constant-weight
    // polyline, not a width-modulated ribbon <path> -- the image has no effect.
    expect(svg).not.toContain('<path');
    expect(svg).toContain('points="0.00,0.00 10.00,10.00"');
    expect(svg).toContain('stroke-width="2"');
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
  canvasSizeId: '80x120',
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
          amplitude: 50,
          spacing: 10,
          weight: 2,
          alpha: 0.5,
          seed: 0,
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
          widthImageEnabled: false,
          widthImageInvert: false,
          widthImageStrength: 1,
          widthImageData: null,
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
  canvasSizeId: '80x120',
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
          amplitude: 50,
          spacing: 10,
          weight: 2,
          alpha: 0.5,
          seed: 0,
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
          widthImageEnabled: false,
          widthImageInvert: false,
          widthImageStrength: 1,
          widthImageData: null,
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

  it('with image-reference width modulation enabled, export widths are identical to computeLineWidths (preview/export parity)', () => {
    const canvasWidth = 300;
    const canvasHeight = 200;
    // 2x2 luminance grid: distinct known values so the modulation actually
    // varies per vertex rather than degenerating to a constant scale.
    const widthImageData = {
      width: 2,
      height: 2,
      luminance: new Float32Array([0, 1, 1, 0]),
    };
    const imageLayer = {
      fillMode: 'solid' as const,
      solidColor: '#ff0000',
      colorStops: [],
      gradientAngle: 0,
      gradientType: 'linear' as const,
      baseAngle: 0,
      amplitude: 50,
      spacing: 10,
      weight: 2,
      alpha: 1,
      seed: 0,
      visible: true,
      offsetX: 0,
      offsetY: 0,
      widthCurveEnabled: true,
      widthCurveShape: 'linear' as const,
      widthStart: 2,
      widthCenter: 8,
      widthEnd: 2,
      macroShape: 'smooth' as const,
      macroRadius: 800,
      textureAmplitude: 0,
      animationPaused: false,
      widthMode: 'alongLine' as const,
      widthCenterX: 0,
      widthCenterY: 0,
      widthRadius: 400,
      widthAngle: 0,
      widthImageEnabled: true,
      widthImageInvert: false,
      widthImageStrength: 1,
      widthImageData,
    };
    const imageState: PatternState = {
      backgroundFillMode: 'solid',
      backgroundSolidColor: '#111111',
      backgroundColorStops: [{ id: 'bg0', position: 0, color: '#111111' }, { id: 'bg1', position: 1, color: '#111111' }],
      backgroundGradientAngle: 90,
      backgroundGradientType: 'linear',
      animationPlaying: false,
      animationSpeed: 1,
      orientation: 'landscape',
      canvasSizeId: '80x120',
      layers: [imageLayer],
    };
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 299, y: 199 },
    ];

    const svg = buildSvgString(imageState, [[line]], canvasWidth, canvasHeight);

    // Compute the expected path independently via the same functions the
    // live render path (render.ts) uses, and assert the SVG export used
    // exactly this data — no separate/divergent width computation.
    const expectedWidths = computeLineWidths(line, imageLayer, canvasWidth, canvasHeight);
    const expectedRibbon = buildRibbon(line, expectedWidths);
    const expectedD =
      expectedRibbon.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z';

    expect(svg).toContain(`<path d="${expectedD}"`);
  });

  it('widthMode "byPosition" keeps a single line a constant width along its length, while different lines get different widths', () => {
    const byPositionState: PatternState = {
      backgroundFillMode: 'solid',
      backgroundSolidColor: '#111111',
      backgroundColorStops: [{ id: 'bg0', position: 0, color: '#111111' }, { id: 'bg1', position: 1, color: '#111111' }],
      backgroundGradientAngle: 90, backgroundGradientType: 'linear',
  animationPlaying: false,
  animationSpeed: 1,
  orientation: 'landscape',
  canvasSizeId: '80x120',
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
          amplitude: 50,
          spacing: 10,
          weight: 2,
          alpha: 0.5,
          seed: 0,
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
          widthImageEnabled: false,
          widthImageInvert: false,
          widthImageStrength: 1,
          widthImageData: null,
        },
      ],
    };

    // Canvas is 200x200, so the reference point (width/2 + widthCenterX,
    // height/2 + widthCenterY) is (100, 100). This line's MIDPOINT (index 1,
    // x=150) sits at distance 50 (half the radius) from the reference, even
    // though its endpoints sit at distance 0 and 100 respectively -- under
    // the new per-line-constant contract, every vertex must get the SAME
    // width, evaluated once at the midpoint.
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

    // Midpoint distance 50 (half the radius), linear shape -> t=0.75 ->
    // interpolating from center(20) to end(2): 20 + 0.5*(2-20) = 11.
    // ALL THREE vertices must share this exact width -- the whole point of
    // this test is that the line no longer tapers along its own length.
    expect(widthAt100).toBeCloseTo(11, 6);
    expect(widthAt150).toBeCloseTo(11, 6);
    expect(widthAt200).toBeCloseTo(11, 6);

    // A second, differently-positioned line gets a DIFFERENT constant width:
    // this line's midpoint sits exactly at the reference point (distance 0),
    // so its uniform width should be the full center value (20).
    const nearLine: Point[] = [
      { x: 50, y: 100 },
      { x: 100, y: 100 },
      { x: 150, y: 100 },
    ];
    const svg2 = buildSvgString(byPositionState, [[nearLine]], 200, 200);
    const pathMatch2 = svg2.match(/<path d="([^"]+)"/);
    expect(pathMatch2).not.toBeNull();
    const coords2 = [...pathMatch2![1].matchAll(/(-?\d+\.\d+),(-?\d+\.\d+)/g)].map(([, x, y]) => ({
      x: Number(x),
      y: Number(y),
    }));
    const [nUpper0, , , , , nLower0] = coords2;
    const widthOfNearLine = Math.abs(nUpper0.y - nLower0.y);
    expect(widthOfNearLine).toBeCloseTo(20, 6);
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
  canvasSizeId: '80x120',
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
          amplitude: 50,
          spacing: 10,
          weight: 2,
          alpha: 0.5,
          seed: 0,
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
          widthImageEnabled: false,
          widthImageInvert: false,
          widthImageStrength: 1,
          widthImageData: null,
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
  canvasSizeId: '80x120',
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
          amplitude: 50,
          spacing: 10,
          weight: 2,
          alpha: 0.5,
          seed: 0,
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
          widthImageEnabled: false,
          widthImageInvert: false,
          widthImageStrength: 1,
          widthImageData: null,
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

  it('widthMode "byAngle" keeps a single line a constant width along its length, while different lines get different widths', () => {
    const byAngleState: PatternState = {
      backgroundFillMode: 'solid',
      backgroundSolidColor: '#111111',
      backgroundColorStops: [{ id: 'bg0', position: 0, color: '#111111' }, { id: 'bg1', position: 1, color: '#111111' }],
      backgroundGradientAngle: 90, backgroundGradientType: 'linear',
      animationPlaying: false,
      animationSpeed: 1,
      orientation: 'landscape',
      canvasSizeId: '80x120',
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
          amplitude: 50,
          spacing: 10,
          weight: 2,
          alpha: 0.5,
          seed: 0,
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
          widthImageEnabled: false,
          widthImageInvert: false,
          widthImageStrength: 1,
          widthImageData: null,
        },
      ],
    };

    // Canvas is 200x200, so the axis origin (width/2 + widthCenterX,
    // height/2 + widthCenterY) is (100, 100). widthAngle=0 means the axis is
    // horizontal. This line's MIDPOINT (index 1, x=150) sits at signed
    // distance 50 along the axis, even though its endpoints sit at signed
    // distance 0 and 150 (clamped to the radius) respectively -- under the
    // new per-line-constant contract, every vertex must get the SAME width,
    // evaluated once at the midpoint.
    const line: Point[] = [
      { x: 100, y: 100 },
      { x: 150, y: 100 },
      { x: 250, y: 100 },
    ];
    const svg = buildSvgString(byAngleState, [[line]], 200, 200);

    const pathMatch = svg.match(/<path d="([^"]+)"/);
    expect(pathMatch).not.toBeNull();
    const d = pathMatch![1];

    // buildRibbon's contract: n "upper" points in point order, followed by n
    // "lower" points in REVERSE point order -- for our 3-point line the 6
    // ribbon vertices are [upper0, upper1, upper2, lower2, lower1, lower0].
    const coords = [...d.matchAll(/(-?\d+\.\d+),(-?\d+\.\d+)/g)].map(([, x, y]) => ({
      x: Number(x),
      y: Number(y),
    }));
    expect(coords).toHaveLength(6);

    const [upper0, upper1, upper2, lower2, lower1, lower0] = coords;

    const widthAt100 = Math.abs(upper0.y - lower0.y);
    const widthAt150 = Math.abs(upper1.y - lower1.y);
    const widthAt250 = Math.abs(upper2.y - lower2.y);

    expect(upper0.x).toBeCloseTo(100, 6);
    expect(upper1.x).toBeCloseTo(150, 6);
    expect(upper2.x).toBeCloseTo(250, 6);

    // Midpoint signed distance 50 (half the radius), linear shape -> t=0.75
    // -> interpolating from center(10) to end(2): 10 + 0.5*(2-10) = 6.
    // ALL THREE vertices must share this exact width.
    expect(widthAt100).toBeCloseTo(6, 6);
    expect(widthAt150).toBeCloseTo(6, 6);
    expect(widthAt250).toBeCloseTo(6, 6);

    // A second, differently-positioned line gets a DIFFERENT constant width:
    // this line's midpoint sits exactly at the axis origin (signed distance
    // 0), so its uniform width should be the full center value (10).
    const nearLine: Point[] = [
      { x: 90, y: 100 },
      { x: 100, y: 100 },
      { x: 110, y: 100 },
    ];
    const svg2 = buildSvgString(byAngleState, [[nearLine]], 200, 200);
    const pathMatch2 = svg2.match(/<path d="([^"]+)"/);
    expect(pathMatch2).not.toBeNull();
    const coords2 = [...pathMatch2![1].matchAll(/(-?\d+\.\d+),(-?\d+\.\d+)/g)].map(([, x, y]) => ({
      x: Number(x),
      y: Number(y),
    }));
    const [nUpper0, , , , , nLower0] = coords2;
    const widthOfNearLine = Math.abs(nUpper0.y - nLower0.y);
    expect(widthOfNearLine).toBeCloseTo(10, 6);
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
