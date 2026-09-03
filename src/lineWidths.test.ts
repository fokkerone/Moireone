import { describe, it, expect } from 'vitest';
import { computeLineWidths, sampleImageLuminance } from './lineWidths';
import type { LayerParams, Point } from './types';

function makeLayer(overrides: Partial<LayerParams> = {}): LayerParams {
  return {
    fillMode: 'solid',
    solidColor: '#ffffff',
    colorStops: [],
    gradientAngle: 0,
    gradientType: 'linear',
    baseAngle: 0,
    noiseScale: 0.01,
    amplitude: 0,
    spacing: 10,
    weight: 1,
    alpha: 1,
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
    widthMode: 'byPosition',
    widthCenterX: 0,
    widthCenterY: 0,
    widthRadius: 100,
    widthAngle: 0,
    macroShape: 'smooth',
    macroRadius: 800,
    textureAmplitude: 0,
    animationPaused: false,
    widthImageEnabled: false,
    widthImageInvert: false,
    widthImageStrength: 1,
    widthImageData: null,
    ...overrides,
  };
}

describe('computeLineWidths', () => {
  it('alongLine: varies continuously per point (unchanged behavior)', () => {
    const layer = makeLayer({ widthMode: 'alongLine', widthStart: 2, widthCenter: 20, widthEnd: 2 });
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ];
    const widths = computeLineWidths(line, layer, 200, 200);
    expect(widths[0]).toBeCloseTo(2, 6);
    expect(widths[1]).toBeCloseTo(20, 6);
    expect(widths[2]).toBeCloseTo(2, 6);
  });

  it('byPosition: every point of a single line gets the SAME width, even though points sit at very different distances from the reference', () => {
    const layer = makeLayer({
      widthMode: 'byPosition',
      widthCenterX: 0,
      widthCenterY: 0,
      widthRadius: 100,
      widthStart: 2,
      widthCenter: 20,
      widthEnd: 2,
    });
    // Canvas 200x200 -> reference point (100, 100).
    // Points sit at distance 0, 50, 100 from the reference -- under the OLD
    // per-point behavior these would have gotten three different widths.
    const line: Point[] = [
      { x: 100, y: 100 },
      { x: 100, y: 150 },
      { x: 100, y: 200 },
    ];
    const widths = computeLineWidths(line, layer, 200, 200);

    // Midpoint (index 1) sits at distance 50 -> normalizedDistance 0.5 ->
    // t = 0.75 -> linear interpolation from center(20) to end(2) at t=0.75
    // within [0.5, 1]: 20 + (0.75-0.5)/0.5 * (2-20) = 20 - 9 = 11.
    expect(widths[0]).toBeCloseTo(11, 6);
    expect(widths[1]).toBeCloseTo(11, 6);
    expect(widths[2]).toBeCloseTo(11, 6);
  });

  it('byPosition: a different line (different overall position) gets a different, still-constant width', () => {
    const layer = makeLayer({
      widthMode: 'byPosition',
      widthCenterX: 0,
      widthCenterY: 0,
      widthRadius: 100,
      widthStart: 2,
      widthCenter: 20,
      widthEnd: 2,
    });
    // This line's midpoint sits exactly at the reference point (distance 0),
    // so it should get the full center width (20) uniformly.
    const nearLine: Point[] = [
      { x: 50, y: 100 },
      { x: 100, y: 100 },
      { x: 150, y: 100 },
    ];
    const widths = computeLineWidths(nearLine, layer, 200, 200);
    expect(widths[0]).toBeCloseTo(20, 6);
    expect(widths[1]).toBeCloseTo(20, 6);
    expect(widths[2]).toBeCloseTo(20, 6);
  });

  it('byAngle: every point of a single line gets the SAME width, using the axis-projected distance at the midpoint', () => {
    const layer = makeLayer({
      widthMode: 'byAngle',
      widthAngle: 0,
      widthCenterX: 0,
      widthCenterY: 0,
      widthRadius: 100,
      widthStart: 2,
      widthCenter: 10,
      widthEnd: 2,
    });
    // Canvas 200x200 -> axis origin (100, 100), horizontal axis.
    // Points at x=100 (origin, signed distance 0) and x=200 (signed distance
    // 100 == widthRadius, the "end" extreme) -- midpoint is the second point
    // in a 2-point line (index 1), i.e. the far point.
    const line: Point[] = [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ];
    const widths = computeLineWidths(line, layer, 200, 200);
    expect(widths[0]).toBeCloseTo(widths[1], 10);
    // midpoint (index 1, x=200) -> signed distance 100 -> normalizedT = 1 -> widthEnd = 2.
    expect(widths[0]).toBeCloseTo(2, 6);
  });
});

describe('sampleImageLuminance', () => {
  it('maps canvas positions to the exact pixel luminance when aspect ratios match (no crop)', () => {
    // 2x2 image, canvas exactly matching aspect ratio (200x200 -> scale 100).
    const imageData = {
      width: 2,
      height: 2,
      // row-major: [ (0,0), (1,0), (0,1), (1,1) ]
      luminance: new Float32Array([0.1, 0.9, 0.3, 0.7]),
    };
    const canvasWidth = 200;
    const canvasHeight = 200;

    // Center of top-left pixel (0,0) is at image coords (0.5, 0.5) -> canvas (50, 50).
    expect(sampleImageLuminance(imageData, 50, 50, canvasWidth, canvasHeight)).toBeCloseTo(0.1, 6);
    // Center of top-right pixel (1,0) -> image coords (1.5, 0.5) -> canvas (150, 50).
    expect(sampleImageLuminance(imageData, 150, 50, canvasWidth, canvasHeight)).toBeCloseTo(0.9, 6);
    // Center of bottom-left pixel (0,1) -> image coords (0.5, 1.5) -> canvas (50, 150).
    expect(sampleImageLuminance(imageData, 50, 150, canvasWidth, canvasHeight)).toBeCloseTo(0.3, 6);
    // Center of bottom-right pixel (1,1) -> image coords (1.5, 1.5) -> canvas (150, 150).
    expect(sampleImageLuminance(imageData, 150, 150, canvasWidth, canvasHeight)).toBeCloseTo(0.7, 6);
  });

  it('cover-fit: wide image on a tall canvas keeps all sampled positions in-bounds', () => {
    // Wide image (400x100), tall canvas (100x400).
    const width = 400;
    const height = 100;
    const luminance = new Float32Array(width * height);
    for (let i = 0; i < luminance.length; i++) {
      luminance[i] = (i % 100) / 100; // valid [0,1) values throughout
    }
    const imageData = { width, height, luminance };
    const canvasWidth = 100;
    const canvasHeight = 400;

    const positions: Point[] = [
      { x: 0, y: 0 },
      { x: canvasWidth, y: 0 },
      { x: 0, y: canvasHeight },
      { x: canvasWidth, y: canvasHeight },
      { x: canvasWidth / 2, y: canvasHeight / 2 },
    ];

    for (const p of positions) {
      const v = sampleImageLuminance(imageData, p.x, p.y, canvasWidth, canvasHeight);
      expect(v).not.toBeNaN();
      expect(v).toBeDefined();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('cover-fit: tall image on a wide canvas keeps all sampled positions in-bounds', () => {
    // Tall image (100x400), wide canvas (400x100).
    const width = 100;
    const height = 400;
    const luminance = new Float32Array(width * height);
    for (let i = 0; i < luminance.length; i++) {
      luminance[i] = (i % 100) / 100;
    }
    const imageData = { width, height, luminance };
    const canvasWidth = 400;
    const canvasHeight = 100;

    const positions: Point[] = [
      { x: 0, y: 0 },
      { x: canvasWidth, y: 0 },
      { x: 0, y: canvasHeight },
      { x: canvasWidth, y: canvasHeight },
      { x: canvasWidth / 2, y: canvasHeight / 2 },
    ];

    for (const p of positions) {
      const v = sampleImageLuminance(imageData, p.x, p.y, canvasWidth, canvasHeight);
      expect(v).not.toBeNaN();
      expect(v).toBeDefined();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('canvas-edge positions (x=0, x=width, y=0, y=height) do not throw and return in-bounds values', () => {
    const width = 10;
    const height = 10;
    const luminance = new Float32Array(width * height).fill(0.5);
    const imageData = { width, height, luminance };
    const canvasWidth = 300;
    const canvasHeight = 150;

    const edgePositions: Point[] = [
      { x: 0, y: 0 },
      { x: canvasWidth, y: 0 },
      { x: 0, y: canvasHeight },
      { x: canvasWidth, y: canvasHeight },
      { x: 0, y: canvasHeight / 2 },
      { x: canvasWidth, y: canvasHeight / 2 },
      { x: canvasWidth / 2, y: 0 },
      { x: canvasWidth / 2, y: canvasHeight },
    ];

    for (const p of edgePositions) {
      expect(() => sampleImageLuminance(imageData, p.x, p.y, canvasWidth, canvasHeight)).not.toThrow();
      const v = sampleImageLuminance(imageData, p.x, p.y, canvasWidth, canvasHeight);
      expect(v).not.toBeNaN();
      expect(v).toBe(0.5);
    }
  });

  it('does not return NaN or undefined for a corner position on a mismatched-aspect image/canvas pair', () => {
    const width = 3;
    const height = 7;
    const luminance = new Float32Array(width * height);
    for (let i = 0; i < luminance.length; i++) luminance[i] = 0.42;
    const imageData = { width, height, luminance };

    const v = sampleImageLuminance(imageData, 0, 0, 500, 333);
    expect(v).not.toBeNaN();
    expect(v).not.toBeUndefined();
    expect(v).toBeCloseTo(0.42, 6);
  });
});
