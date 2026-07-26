import { describe, it, expect } from 'vitest';
import { sortStops, addStop, removeStop, updateStop, MIN_COLOR_STOPS } from './colorStops';
import type { ColorStop } from './types';

describe('sortStops', () => {
  it('returns stops in ascending position order regardless of input order', () => {
    const stops: ColorStop[] = [
      { id: 'c', position: 1, color: '#0000ff' },
      { id: 'a', position: 0, color: '#ff0000' },
      { id: 'b', position: 0.5, color: '#00ff00' },
    ];
    const sorted = sortStops(stops);
    expect(sorted.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const stops: ColorStop[] = [
      { id: 'c', position: 1, color: '#0000ff' },
      { id: 'a', position: 0, color: '#ff0000' },
      { id: 'b', position: 0.5, color: '#00ff00' },
    ];
    const originalOrder = stops.map((s) => s.id);
    sortStops(stops);
    expect(stops.map((s) => s.id)).toEqual(originalOrder);
  });
});

describe('addStop', () => {
  it('appends a new stop with given id/color and an in-range position unchanged', () => {
    const stops: ColorStop[] = [{ id: 'a', position: 0, color: '#ff0000' }];
    const result = addStop(stops, 'b', 0.5, '#00ff00');
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({ id: 'b', position: 0.5, color: '#00ff00' });
  });

  it('clamps a too-high position to 1', () => {
    const stops: ColorStop[] = [{ id: 'a', position: 0, color: '#ff0000' }];
    const result = addStop(stops, 'b', 1.5, '#00ff00');
    expect(result[1].position).toBe(1);
  });

  it('clamps a too-low position to 0', () => {
    const stops: ColorStop[] = [{ id: 'a', position: 0, color: '#ff0000' }];
    const result = addStop(stops, 'b', -0.2, '#00ff00');
    expect(result[1].position).toBe(0);
  });

  it('does not mutate the input array', () => {
    const stops: ColorStop[] = [{ id: 'a', position: 0, color: '#ff0000' }];
    addStop(stops, 'b', 0.5, '#00ff00');
    expect(stops).toHaveLength(1);
  });
});

describe('removeStop', () => {
  it('removes the stop with the matching id when more than MIN_COLOR_STOPS remain', () => {
    const stops: ColorStop[] = [
      { id: 'a', position: 0, color: '#ff0000' },
      { id: 'b', position: 0.5, color: '#00ff00' },
      { id: 'c', position: 1, color: '#0000ff' },
    ];
    const result = removeStop(stops, 'b');
    expect(result.map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('is a no-op when the list has exactly MIN_COLOR_STOPS stops', () => {
    const stops: ColorStop[] = [
      { id: 'a', position: 0, color: '#ff0000' },
      { id: 'b', position: 1, color: '#0000ff' },
    ];
    expect(stops).toHaveLength(MIN_COLOR_STOPS);
    const result = removeStop(stops, 'a');
    expect(result.map((s) => s.id)).toEqual(['a', 'b']);
  });
});

describe('updateStop', () => {
  it('updates only the matching stop, leaving other stops untouched', () => {
    const stops: ColorStop[] = [
      { id: 'a', position: 0, color: '#ff0000' },
      { id: 'b', position: 1, color: '#0000ff' },
    ];
    const result = updateStop(stops, 'a', { color: '#ffffff' });
    expect(result[0]).toEqual({ id: 'a', position: 0, color: '#ffffff' });
    expect(result[1]).toEqual(stops[1]);
  });

  it('clamps an in-range position update correctly (no-op clamp)', () => {
    const stops: ColorStop[] = [{ id: 'a', position: 0, color: '#ff0000' }];
    const result = updateStop(stops, 'a', { position: 0.3 });
    expect(result[0].position).toBe(0.3);
  });

  it('clamps an out-of-range position update to [0,1]', () => {
    const stops: ColorStop[] = [{ id: 'a', position: 0, color: '#ff0000' }];
    const result = updateStop(stops, 'a', { position: 1.5 });
    expect(result[0].position).toBe(1);

    const result2 = updateStop(stops, 'a', { position: -0.5 });
    expect(result2[0].position).toBe(0);
  });

  it('updating color alone does not reset position', () => {
    const stops: ColorStop[] = [{ id: 'a', position: 0.75, color: '#ff0000' }];
    const result = updateStop(stops, 'a', { color: '#123456' });
    expect(result[0].position).toBe(0.75);
    expect(result[0].color).toBe('#123456');
  });
});
