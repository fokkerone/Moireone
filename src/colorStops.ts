import type { ColorStop } from './types';

export const MIN_COLOR_STOPS = 2;

export function sortStops(stops: ColorStop[]): ColorStop[] {
  return [...stops].sort((a, b) => a.position - b.position);
}

export function addStop(stops: ColorStop[], id: string, position: number, color: string): ColorStop[] {
  const clampedPosition = Math.min(1, Math.max(0, position));
  return [...stops, { id, position: clampedPosition, color }];
}

export function removeStop(stops: ColorStop[], id: string): ColorStop[] {
  if (stops.length <= MIN_COLOR_STOPS) {
    return stops;
  }
  return stops.filter((stop) => stop.id !== id);
}

export function updateStop(
  stops: ColorStop[],
  id: string,
  patch: Partial<Omit<ColorStop, 'id'>>
): ColorStop[] {
  return stops.map((stop) => {
    if (stop.id !== id) {
      return stop;
    }
    const next = { ...stop, ...patch };
    if (patch.position !== undefined) {
      next.position = Math.min(1, Math.max(0, patch.position));
    }
    return next;
  });
}
