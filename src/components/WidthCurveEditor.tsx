import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { LayerParams } from '../types';

const GRAPH_WIDTH = 240;
const GRAPH_HEIGHT = 100;
const PADDING = 10;
const VALUE_MIN = 0.5;
const VALUE_MAX = 50;

function valueToY(value: number): number {
  const clamped = Math.min(VALUE_MAX, Math.max(VALUE_MIN, value));
  const t = (clamped - VALUE_MIN) / (VALUE_MAX - VALUE_MIN);
  return PADDING + (1 - t) * (GRAPH_HEIGHT - 2 * PADDING);
}

function yToValue(y: number): number {
  const t = 1 - (y - PADDING) / (GRAPH_HEIGHT - 2 * PADDING);
  const clamped = Math.min(1, Math.max(0, t));
  return VALUE_MIN + clamped * (VALUE_MAX - VALUE_MIN);
}

function widthAtLocal(t: number, shape: 'linear' | 'parabola', widthMin: number, widthMax: number): number {
  const distFromCenter = Math.min(1, Math.abs(t - 0.5) * 2);
  const factor = shape === 'parabola' ? distFromCenter * distFromCenter : distFromCenter;
  return widthMax - (widthMax - widthMin) * factor;
}

interface WidthCurveEditorProps {
  layer: LayerParams;
  onUpdate: (patch: Partial<LayerParams>) => void;
}

export function WidthCurveEditor({ layer, onUpdate }: WidthCurveEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'edge' | 'center' | null>(null);

  const points = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    const x = PADDING + t * (GRAPH_WIDTH - 2 * PADDING);
    const y = valueToY(widthAtLocal(t, layer.widthCurveShape, layer.widthMin, layer.widthMax));
    return `${x},${y}`;
  }).join(' ');

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const value = Math.round(yToValue(y) * 10) / 10;
    if (dragging === 'edge') {
      onUpdate({ widthMin: Math.min(value, layer.widthMax) });
    } else {
      onUpdate({ widthMax: Math.max(value, layer.widthMin) });
    }
  }

  const edgeX = PADDING;
  const edgeY = valueToY(layer.widthMin);
  const centerX = GRAPH_WIDTH / 2;
  const centerY = valueToY(layer.widthMax);

  return (
    <div className="mb-2">
      <div className="mb-1 flex gap-1">
        <Button
          size="sm"
          variant={layer.widthCurveShape === 'linear' ? 'default' : 'outline'}
          onClick={() => onUpdate({ widthCurveShape: 'linear' })}
        >
          Linear
        </Button>
        <Button
          size="sm"
          variant={layer.widthCurveShape === 'parabola' ? 'default' : 'outline'}
          onClick={() => onUpdate({ widthCurveShape: 'parabola' })}
        >
          Parabel
        </Button>
      </div>
      <svg
        ref={svgRef}
        width={GRAPH_WIDTH}
        height={GRAPH_HEIGHT}
        className="touch-none rounded border border-neutral-600 bg-neutral-800"
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDragging(null)}
        onPointerLeave={() => setDragging(null)}
      >
        <polyline points={points} fill="none" stroke="#ffffff" strokeWidth={2} />
        <circle
          cx={edgeX}
          cy={edgeY}
          r={6}
          fill="#5ec8ff"
          className="cursor-ns-resize"
          onPointerDown={(e) => {
            svgRef.current?.setPointerCapture(e.pointerId);
            setDragging('edge');
          }}
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={6}
          fill="#ff5ea8"
          className="cursor-ns-resize"
          onPointerDown={(e) => {
            svgRef.current?.setPointerCapture(e.pointerId);
            setDragging('center');
          }}
        />
      </svg>
    </div>
  );
}
