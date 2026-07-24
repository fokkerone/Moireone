import { describe, it, expect } from 'vitest';
import { generateLayerLines } from './lineGenerator';
import type { LayerParams, NoiseFn } from './types';

const MAX_STEPS = 2000;

const straightLayer: LayerParams = {
  color: '#00ff00',
  baseAngle: 0,
  noiseScale: 0.01,
  noiseStrength: 0,
  spacing: 20,
  weight: 1,
  alpha: 1,
  seed: 0,
};

const neutralNoise: NoiseFn = () => 0.5;

describe('generateLayerLines', () => {
  it('produces at least one line covering a 200x200 canvas', () => {
    const lines = generateLayerLines(straightLayer, 200, 200, neutralNoise);
    expect(lines.length).toBeGreaterThan(0);
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
      color: '#ff00ff',
      baseAngle: 0,
      noiseScale: 0.01,
      noiseStrength: 15,
      spacing: 40,
      weight: 1,
      alpha: 1,
      seed: 0,
    };

    // Deterministic, non-constant noise: the path genuinely curves (it is
    // NOT a constant deviation), so if lines were still sampling the field
    // independently at their own (x, y) they would drift apart or converge
    // instead of staying rigidly parallel.
    const curvingNoise: NoiseFn = (x) => 0.5 + 0.3 * Math.sin(x);

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
    // the layer's spacing (since every start point is offset by i * spacing
    // along the perpendicular direction).
    const spacingMultiple = firstDy / curvingLayer.spacing;
    expect(Math.abs(spacingMultiple - Math.round(spacingMultiple))).toBeLessThan(1e-6);
    expect(Math.round(spacingMultiple)).not.toBe(0);
  });

  it('resumes as a NEW segment when the spine exits the canvas and later re-enters', () => {
    const width = 400;
    const height = 200;

    const bounceLayer: LayerParams = {
      color: '#0000ff',
      baseAngle: 0,
      noiseScale: 0.01,
      noiseStrength: 90,
      spacing: 40,
      weight: 1,
      alpha: 1,
      seed: 0,
    };

    // Deterministic noise keyed on the STEP INDEX via a closure counter --
    // NOT on x/y or on which line is being traced. In the spine-based
    // implementation the noise function is only ever sampled once per step,
    // along the single shared spine trace, so per-line-call semantics no
    // longer make sense here.
    //
    // Phase A (steps 0-89):    deviation 0   -> straight travel, carries the
    //                          spine from its off-canvas start into the
    //                          canvas along +x.
    // Phase B (steps 90-129):  deviation +90 -> the spine dives straight
    //                          down (dx=0, dy=+STEP), driving y out past
    //                          the bottom of the canvas (height=200).
    // Phase C (steps 130-169): deviation -90 -> the spine climbs back up
    //                          (dx=0, dy=-STEP), bringing y back inside.
    // Phase D (steps 170+):    deviation 0   -> straight travel resumes
    //                          until the spine eventually exits through
    //                          x > width.
    let step = -1;
    const bouncingNoise: NoiseFn = () => {
      step++;
      if (step >= 90 && step < 130) return 1; // full +deviation -> angle +90
      if (step >= 130 && step < 170) return 0; // full -deviation -> angle -90
      return 0.5; // no deviation -> straight travel along baseAngle
    };

    const lines = generateLayerLines(bounceLayer, width, height, bouncingNoise);

    // Independently computed (pure arithmetic, not re-deriving the
    // production algorithm) expected geometry of the center line (offset 0,
    // which reproduces the spine's own trajectory exactly):
    const diagonal = Math.sqrt(width * width + height * height);
    const spineStartX = width / 2 - diagonal;
    const EPSILON = 1e-6;

    // Segment 1: accumulates while the spine travels straight in from
    // off-canvas (k=62, first in-bounds step) until y hits exactly 200 at
    // k=115 (last in-bounds step before the dive pushes y out of range).
    const seg1FirstX = spineStartX + 4 * 62;
    const seg1FirstY = 100;
    const seg1LastX = spineStartX + 4 * 90; // x froze once the dive began
    const seg1LastY = 200;
    const seg1ExpectedLength = 115 - 62 + 1;

    // Segment 2: resumes once the climb-back-up brings y down to exactly
    // 200 again at k=145 (same x as segment 1's last point -- the spine
    // revisits the very same point in space after a real gap of steps
    // 116-144 spent outside the canvas), and runs until x exceeds 400 at
    // k=241.
    const seg2FirstX = seg1LastX;
    const seg2FirstY = 200;
    const seg2LastX = spineStartX + 4 * 90 + 4 * (241 - 170);
    const seg2LastY = 100;
    const seg2ExpectedLength = 241 - 145 + 1;

    function closeTo(a: number, b: number): boolean {
      return Math.abs(a - b) < EPSILON;
    }

    const segment1 = lines.find(
      (line) =>
        line.length === seg1ExpectedLength &&
        closeTo(line[0].x, seg1FirstX) &&
        closeTo(line[0].y, seg1FirstY) &&
        closeTo(line[line.length - 1].x, seg1LastX) &&
        closeTo(line[line.length - 1].y, seg1LastY)
    );

    const segment2 = lines.find(
      (line) =>
        line.length === seg2ExpectedLength &&
        closeTo(line[0].x, seg2FirstX) &&
        closeTo(line[0].y, seg2FirstY) &&
        closeTo(line[line.length - 1].x, seg2LastX) &&
        closeTo(line[line.length - 1].y, seg2LastY)
    );

    // Both halves of the bounce must be present as SEPARATE segments...
    expect(segment1).toBeDefined();
    expect(segment2).toBeDefined();
    expect(segment1).not.toBe(segment2);

    // ...and they must be genuinely non-contiguous: segment1's last point
    // and segment2's first point sit at the exact same (x, y) -- the spine
    // physically revisits that location -- but the two are recorded as
    // distinct arrays with a real gap of off-canvas steps in between
    // (k=116..144, while y ranged from 204 up to 260 and back down to 204).
    // If the old truncate-on-exit behavior had regressed into "just stop
    // and never resume", segment2 would not exist at all; if resumption
    // wrongly continued the same array instead of starting fresh, there
    // would be only one long segment instead of two.
    expect(segment1![segment1!.length - 1].x).toBeCloseTo(segment2![0].x, 6);
    expect(segment1![segment1!.length - 1].y).toBeCloseTo(segment2![0].y, 6);
  });

  it('samples the noise field exactly MAX_STEPS times total, regardless of line count', () => {
    let callCount = 0;
    const spyNoise: NoiseFn = () => {
      callCount++;
      return 0.5;
    };

    // A small spacing produces many parallel lines (far more than one
    // sample-per-line-per-step would allow us to ignore); the noise field
    // must still only be sampled once, along the single reference spine.
    generateLayerLines({ ...straightLayer, spacing: 2 }, 200, 200, spyNoise);

    expect(callCount).toBe(MAX_STEPS);
  });
});
