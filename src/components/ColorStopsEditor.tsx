import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addStop, removeStop, sortStops, updateStop, MIN_COLOR_STOPS } from '../colorStops';
import type { LayerParams } from '../types';

interface ColorStopsEditorProps {
  layer: LayerParams;
  onUpdate: (patch: Partial<LayerParams>) => void;
}

function generateStopId(): string {
  return `stop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ColorStopsEditor({ layer, onUpdate }: ColorStopsEditorProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const stops = sortStops(layer.colorStops);
  const gradientCss = `linear-gradient(to right, ${stops
    .map((s) => `${s.color} ${s.position * 100}%`)
    .join(', ')})`;

  function positionFromClientX(clientX: number): number {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }

  function handleBarClick(e: React.MouseEvent<HTMLDivElement>) {
    if (draggingId) return;
    const position = positionFromClientX(e.clientX);
    onUpdate({ colorStops: addStop(layer.colorStops, generateStopId(), position, '#ffffff') });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingId) return;
    const position = positionFromClientX(e.clientX);
    onUpdate({ colorStops: updateStop(layer.colorStops, draggingId, { position }) });
  }

  return (
    <div className="mb-2">
      <div
        ref={barRef}
        className="relative h-7 w-full cursor-copy touch-none rounded border border-neutral-600"
        style={{ background: gradientCss }}
        onClick={handleBarClick}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDraggingId(null)}
        onLostPointerCapture={() => setDraggingId(null)}
      >
        {stops.map((stop) => (
          <div
            key={stop.id}
            className="absolute top-0 h-full w-1 -translate-x-1/2 cursor-ew-resize border border-white bg-black/50"
            style={{ left: `${stop.position * 100}%` }}
            onPointerDown={(e) => {
              e.stopPropagation();
              barRef.current?.setPointerCapture(e.pointerId);
              setDraggingId(stop.id);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ))}
      </div>
      <div className="mt-1 space-y-1">
        {stops.map((stop) => (
          <div key={stop.id} className="flex items-center gap-2">
            <input
              type="color"
              value={stop.color}
              onChange={(e) =>
                onUpdate({ colorStops: updateStop(layer.colorStops, stop.id, { color: e.target.value }) })
              }
              className="h-6 w-10 rounded border"
            />
            <span className="text-xs text-neutral-300">{Math.round(stop.position * 100)}%</span>
            <Button
              size="icon-xs"
              variant="ghost"
              disabled={layer.colorStops.length <= MIN_COLOR_STOPS}
              onClick={() => onUpdate({ colorStops: removeStop(layer.colorStops, stop.id) })}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
