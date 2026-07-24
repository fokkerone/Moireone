import { GripVertical, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ParamSlider } from './ParamSlider';
import { WidthCurveEditor } from './WidthCurveEditor';
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
        <ParamSlider label="Position X" min={-500} max={500} step={10} value={layer.offsetX} onChange={(v) => onUpdate({ offsetX: v })} />
        <ParamSlider label="Position Y" min={-500} max={500} step={10} value={layer.offsetY} onChange={(v) => onUpdate({ offsetY: v })} />
        <ParamSlider label="Deckkraft" min={0} max={1} step={0.01} value={layer.alpha} onChange={(v) => onUpdate({ alpha: v })} />

        <div className="mb-2">
          <Button
            size="sm"
            variant={layer.widthCurveEnabled ? 'default' : 'outline'}
            onClick={() => onUpdate({ widthCurveEnabled: !layer.widthCurveEnabled })}
          >
            {layer.widthCurveEnabled ? 'Linienbreite: Eigene Kurve' : 'Linienbreite: Global'}
          </Button>
        </div>
        {layer.widthCurveEnabled && <WidthCurveEditor layer={layer} onUpdate={onUpdate} />}

        <div className="mb-2">
          <Button
            size="sm"
            variant={layer.envelopeEnabled ? 'default' : 'outline'}
            onClick={() => onUpdate({ envelopeEnabled: !layer.envelopeEnabled })}
          >
            {layer.envelopeEnabled ? 'Ausschlag-Envelope: An' : 'Ausschlag-Envelope: Aus'}
          </Button>
        </div>
        {layer.envelopeEnabled && (
          <div className="mb-2 flex gap-1">
            <Button
              size="sm"
              variant={layer.envelopeShape === 'linear' ? 'default' : 'outline'}
              onClick={() => onUpdate({ envelopeShape: 'linear' })}
            >
              Linear
            </Button>
            <Button
              size="sm"
              variant={layer.envelopeShape === 'parabola' ? 'default' : 'outline'}
              onClick={() => onUpdate({ envelopeShape: 'parabola' })}
            >
              Parabel
            </Button>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
