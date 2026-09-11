import { GripVertical, Copy, Trash2, Eye, EyeOff, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ParamSlider } from './ParamSlider';
import { WidthCurveEditor } from './WidthCurveEditor';
import { WidthImageControls } from './WidthImageControls';
import { ColorStopsEditor } from './ColorStopsEditor';
import type { LayerParams } from '../types';
import { ANIMATABLE_RANGES } from '../animation';

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
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onUpdate({ animationPaused: !layer.animationPaused })}
        >
          {layer.animationPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" disabled={!canDuplicate} onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" disabled={!canRemove} onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <AccordionContent>
        <div className="mb-2">
          <Button
            size="sm"
            variant={layer.fillMode === 'gradient' ? 'default' : 'outline'}
            onClick={() => onUpdate({ fillMode: layer.fillMode === 'solid' ? 'gradient' : 'solid' })}
          >
            {layer.fillMode === 'solid' ? 'Füllung: Vollton' : 'Füllung: Verlauf'}
          </Button>
        </div>
        {layer.fillMode === 'solid' && (
          <div className="mb-2 flex items-center gap-2">
            <label className="w-32 shrink-0 text-xs">Farbe</label>
            <input
              type="color"
              value={layer.solidColor}
              onChange={(e) => onUpdate({ solidColor: e.target.value })}
              className="h-8 w-16 rounded border"
            />
          </div>
        )}
        {layer.fillMode === 'gradient' && (
          <>
            <ColorStopsEditor
              colorStops={layer.colorStops}
              onChange={(stops) => onUpdate({ colorStops: stops })}
            />
            <div className="mb-2 flex gap-1">
              <Button
                size="sm"
                variant={layer.gradientType === 'linear' ? 'default' : 'outline'}
                onClick={() => onUpdate({ gradientType: 'linear' })}
              >
                Linear
              </Button>
              <Button
                size="sm"
                variant={layer.gradientType === 'radial' ? 'default' : 'outline'}
                onClick={() => onUpdate({ gradientType: 'radial' })}
              >
                Radial
              </Button>
            </div>
            {layer.gradientType === 'linear' && (
              <ParamSlider label="Verlauf-Winkel" min={0} max={360} step={1} value={layer.gradientAngle} onChange={(v) => onUpdate({ gradientAngle: v })} />
            )}
          </>
        )}
        <ParamSlider label="Winkel" min={ANIMATABLE_RANGES.baseAngle.min} max={ANIMATABLE_RANGES.baseAngle.max} step={1} value={layer.baseAngle} onChange={(v) => onUpdate({ baseAngle: v })} />

        <div className="mb-2 flex flex-wrap gap-1">
          <Button
            size="sm"
            variant={layer.macroShape === 'circle' ? 'default' : 'outline'}
            onClick={() => onUpdate({ macroShape: 'circle' })}
          >
            Kreis
          </Button>
          <Button
            size="sm"
            variant={layer.macroShape === 'parabola' ? 'default' : 'outline'}
            onClick={() => onUpdate({ macroShape: 'parabola' })}
          >
            Parabel
          </Button>
          <Button
            size="sm"
            variant={layer.macroShape === 'smooth' ? 'default' : 'outline'}
            onClick={() => onUpdate({ macroShape: 'smooth' })}
          >
            Sanfte Kurve
          </Button>
          <Button
            size="sm"
            variant={layer.macroShape === 'fieldLines' ? 'default' : 'outline'}
            onClick={() => onUpdate({ macroShape: 'fieldLines' })}
          >
            Feldlinien
          </Button>
          <Button
            size="sm"
            variant={layer.macroShape === 'radial' ? 'default' : 'outline'}
            onClick={() => onUpdate({ macroShape: 'radial' })}
          >
            Strahlen
          </Button>
          <Button
            size="sm"
            variant={layer.macroShape === 'rings' ? 'default' : 'outline'}
            onClick={() => onUpdate({ macroShape: 'rings' })}
          >
            Ringe
          </Button>
        </div>
        {(layer.macroShape === 'circle' || layer.macroShape === 'parabola' || layer.macroShape === 'smooth') && (
          <>
            <ParamSlider label="Amplitude" min={ANIMATABLE_RANGES.amplitude.min} max={ANIMATABLE_RANGES.amplitude.max} step={5} value={layer.amplitude} onChange={(v) => onUpdate({ amplitude: v })} />
            <ParamSlider label="Radius" min={100} max={3000} step={10} value={layer.macroRadius} onChange={(v) => onUpdate({ macroRadius: v })} />
            <ParamSlider label="Textur-Stärke" min={0} max={200} step={5} value={layer.textureAmplitude} onChange={(v) => onUpdate({ textureAmplitude: v })} />
          </>
        )}
        {layer.macroShape === 'fieldLines' && (
          <>
            <ParamSlider label="Magnet-Abstand" min={20} max={1000} step={10} value={layer.fieldPoleDistance} onChange={(v) => onUpdate({ fieldPoleDistance: v })} />
            <ParamSlider label="Feldstärke" min={0} max={1} step={0.01} value={layer.fieldStrength} onChange={(v) => onUpdate({ fieldStrength: v })} />
            <ParamSlider label="Anzahl Linien" min={4} max={200} step={1} value={layer.fieldLineCount} onChange={(v) => onUpdate({ fieldLineCount: v })} />
          </>
        )}
        {layer.macroShape === 'radial' && (
          <>
            <ParamSlider label="Radius" min={20} max={2000} step={10} value={layer.macroRadius} onChange={(v) => onUpdate({ macroRadius: v })} />
            <ParamSlider label="Oval-Form" min={0.2} max={3} step={0.05} value={layer.radialOvality} onChange={(v) => onUpdate({ radialOvality: v })} />
            <ParamSlider label="Verzerrung" min={-2} max={2} step={0.05} value={layer.radialTwist} onChange={(v) => onUpdate({ radialTwist: v })} />
          </>
        )}
        {layer.macroShape === 'rings' && (
          <ParamSlider label="Oval-Form" min={0.2} max={3} step={0.05} value={layer.radialOvality} onChange={(v) => onUpdate({ radialOvality: v })} />
        )}
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
        {layer.widthCurveEnabled && (
          <>
            <div className="mb-2 flex gap-1">
              <Button
                size="sm"
                variant={layer.widthMode === 'alongLine' ? 'default' : 'outline'}
                onClick={() => onUpdate({ widthMode: 'alongLine' })}
              >
                Entlang der Linie
              </Button>
              <Button
                size="sm"
                variant={layer.widthMode === 'byPosition' ? 'default' : 'outline'}
                onClick={() => onUpdate({ widthMode: 'byPosition' })}
              >
                Nach Position
              </Button>
              <Button
                size="sm"
                variant={layer.widthMode === 'byAngle' ? 'default' : 'outline'}
                onClick={() => onUpdate({ widthMode: 'byAngle' })}
              >
                Nach Winkel
              </Button>
            </div>
            {(layer.widthMode === 'byPosition' || layer.widthMode === 'byAngle') && (
              <>
                <ParamSlider label="Dicke-Zentrum X" min={-500} max={500} step={10} value={layer.widthCenterX} onChange={(v) => onUpdate({ widthCenterX: v })} />
                <ParamSlider label="Dicke-Zentrum Y" min={-500} max={500} step={10} value={layer.widthCenterY} onChange={(v) => onUpdate({ widthCenterY: v })} />
                <ParamSlider label="Dicke-Radius" min={50} max={1000} step={10} value={layer.widthRadius} onChange={(v) => onUpdate({ widthRadius: v })} />
              </>
            )}
            {layer.widthMode === 'byAngle' && (
              <ParamSlider label="Dicke-Winkel" min={0} max={360} step={1} value={layer.widthAngle} onChange={(v) => onUpdate({ widthAngle: v })} />
            )}
            <WidthCurveEditor layer={layer} onUpdate={onUpdate} />
            <WidthImageControls layer={layer} onUpdate={onUpdate} />
          </>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}
