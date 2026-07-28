import { describe, it, expect } from 'vitest';
import { computeLineWidths } from './lineWidths';
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
