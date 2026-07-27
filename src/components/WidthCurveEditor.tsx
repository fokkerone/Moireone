import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { widthAt3 } from '../widthProfile';
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

interface WidthCurveEditorProps {
  layer: LayerParams;
  onUpdate: (patch: Partial<LayerParams>) => void;
}

type DragPoint = 'start' | 'center' | 'end';

export function WidthCurveEditor({ layer, onUpdate }: WidthCurveEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<DragPoint | null>(null);

  const points = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    const x = PADDING + t * (GRAPH_WIDTH - 2 * PADDING);
    const y = valueToY(
      widthAt3(t, layer.widthCurveShape, layer.widthStart, layer.widthCenter, layer.widthEnd)
    );
    return `${x},${y}`;
  }).join(' ');

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const value = Math.round(yToValue(y) * 10) / 10;
    if (dragging === 'start') {
      onUpdate({ widthStart: value });
    } else if (dragging === 'center') {
      onUpdate({ widthCenter: value });
    } else {
      onUpdate({ widthEnd: value });
    }
  }

  const startX = PADDING;
  const startY = valueToY(layer.widthStart);
  const centerX = GRAPH_WIDTH / 2;
  const centerY = valueToY(layer.widthCenter);
  const endX = GRAPH_WIDTH - PADDING;
  const endY = valueToY(layer.widthEnd);

  function beginDrag(point: DragPoint) {
    return (e: React.PointerEvent<SVGCircleElement>) => {
      svgRef.current?.setPointerCapture(e.pointerId);
      setDragging(point);
    };
  }

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
        onLostPointerCapture={() => setDragging(null)}
      >
        <polyline points={points} fill="none" stroke="#ffffff" strokeWidth={2} />
        <circle
          cx={startX}
          cy={startY}
          r={6}
          fill="#5ec8ff"
          className="cursor-ns-resize"
          onPointerDown={beginDrag('start')}
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={6}
          fill="#ff5ea8"
          className="cursor-ns-resize"
          onPointerDown={beginDrag('center')}
        />
        <circle
          cx={endX}
          cy={endY}
          r={6}
          fill="#a8ff5e"
          className="cursor-ns-resize"
          onPointerDown={beginDrag('end')}
        />
      </svg>
    </div>
  );
}
