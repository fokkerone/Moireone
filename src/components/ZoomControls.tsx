import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const MIN_VIEW_ZOOM = 0.25;
export const MAX_VIEW_ZOOM = 4;
const VIEW_ZOOM_STEP = 0.1;

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

function clampZoom(zoom: number): number {
  return Math.min(MAX_VIEW_ZOOM, Math.max(MIN_VIEW_ZOOM, zoom));
}

export function ZoomControls({ zoom, onZoomChange }: ZoomControlsProps) {
  return (
    <div className="fixed bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-neutral-900/85 px-3 py-2 text-sm text-white shadow-lg">
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => onZoomChange(clampZoom(zoom - VIEW_ZOOM_STEP))}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => onZoomChange(clampZoom(zoom + VIEW_ZOOM_STEP))}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="outline" onClick={() => onZoomChange(1)}>
        Reset
      </Button>
    </div>
  );
}
