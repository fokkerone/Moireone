import { describe, it, expect } from 'vitest';
import { generateLayerLines } from './lineGenerator';
import type { LayerParams, NoiseFn } from './types';

const straightLayer: LayerParams = {
  fillMode: 'gradient', solidColor: '#000000', colorStops: [{ id: 's0', position: 0, color: '#000000' }, { id: 's1', position: 1, color: '#ffffff' }], gradientAngle: 90, gradientType: 'linear',
  baseAngle: 0,
  amplitude: 0,
  spacing: 20,
  weight: 1,
  alpha: 1,
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
  fieldPoleDistance: 200,
  fieldLineCount: 24,
  fieldStrength: 0.6,
  radialOvality: 1,
  radialTwist: 0.5,
};

const neutralNoise: NoiseFn = () => 0.5;

describe('generateLayerLines', () => {
  it('produces at least one line covering a 200x200 canvas', () => {
    const lines = generateLayerLines(straightLayer, 200, 200, neutralNoise);
    expect(lines.length).toBeGreaterThan(0);
  });

  it('produces a perfectly straight horizontal line when amplitude is 0', () => {
    const lines = generateLayerLines(straightLayer, 200, 200, neutralNoise);
    const straightLine = lines.find((line) => {
      const firstY = line[0].y;
      return line.every((p) => Math.abs(p.y - firstY) < 1e-9);
    });
    expect(straightLine).toBeDefined();
    expect(straightLine!.length).toBeGreaterThan(1);
  });

  it('keeps every point of every line within the canvas bounds', () => {
    const lines = generateLayerLines(straightLayer, 200, 200, neutralNoise);
    for (const line of lines) {
      for (const point of line) {
        expect(point.x).toBeGreaterThanOrEqual(-0.001);
        expect(point.x).toBeLessThanOrEqual(200.001);
        expect(point.y).toBeGreaterThanOrEqual(-0.001);
        expect(point.y).toBeLessThanOrEqual(200.001);
      }
    }
  });

  it('produces more lines when spacing is smaller', () => {
    const wideSpacing = generateLayerLines(straightLayer, 200, 200, neutralNoise);
    const tightSpacing = generateLayerLines({ ...straightLayer, spacing: 5 }, 200, 200, neutralNoise);
    expect(tightSpacing.length).toBeGreaterThan(wideSpacing.length);
  });

  it('generates lines that are exact rigid (parallel) translates of one another', () => {
    const width = 400;
    const height = 400;

    const curvingLayer: LayerParams = {
      fillMode: 'gradient', solidColor: '#000000', colorStops: [{ id: 's0', position: 0, color: '#000000' }, { id: 's1', position: 1, color: '#ffffff' }], gradientAngle: 90, gradientType: 'linear',
      baseAngle: 0,
      amplitude: 50,
      spacing: 40,
      weight: 1,
      alpha: 1,
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
      fieldPoleDistance: 200,
      fieldLineCount: 24,
      fieldStrength: 0.6,
      radialOvality: 1,
      radialTwist: 0.5,
    };

    // Deterministic, non-constant noise: the displacement genuinely varies
    // with position (it is NOT a constant offset), so if lines were
    // independently sampling the field at their own (x, y) they would
    // drift apart or converge instead of staying rigidly parallel.
    const curvingNoise: NoiseFn = (x) => 0.5 + 0.3 * Math.sin(x * 0.01);

    const lines = generateLayerLines(curvingLayer, width, height, curvingNoise);

    // Group lines by point-count. With baseAngle 0 the perpendicular offset
    // between parallel lines is purely vertical, so every line shares the
    // exact same x-trajectory (only its constant y-offset differs). Lines
    // whose y stays within the canvas for the whole transit will therefore
    // all have identical length (same entry/exit step indices).
    const byLength = new Map<number, (typeof lines)[number][]>();
    for (const line of lines) {
      const group = byLength.get(line.length) ?? [];
      group.push(line);
      byLength.set(line.length, group);
    }

    let chosenPair: [(typeof lines)[number], (typeof lines)[number]] | undefined;
    for (const [length, group] of byLength) {
      if (length > 50 && group.length >= 2) {
        chosenPair = [group[0], group[1]];
        break;
      }
    }

    expect(chosenPair).toBeDefined();
    const [lineA, lineB] = chosenPair!;
    expect(lineA.length).toBe(lineB.length);
    expect(lineA.length).toBeGreaterThan(50);

    const EPSILON = 1e-9;
    const firstDx = lineB[0].x - lineA[0].x;
    const firstDy = lineB[0].y - lineA[0].y;

    for (let k = 0; k < lineA.length; k++) {
      const dx = lineB[k].x - lineA[k].x;
      const dy = lineB[k].y - lineA[k].y;
      expect(Math.abs(dx - firstDx)).toBeLessThan(EPSILON);
      expect(Math.abs(dy - firstDy)).toBeLessThan(EPSILON);
    }

    // Because baseAngle is 0, the perpendicular direction is purely
    // vertical: the constant separation vector must have (almost) no
    // horizontal component.
    expect(Math.abs(firstDx)).toBeLessThan(1e-6);

    // The constant vertical separation must be a whole-number multiple of
    // the layer's spacing (since every line's points are the shared base
    // point plus (sharedDisplacement + i * spacing) along the perpendicular).
    const spacingMultiple = firstDy / curvingLayer.spacing;
    expect(Math.abs(spacingMultiple - Math.round(spacingMultiple))).toBeLessThan(1e-6);
    expect(Math.round(spacingMultiple)).not.toBe(0);
  });

  it('shifts the entire generated pattern by exactly (offsetX, offsetY)', () => {
    const width = 400;
    const height = 400;

    const baseLayer: LayerParams = {
      fillMode: 'gradient', solidColor: '#000000', colorStops: [{ id: 's0', position: 0, color: '#000000' }, { id: 's1', position: 1, color: '#ffffff' }], gradientAngle: 90, gradientType: 'linear',
      baseAngle: 0,
      amplitude: 0,
      spacing: 20,
      weight: 1,
      alpha: 1,
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
      fieldPoleDistance: 200,
      fieldLineCount: 24,
      fieldStrength: 0.6,
      radialOvality: 1,
      radialTwist: 0.5,
    };
    const offsetLayer: LayerParams = { ...baseLayer, offsetX: 50, offsetY: 30 };

    const neutralNoise: NoiseFn = () => 0.5;

    const baseLines = generateLayerLines(baseLayer, width, height, neutralNoise);
    const offsetLines = generateLayerLines(offsetLayer, width, height, neutralNoise);

    // amplitude 0 -> every line is perfectly horizontal; the "center" line
    // (perpendicular offset 0) sits at y = height/2 for the base layer and
    // y = height/2 + offsetY for the offset layer.
    const baseCenter = baseLines.find((line) =>
      line.every((p) => Math.abs(p.y - height / 2) < 1e-6)
    );
    const offsetCenter = offsetLines.find((line) =>
      line.every((p) => Math.abs(p.y - (height / 2 + 30)) < 1e-6)
    );

    expect(baseCenter).toBeDefined();
    expect(offsetCenter).toBeDefined();
    expect(baseCenter!.length).toBeGreaterThan(2);
    expect(offsetCenter!.length).toBeGreaterThan(2);

    // Pick a point from the middle of the base line (safely away from
    // canvas-edge clipping, whose entry/exit step differs slightly between
    // the two runs because of the x-offset) and locate the point in the
    // offset line generated from the exact same underlying travel-axis
    // step -- identified by its x-coordinate landing at exactly
    // basePoint.x + offsetX, since the offset shifts the whole travel axis
    // by a constant amount independent of step index.
    const basePoint = baseCenter![Math.floor(baseCenter!.length / 2)];
    const matchingOffsetPoint = offsetCenter!.find(
      (p) => Math.abs(p.x - (basePoint.x + 50)) < 1e-6
    );

    expect(matchingOffsetPoint).toBeDefined();
    expect(matchingOffsetPoint!.x - basePoint.x).toBeCloseTo(50, 6);
    expect(matchingOffsetPoint!.y - basePoint.y).toBeCloseTo(30, 6);
  });

  it('resumes as a NEW segment when a line exits the canvas and later re-enters', () => {
    // Wide canvas so the natural x-exit (baseX > width) happens well after
    // our engineered y-excursion, giving room to observe a genuine
    // exit-then-re-entry rather than the line just ending.
    const width = 1000;
    const height = 200;

    const bounceLayer: LayerParams = {
      fillMode: 'gradient', solidColor: '#000000', colorStops: [{ id: 's0', position: 0, color: '#000000' }, { id: 's1', position: 1, color: '#ffffff' }], gradientAngle: 90, gradientType: 'linear',
      baseAngle: 0,
      // The texture noise is sampled at `baseX * TEXTURE_NOISE_SCALE`
      // (0.001), so the mock below keys its phases off the SCALED x
      // coordinate (raw x 300 -> 0.3, raw x 500 -> 0.5). amplitude is 0
      // (no macro-shape contribution) so the texture layer alone drives the
      // displacement in this test.
      amplitude: 0,
      spacing: 40,
      weight: 1,
      alpha: 1,
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
      textureAmplitude: 150,
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
      fieldPoleDistance: 200,
      fieldLineCount: 24,
      fieldStrength: 0.6,
      radialOvality: 1,
      radialTwist: 0.5,
    };

    // Deterministic noise keyed on the SCALED x coordinate the generator
    // passes in (baseX * 0.001), which is a pure function of position:
    //   rawX < 300        -> neutral (0.5): texture offset 0, line in-bounds
    //   300 <= rawX < 500 -> full positive (1): texture offset +150, y = 250,
    //                        which is outside height=200 -> line exits
    //   rawX >= 500       -> neutral (0.5) again: texture offset 0, line
    //                        re-enters at y = 100
    const bouncingNoise: NoiseFn = (scaledX) => {
      if (scaledX < 0.3) return 0.5;
      if (scaledX < 0.5) return 1;
      return 0.5;
    };

    const lines = generateLayerLines(bounceLayer, width, height, bouncingNoise);

    // Independently computed (pure arithmetic, not re-deriving the
    // production algorithm) geometry of the center line (offset 0, i.e. the
    // undisplaced travel line itself, whose y sits at exactly height/2 = 100
    // whenever displacement is 0):
    const diagonal = Math.sqrt(width * width + height * height);
    // The generator spans `reach = 2 * diagonal` each side of the layer
    // center along the travel axis (baseAngle 0, offset 0 -> centerX = width/2).
    const startX = width / 2 - 2 * diagonal;
    const STEP_LENGTH = 4;

    // Only the center line (perpendicular offset 0) sits at y === 100
    // during its neutral phases; every other parallel line sits at
    // 100 + i * spacing !== 100, so filtering for "all points at y ~ 100"
    // isolates exactly the center line's segments.
    const centerSegments = lines.filter((line) =>
      line.every((p) => Math.abs(p.y - 100) < 1e-6)
    );

    expect(centerSegments.length).toBeGreaterThanOrEqual(2);

    // Sort by x so we can identify the "before the dip" and "after the dip"
    // segments unambiguously.
    const sorted = [...centerSegments].sort((a, b) => a[0].x - b[0].x);
    const segment1 = sorted[0];
    const segment2 = sorted[1];

    // Step index where baseX first reaches 300 / first reaches 500.
    const stepAt300 = Math.ceil((300 - startX) / STEP_LENGTH);
    const stepAt500 = Math.ceil((500 - startX) / STEP_LENGTH);

    const seg1LastX = startX + STEP_LENGTH * (stepAt300 - 1);
    const seg2FirstX = startX + STEP_LENGTH * stepAt500;

    expect(segment1[segment1.length - 1].x).toBeCloseTo(seg1LastX, 6);
    expect(segment2[0].x).toBeCloseTo(seg2FirstX, 6);

    // Prove a REAL gap exists between the two segments -- not adjacent
    // steps -- i.e. the line genuinely left the canvas for a stretch of
    // steps rather than this being one contiguous walk that happens to be
    // split into two arrays.
    const gap = segment2[0].x - segment1[segment1.length - 1].x;
    expect(gap).toBeGreaterThan(STEP_LENGTH * 2);

    // And both segments must be real, non-degenerate line segments.
    expect(segment1.length).toBeGreaterThan(1);
    expect(segment2.length).toBeGreaterThan(1);
  });

  it('generates lines that are exact rigid (parallel) translates of one another with a non-default macro shape', () => {
    const width = 400;
    const height = 400;

    const macroLayer: LayerParams = {
      fillMode: 'gradient', solidColor: '#000000', colorStops: [{ id: 's0', position: 0, color: '#000000' }, { id: 's1', position: 1, color: '#ffffff' }], gradientAngle: 90, gradientType: 'linear',
      baseAngle: 0,
      amplitude: 80,
      spacing: 40,
      weight: 1,
      alpha: 1,
      seed: 0,
      visible: true,
      offsetX: 0,
      offsetY: 0,
      widthCurveEnabled: false,
      widthCurveShape: 'linear',
      widthStart: 1,
      widthCenter: 1,
      widthEnd: 1,
      macroShape: 'circle',
      macroRadius: 300,
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
      fieldPoleDistance: 200,
      fieldLineCount: 24,
      fieldStrength: 0.6,
      radialOvality: 1,
      radialTwist: 0.5,
    };

    const neutralNoise: NoiseFn = () => 0.5;

    const lines = generateLayerLines(macroLayer, width, height, neutralNoise);

    // Group lines by point-count, same technique as the noise-driven
    // parallelism test above: lines sharing the same entry/exit step range
    // have identical length.
    const byLength = new Map<number, (typeof lines)[number][]>();
    for (const line of lines) {
      const group = byLength.get(line.length) ?? [];
      group.push(line);
      byLength.set(line.length, group);
    }

    let chosenPair: [(typeof lines)[number], (typeof lines)[number]] | undefined;
    for (const [length, group] of byLength) {
      if (length > 50 && group.length >= 2) {
        chosenPair = [group[0], group[1]];
        break;
      }
    }

    expect(chosenPair).toBeDefined();
    const [lineA, lineB] = chosenPair!;
    expect(lineA.length).toBe(lineB.length);
    expect(lineA.length).toBeGreaterThan(50);

    const EPSILON = 1e-9;
    const firstDx = lineB[0].x - lineA[0].x;
    const firstDy = lineB[0].y - lineA[0].y;

    // The macro shape's offset at a given step depends only on that step's
    // distance from the domain center, never on which parallel line/offset
    // is being drawn -- so every line still shares the exact same
    // displacement at each step, and the separation vector between any two
    // parallel lines must stay constant across all shared steps.
    for (let k = 0; k < lineA.length; k++) {
      const dx = lineB[k].x - lineA[k].x;
      const dy = lineB[k].y - lineA[k].y;
      expect(Math.abs(dx - firstDx)).toBeLessThan(EPSILON);
      expect(Math.abs(dy - firstDy)).toBeLessThan(EPSILON);
    }

    expect(Math.abs(firstDx)).toBeLessThan(1e-6);
    const spacingMultiple = firstDy / macroLayer.spacing;
    expect(Math.abs(spacingMultiple - Math.round(spacingMultiple))).toBeLessThan(1e-6);
    expect(Math.round(spacingMultiple)).not.toBe(0);
  });

  it('textureAmplitude > 0 adds a real, non-constant perturbation on top of the macro shape', () => {
    const width = 400;
    const height = 400;

    const baseLayer: LayerParams = {
      fillMode: 'gradient', solidColor: '#000000', colorStops: [{ id: 's0', position: 0, color: '#000000' }, { id: 's1', position: 1, color: '#ffffff' }], gradientAngle: 90, gradientType: 'linear',
      baseAngle: 0,
      amplitude: 80,
      spacing: 10000, // keep only the center line so there is exactly one to compare
      weight: 1,
      alpha: 1,
      seed: 0,
      visible: true,
      offsetX: 0,
      offsetY: 0,
      widthCurveEnabled: false,
      widthCurveShape: 'linear',
      widthStart: 1,
      widthCenter: 1,
      widthEnd: 1,
      macroShape: 'parabola',
      macroRadius: 300,
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
      fieldPoleDistance: 200,
      fieldLineCount: 24,
      fieldStrength: 0.6,
      radialOvality: 1,
      radialTwist: 0.5,
    };

    const texturedLayer: LayerParams = { ...baseLayer, textureAmplitude: 50 };

    // Non-constant deterministic noise so the texture layer genuinely
    // varies point-to-point rather than adding a uniform constant.
    const varyingNoise: NoiseFn = (x) => 0.5 + 0.3 * Math.sin(x * 0.01);

    const plainLines = generateLayerLines(baseLayer, width, height, varyingNoise);
    const texturedLines = generateLayerLines(texturedLayer, width, height, varyingNoise);

    expect(plainLines.length).toBeGreaterThan(0);
    expect(texturedLines.length).toBeGreaterThan(0);

    const plainLine = plainLines[0];
    const texturedLine = texturedLines[0];
    expect(plainLine.length).toBe(texturedLine.length);
    expect(plainLine.length).toBeGreaterThan(10);

    // The two lines must differ (texture has a real effect)...
    let sawDifference = false;
    // ...and must NOT differ by a constant amount (it's a genuine varying
    // perturbation, not just a uniform shift of the macro shape).
    let firstDiff: number | null = null;
    let sawNonConstantDiff = false;

    for (let k = 0; k < plainLine.length; k++) {
      const diff = texturedLine[k].y - plainLine[k].y;
      if (Math.abs(diff) > 1e-9) {
        sawDifference = true;
      }
      if (firstDiff === null) {
        firstDiff = diff;
      } else if (Math.abs(diff - firstDiff) > 1e-6) {
        sawNonConstantDiff = true;
      }
    }

    expect(sawDifference).toBe(true);
    expect(sawNonConstantDiff).toBe(true);
  });
});

describe('generateLayerLines - fieldLines macro shape', () => {
  const fieldLayer: LayerParams = {
    ...straightLayer,
    macroShape: 'fieldLines',
    fieldPoleDistance: 200,
    fieldLineCount: 24,
    fieldStrength: 0.6,
  };

  it('produces at least one line, entirely finite and within canvas bounds', () => {
    const lines = generateLayerLines(fieldLayer, 400, 400, neutralNoise);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.length).toBeGreaterThan(1);
      for (const p of line) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
        expect(p.x).toBeGreaterThanOrEqual(-0.001);
        expect(p.x).toBeLessThanOrEqual(400.001);
        expect(p.y).toBeGreaterThanOrEqual(-0.001);
        expect(p.y).toBeLessThanOrEqual(400.001);
      }
    }
  });

  it('produces more lines when fieldLineCount is higher', () => {
    const few = generateLayerLines({ ...fieldLayer, fieldLineCount: 4 }, 400, 400, neutralNoise);
    const many = generateLayerLines({ ...fieldLayer, fieldLineCount: 40 }, 400, 400, neutralNoise);
    expect(many.length).toBeGreaterThan(few.length);
  });

  it('fieldStrength = 0 traces straight rays away from the + pole', () => {
    const straightField = { ...fieldLayer, fieldStrength: 0, spacing: 60 };
    const lines = generateLayerLines(straightField, 600, 600, neutralNoise);
    expect(lines.length).toBeGreaterThan(0);

    // A pure radial ray from a fixed origin keeps every point collinear
    // with the first two points of that same line.
    for (const line of lines) {
      if (line.length < 3) continue;
      const [p0, p1] = line;
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      for (const p of line) {
        const cross = (p.x - p0.x) * dy - (p.y - p0.y) * dx;
        expect(Math.abs(cross)).toBeLessThan(1e-3 * Math.max(1, Math.hypot(dx, dy)));
      }
    }
  });

  it('fieldStrength = 1 curves lines away from the straight-ray path', () => {
    const straightLines = generateLayerLines({ ...fieldLayer, fieldStrength: 0, spacing: 60 }, 600, 600, neutralNoise);
    const curvedLines = generateLayerLines({ ...fieldLayer, fieldStrength: 1, spacing: 60 }, 600, 600, neutralNoise);
    expect(straightLines.length).toBeGreaterThan(0);
    expect(curvedLines.length).toBeGreaterThan(0);

    const longestCurved = curvedLines.reduce((a, b) => (b.length > a.length ? b : a));
    expect(longestCurved.length).toBeGreaterThan(2);
    const [p0, p1] = longestCurved;
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const last = longestCurved[longestCurved.length - 1];
    const cross = (last.x - p0.x) * dy - (last.y - p0.y) * dx;
    // A curved field line should NOT stay collinear with its own start
    // direction all the way to its end point.
    expect(Math.abs(cross)).toBeGreaterThan(1e-3 * Math.max(1, Math.hypot(dx, dy)));
  });
});

describe('generateLayerLines - radial macro shape', () => {
  const radialLayer: LayerParams = {
    ...straightLayer,
    macroShape: 'radial',
    macroRadius: 150,
    radialOvality: 1,
    radialTwist: 0.5,
  };

  it('produces at least one line, entirely finite and within canvas bounds', () => {
    const lines = generateLayerLines(radialLayer, 400, 400, neutralNoise);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.length).toBeGreaterThan(1);
      for (const p of line) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
        expect(p.x).toBeGreaterThanOrEqual(-0.001);
        expect(p.x).toBeLessThanOrEqual(400.001);
        expect(p.y).toBeGreaterThanOrEqual(-0.001);
        expect(p.y).toBeLessThanOrEqual(400.001);
      }
    }
  });

  it('shifts the whole pattern when offsetX/offsetY (the center) changes', () => {
    const base = generateLayerLines(radialLayer, 400, 400, neutralNoise);
    const moved = generateLayerLines({ ...radialLayer, offsetX: 50, offsetY: -30 }, 400, 400, neutralNoise);
    expect(base.length).toBeGreaterThan(0);
    expect(moved.length).toBeGreaterThan(0);
    // Not a strict per-point comparison (canvas clipping reshapes segments
    // near the edges), just proof the center actually moved the output.
    const baseFirst = base[0][0];
    const movedFirst = moved[0][0];
    const sameStart = Math.abs(baseFirst.x - movedFirst.x) < 1e-6 && Math.abs(baseFirst.y - movedFirst.y) < 1e-6;
    expect(sameStart).toBe(false);
  });

  it('radialTwist = 0 produces straight rays from the center', () => {
    const straightRadial = { ...radialLayer, radialTwist: 0, radialOvality: 1, spacing: 80 };
    const lines = generateLayerLines(straightRadial, 800, 800, neutralNoise);
    expect(lines.length).toBeGreaterThan(0);

    for (const line of lines) {
      if (line.length < 3) continue;
      const [p0, p1] = line;
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      for (const p of line) {
        const cross = (p.x - p0.x) * dy - (p.y - p0.y) * dx;
        expect(Math.abs(cross)).toBeLessThan(1e-3 * Math.max(1, Math.hypot(dx, dy)));
      }
    }
  });

  it('radialTwist != 0 curves the rays (no longer collinear end-to-end)', () => {
    const twisted = { ...radialLayer, radialTwist: 1.2, radialOvality: 1, spacing: 80 };
    const lines = generateLayerLines(twisted, 800, 800, neutralNoise);
    const longest = lines.reduce((a, b) => (b.length > a.length ? b : a));
    expect(longest.length).toBeGreaterThan(2);
    const [p0, p1] = longest;
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const last = longest[longest.length - 1];
    const cross = (last.x - p0.x) * dy - (last.y - p0.y) * dx;
    expect(Math.abs(cross)).toBeGreaterThan(1e-3 * Math.max(1, Math.hypot(dx, dy)));
  });
});

describe('generateLayerLines - rings macro shape', () => {
  const ringsLayer: LayerParams = {
    ...straightLayer,
    macroShape: 'rings',
    spacing: 40,
    radialOvality: 1,
  };

  it('produces at least one line, entirely finite and within canvas bounds', () => {
    const lines = generateLayerLines(ringsLayer, 400, 400, neutralNoise);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.length).toBeGreaterThan(1);
      for (const p of line) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
        expect(p.x).toBeGreaterThanOrEqual(-0.001);
        expect(p.x).toBeLessThanOrEqual(400.001);
        expect(p.y).toBeGreaterThanOrEqual(-0.001);
        expect(p.y).toBeLessThanOrEqual(400.001);
      }
    }
  });

  it('every point of every ring sits at a consistent distance from the center (a real circle, not a taper)', () => {
    // Large canvas + only the center portion, so full untruncated rings
    // are present and easy to reason about.
    const lines = generateLayerLines({ ...ringsLayer, spacing: 100 }, 1000, 1000, neutralNoise);
    const centerX = 500;
    const centerY = 500;

    // Pick a ring that's fully inside the canvas (a single closed segment
    // whose points don't touch the canvas edge).
    const fullRing = lines.find((line) =>
      line.length > 20 && line.every((p) => p.x > 10 && p.x < 990 && p.y > 10 && p.y < 990)
    );
    expect(fullRing).toBeDefined();

    const radii = fullRing!.map((p) => Math.hypot(p.x - centerX, p.y - centerY));
    const minR = Math.min(...radii);
    const maxR = Math.max(...radii);
    // All points on one ring should be at (nearly) the same radius.
    expect(maxR - minR).toBeLessThan(1);
  });

  it('produces more rings when spacing is smaller (denser radius steps)', () => {
    const wide = generateLayerLines({ ...ringsLayer, spacing: 200 }, 1000, 1000, neutralNoise);
    const tight = generateLayerLines({ ...ringsLayer, spacing: 20 }, 1000, 1000, neutralNoise);
    expect(tight.length).toBeGreaterThan(wide.length);
  });

  it('shifts the whole pattern when offsetX/offsetY (the center) changes', () => {
    const base = generateLayerLines(ringsLayer, 400, 400, neutralNoise);
    const moved = generateLayerLines({ ...ringsLayer, offsetX: 60, offsetY: -40 }, 400, 400, neutralNoise);
    expect(base.length).toBeGreaterThan(0);
    expect(moved.length).toBeGreaterThan(0);
    const baseFirst = base[0][0];
    const movedFirst = moved[0][0];
    const sameStart = Math.abs(baseFirst.x - movedFirst.x) < 1e-6 && Math.abs(baseFirst.y - movedFirst.y) < 1e-6;
    expect(sameStart).toBe(false);
  });
});
