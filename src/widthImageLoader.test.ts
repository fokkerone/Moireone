import { describe, it, expect } from 'vitest';
import { rgbaToLuminance, computeDownscaledSize } from './widthImageLoader';

describe('rgbaToLuminance', () => {
  it('pure white -> 1', () => {
    expect(rgbaToLuminance(255, 255, 255)).toBeCloseTo(1, 5);
  });

  it('pure black -> 0', () => {
    expect(rgbaToLuminance(0, 0, 0)).toBeCloseTo(0, 5);
  });

  it('pure red -> ~0.299', () => {
    expect(rgbaToLuminance(255, 0, 0)).toBeCloseTo(0.299, 5);
  });

  it('pure green -> ~0.587', () => {
    expect(rgbaToLuminance(0, 255, 0)).toBeCloseTo(0.587, 5);
  });

  it('pure blue -> ~0.114', () => {
    expect(rgbaToLuminance(0, 0, 255)).toBeCloseTo(0.114, 5);
  });
});

describe('computeDownscaledSize', () => {
  it('scales down a landscape image over the cap proportionally', () => {
    expect(computeDownscaledSize(2000, 1000, 1024)).toEqual({ width: 1024, height: 512 });
  });

  it('scales down a portrait image over the cap proportionally', () => {
    expect(computeDownscaledSize(1000, 2000, 1024)).toEqual({ width: 512, height: 1024 });
  });

  it('leaves an image already under the cap unchanged', () => {
    expect(computeDownscaledSize(800, 600, 1024)).toEqual({ width: 800, height: 600 });
  });
});
