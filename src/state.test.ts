import { describe, it, expect } from 'vitest';
import { createDefaultState, setLayerCount, MIN_LAYERS, MAX_LAYERS } from './state';

describe('createDefaultState', () => {
  it('starts with exactly 2 layers', () => {
    const state = createDefaultState();
    expect(state.layers.length).toBe(2);
  });
});

describe('setLayerCount', () => {
  it('adds layers up to the requested count', () => {
    const updated = setLayerCount(createDefaultState(), 4);
    expect(updated.layers.length).toBe(4);
  });

  it('removes layers down to the requested count, keeping earlier layers unchanged', () => {
    const state = setLayerCount(createDefaultState(), 4);
    const firstLayerBefore = state.layers[0];
    const reduced = setLayerCount(state, 2);
    expect(reduced.layers.length).toBe(2);
    expect(reduced.layers[0]).toEqual(firstLayerBefore);
  });

  it('clamps counts below MIN_LAYERS up to MIN_LAYERS', () => {
    const updated = setLayerCount(createDefaultState(), 0);
    expect(updated.layers.length).toBe(MIN_LAYERS);
  });

  it('clamps counts above MAX_LAYERS down to MAX_LAYERS', () => {
    const updated = setLayerCount(createDefaultState(), 10);
    expect(updated.layers.length).toBe(MAX_LAYERS);
  });
});
