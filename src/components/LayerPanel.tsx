import { GripVertical, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ParamSlider } from './ParamSlider';
import type { LayerParams } from '../types';

interface LayerPanelProps {
  layer: LayerParams;
  index: number;
  canDuplicate: boolean;
  canRemove: boolean;
  dragHandleProps: Record<string, unknown>;
  onUpdate: (patch: Partial<LayerParams>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export function LayerPanel({
  layer,
  index,
  canDuplicate,
  canRemove,
  dragHandleProps,
  onUpdate,
  onDuplicate,
  onRemove,
}: LayerPanelProps) {
  return (
    <AccordionItem value={`layer-${index}`}>
      <div className="flex items-center gap-1">
        <button type="button" {...dragHandleProps} className="cursor-grab p-1">
          <GripVertical className="h-4 w-4" />
        </button>
        <AccordionTrigger className="flex-1">{`Layer ${index + 1}`}</AccordionTrigger>
        <Button size="icon" variant="ghost" onClick={() => onUpdate({ visible: !layer.visible })}>
          {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" disabled={!canDuplicate} onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" disabled={!canRemove} onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <AccordionContent>
        <div className="mb-2 flex items-center gap-2">
          <label className="w-32 shrink-0 text-xs">Startfarbe</label>
          <input
            type="color"
            value={layer.colorStart}
            onChange={(e) => onUpdate({ colorStart: e.target.value })}
            className="h-8 w-16 rounded border"
          />
          <label className="shrink-0 text-xs">Endfarbe</label>
          <input
            type="color"
            value={layer.colorEnd}
            onChange={(e) => onUpdate({ colorEnd: e.target.value })}
            className="h-8 w-16 rounded border"
          />
        </div>
        <ParamSlider label="Verlauf-Winkel" min={0} max={360} step={1} value={layer.gradientAngle} onChange={(v) => onUpdate({ gradientAngle: v })} />
        <ParamSlider label="Winkel" min={0} max={360} step={1} value={layer.baseAngle} onChange={(v) => onUpdate({ baseAngle: v })} />
        <ParamSlider label="Noise-Scale" min={0.0002} max={0.05} step={0.0002} value={layer.noiseScale} onChange={(v) => onUpdate({ noiseScale: v })} />
        <ParamSlider label="Amplitude" min={0} max={500} step={5} value={layer.amplitude} onChange={(v) => onUpdate({ amplitude: v })} />
        <ParamSlider label="Zoom" min={-50} max={50} step={1} value={layer.zoom} onChange={(v) => onUpdate({ zoom: v })} />
        <ParamSlider label="Deckkraft" min={0} max={1} step={0.01} value={layer.alpha} onChange={(v) => onUpdate({ alpha: v })} />
      </AccordionContent>
    </AccordionItem>
  );
}
