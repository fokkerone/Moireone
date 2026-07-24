import { describe, it, expect } from 'vitest';
import {
  createDefaultState,
  duplicateLayer,
  removeLayer,
  reorderLayers,
  setGlobalSpacing,
  setGlobalWeight,
  MIN_LAYERS,
  MAX_LAYERS,
} from './state';

describe('createDefaultState', () => {
  it('starts with exactly 2 layers', () => {
    const state = createDefaultState();
    expect(state.layers.length).toBe(2);
  });
});

describe('duplicateLayer', () => {
  it('inserts a copy of the layer directly after it', () => {
    const state = createDefaultState();
    const updated = duplicateLayer(state, 0);
    expect(updated.layers.length).toBe(3);
    expect(updated.layers[1]).toEqual(state.layers[0]);
    expect(updated.layers[1]).not.toBe(state.layers[0]);
  });

  it('does not exceed MAX_LAYERS', () => {
    let state = createDefaultState();
    while (state.layers.length < MAX_LAYERS) {
      state = duplicateLayer(state, 0);
    }
    const beforeCount = state.layers.length;
    const updated = duplicateLayer(state, 0);
    expect(updated.layers.length).toBe(beforeCount);
    expect(updated).toEqual(state);
  });
});

describe('removeLayer', () => {
  it('removes the layer at the given index', () => {
    let state = createDefaultState();
    state = duplicateLayer(state, 0);
    const updated = removeLayer(state, 1);
    expect(updated.layers.length).toBe(2);
  });

  it('does not go below MIN_LAYERS', () => {
    const state = createDefaultState();
    const updated = removeLayer(state, 0);
    expect(updated.layers.length).toBe(MIN_LAYERS);
    expect(updated).toEqual(state);
  });
});

describe('reorderLayers', () => {
  it('moves a layer from one index to another', () => {
    let state = createDefaultState();
    state = duplicateLayer(state, 0);
    const original = state.layers;
    const updated = reorderLayers(state, 0, 2);
    expect(updated.layers[2]).toEqual(original[0]);
    expect(updated.layers.length).toBe(original.length);
  });
});

describe('setGlobalSpacing', () => {
  it('sets the same spacing on every layer', () => {
    let state = createDefaultState();
    state = duplicateLayer(state, 0);
    const updated = setGlobalSpacing(state, 33);
    for (const layer of updated.layers) {
      expect(layer.spacing).toBe(33);
    }
  });
});

describe('setGlobalWeight', () => {
  it('sets the same weight on every layer', () => {
    let state = createDefaultState();
    state = duplicateLayer(state, 0);
    const updated = setGlobalWeight(state, 12);
    for (const layer of updated.layers) {
      expect(layer.weight).toBe(12);
    }
  });
});
