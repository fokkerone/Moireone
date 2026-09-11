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
    amplitude: 0,
    spacing: 10,
    weight: 1,
    alpha: 1,
    seed: 0,
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
    fieldPoleDistance: 200,
    fieldLineCount: 24,
    fieldStrength: 0.6,
    radialOvality: 1,
    radialTwist: 0.5,
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

describe('computeLineWidths with reference-image brightness scaling', () => {
  // 4x4 canvas, 2x2 image (scale 2): quadrants map cleanly to the four
  // pixels. Points chosen well inside each quadrant to avoid boundary
  // rounding.
  //   (0.5, 0.5)  -> pixel (0,0) -> luminance 0 (dark)
  //   (3.5, 0.5)  -> pixel (1,0) -> luminance 1 (light)
  //   (0.5, 3.5)  -> pixel (0,1) -> luminance 1 (light)
  //   (3.5, 3.5)  -> pixel (1,1) -> luminance 0 (dark)
  const twoByTwoImage = {
    width: 2,
    height: 2,
    luminance: new Float32Array([0, 1, 1, 0]),
  };
  const CANVAS = 4;

  it('dark region, non-inverted, strength 1: width equals the full base width (unreduced)', () => {
    const layer = makeLayer({
      widthMode: 'alongLine',
      widthStart: 10,
      widthCenter: 10,
      widthEnd: 10,
      widthImageEnabled: true,
      widthImageInvert: false,
      widthImageStrength: 1,
      widthImageData: twoByTwoImage,
    });
    const line: Point[] = [{ x: 0.5, y: 0.5 }];
    const widths = computeLineWidths(line, layer, CANVAS, CANVAS);
    expect(widths[0]).toBeCloseTo(10, 6);
  });

  it('light region, non-inverted, strength 1: width is scaled down to the 0.1 floor', () => {
    const layer = makeLayer({
      widthMode: 'alongLine',
      widthStart: 10,
      widthCenter: 10,
      widthEnd: 10,
      widthImageEnabled: true,
      widthImageInvert: false,
      widthImageStrength: 1,
      widthImageData: twoByTwoImage,
    });
    const line: Point[] = [{ x: 3.5, y: 0.5 }];
    const widths = computeLineWidths(line, layer, CANVAS, CANVAS);
    expect(widths[0]).toBeCloseTo(0.1, 6);
  });

  it('invert = true swaps which region is thick vs. thin', () => {
    const layer = makeLayer({
      widthMode: 'alongLine',
      widthStart: 10,
      widthCenter: 10,
      widthEnd: 10,
      widthImageEnabled: true,
      widthImageInvert: true,
      widthImageStrength: 1,
      widthImageData: twoByTwoImage,
    });
    const darkPointLine: Point[] = [{ x: 0.5, y: 0.5 }]; // luminance 0
    const lightPointLine: Point[] = [{ x: 3.5, y: 0.5 }]; // luminance 1
    const darkWidths = computeLineWidths(darkPointLine, layer, CANVAS, CANVAS);
    const lightWidths = computeLineWidths(lightPointLine, layer, CANVAS, CANVAS);
    // Now the dark region should be thin (floor) and the light region thick (full).
    expect(darkWidths[0]).toBeCloseTo(0.1, 6);
    expect(lightWidths[0]).toBeCloseTo(10, 6);
  });

  it('strength = 0: image has zero effect regardless of luminance', () => {
    const layer = makeLayer({
      widthMode: 'alongLine',
      widthStart: 10,
      widthCenter: 10,
      widthEnd: 10,
      widthImageEnabled: true,
      widthImageInvert: false,
      widthImageStrength: 0,
      widthImageData: twoByTwoImage,
    });
    const darkPointLine: Point[] = [{ x: 0.5, y: 0.5 }];
    const lightPointLine: Point[] = [{ x: 3.5, y: 0.5 }];
    expect(computeLineWidths(darkPointLine, layer, CANVAS, CANVAS)[0]).toBeCloseTo(10, 6);
    expect(computeLineWidths(lightPointLine, layer, CANVAS, CANVAS)[0]).toBeCloseTo(10, 6);
  });

  it('strength = 0.5: result is exactly halfway between the base width and zero', () => {
    const layer = makeLayer({
      widthMode: 'alongLine',
      widthStart: 10,
      widthCenter: 10,
      widthEnd: 10,
      widthImageEnabled: true,
      widthImageInvert: false,
      widthImageStrength: 0.5,
      widthImageData: twoByTwoImage,
    });
    // Light region: luminance 1 -> brightnessFactor 0 (non-inverted) ->
    // scale = 1 + (0 - 1) * 0.5 = 0.5 -> width = baseWidth * 0.5 = 5,
    // comfortably above the 0.1 floor.
    const line: Point[] = [{ x: 3.5, y: 0.5 }];
    const widths = computeLineWidths(line, layer, CANVAS, CANVAS);
    expect(widths[0]).toBeCloseTo(5, 6);
  });

  it('widthImageData null: falls back to base width (no crash, as if strength were 0)', () => {
    const layer = makeLayer({
      widthMode: 'alongLine',
      widthStart: 10,
      widthCenter: 10,
      widthEnd: 10,
      widthImageEnabled: true,
      widthImageInvert: false,
      widthImageStrength: 1,
      widthImageData: null,
    });
    const line: Point[] = [{ x: 3.5, y: 0.5 }];
    expect(() => computeLineWidths(line, layer, CANVAS, CANVAS)).not.toThrow();
    const widths = computeLineWidths(line, layer, CANVAS, CANVAS);
    expect(widths[0]).toBeCloseTo(10, 6);
  });

  it('alongLine mode: two vertices on the same line with different luminance get different final widths', () => {
    const layer = makeLayer({
      widthMode: 'alongLine',
      widthStart: 10,
      widthCenter: 10,
      widthEnd: 10,
      widthImageEnabled: true,
      widthImageInvert: false,
      widthImageStrength: 1,
      widthImageData: twoByTwoImage,
    });
    // Same line, base width is constant (10) at every vertex by construction
    // (flat curve), so any difference below is purely from per-vertex image
    // sampling.
    const line: Point[] = [
      { x: 0.5, y: 0.5 }, // dark -> full width
      { x: 3.5, y: 0.5 }, // light -> floor width
    ];
    const widths = computeLineWidths(line, layer, CANVAS, CANVAS);
    expect(widths[0]).toBeCloseTo(10, 6);
    expect(widths[1]).toBeCloseTo(0.1, 6);
    expect(widths[0]).not.toBeCloseTo(widths[1], 1);
  });

  it('byPosition mode: vertices sharing the mode-computed base width still diverge by per-vertex luminance', () => {
    // Column-based luminance: left column dark (0), right column light (1),
    // independent of row, so we can vary x while keeping y fixed.
    const columnImage = {
      width: 2,
      height: 2,
      luminance: new Float32Array([0, 1, 0, 1]),
    };
    const layer = makeLayer({
      widthMode: 'byPosition',
      widthCenterX: 0,
      widthCenterY: 0,
      widthRadius: 100,
      widthStart: 2,
      widthCenter: 20,
      widthEnd: 2,
      widthImageEnabled: true,
      widthImageInvert: false,
      widthImageStrength: 1,
      widthImageData: columnImage,
    });
    // Canvas 200x200 -> reference point (100, 100). Midpoint (index 1) sits
    // exactly at the reference (distance 0) -> normalizedT 0.5 -> base width
    // = widthCenter = 20 for ALL vertices in this line (mode-constant rule).
    const line: Point[] = [
      { x: 50, y: 100 }, // left column -> dark -> full base width
      { x: 100, y: 100 }, // midpoint, reference for the mode's base width calc
      { x: 150, y: 100 }, // right column -> light -> floor width
    ];
    const widths = computeLineWidths(line, layer, 200, 200);
    expect(widths[0]).toBeCloseTo(20, 6); // dark -> unreduced base width
    expect(widths[2]).toBeCloseTo(0.1, 6); // light -> floored
    expect(widths[0]).not.toBeCloseTo(widths[2], 1);
  });

  it('a reference image on one layer does not affect a second, independent layer with no image (spec: Per-layer reference image)', () => {
    const line: Point[] = [{ x: 3.5, y: 0.5 }]; // light region of twoByTwoImage -> would floor if applied
    const layerWithImage = makeLayer({
      widthMode: 'alongLine',
      widthStart: 10,
      widthCenter: 10,
      widthEnd: 10,
      widthImageEnabled: true,
      widthImageInvert: false,
      widthImageStrength: 1,
      widthImageData: twoByTwoImage,
    });
    const layerWithoutImage = makeLayer({
      widthMode: 'alongLine',
      widthStart: 10,
      widthCenter: 10,
      widthEnd: 10,
      // widthImageEnabled/widthImageData default to false/null (no image assigned)
    });

    const widthsWithImage = computeLineWidths(line, layerWithImage, CANVAS, CANVAS);
    const widthsWithoutImage = computeLineWidths(line, layerWithoutImage, CANVAS, CANVAS);

    expect(widthsWithImage[0]).toBeCloseTo(0.1, 6); // reduced by the image
    expect(widthsWithoutImage[0]).toBeCloseTo(10, 6); // unaffected, full base width
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
