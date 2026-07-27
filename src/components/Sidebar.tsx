import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ParamSlider } from './ParamSlider';
import { LayerAccordion } from './LayerAccordion';
import { ColorStopsEditor } from './ColorStopsEditor';
import type { ColorStop, LayerParams, PatternState } from '../types';

interface SidebarProps {
  state: PatternState;
  onToggleBackgroundFillMode: () => void;
  onBackgroundSolidColorChange: (color: string) => void;
  onBackgroundColorStopsChange: (stops: ColorStop[]) => void;
  onBackgroundGradientAngleChange: (angle: number) => void;
  onGlobalSpacingChange: (spacing: number) => void;
  onGlobalWeightChange: (weight: number) => void;
  onUpdateLayer: (index: number, patch: Partial<LayerParams>) => void;
  onDuplicateLayer: (index: number) => void;
  onRemoveLayer: (index: number) => void;
  onReorderLayers: (fromIndex: number, toIndex: number) => void;
  onExport: () => void;
  onToggleAnimationPlaying: () => void;
  onAnimationSpeedChange: (speed: number) => void;
  onOrientationChange: () => void;
}

export function Sidebar({
  state,
  onToggleBackgroundFillMode,
  onBackgroundSolidColorChange,
  onBackgroundColorStopsChange,
  onBackgroundGradientAngleChange,
  onGlobalSpacingChange,
  onGlobalWeightChange,
  onUpdateLayer,
  onDuplicateLayer,
  onRemoveLayer,
  onReorderLayers,
  onExport,
  onToggleAnimationPlaying,
  onAnimationSpeedChange,
  onOrientationChange,
}: SidebarProps) {
  const spacing = state.layers[0]?.spacing ?? 14;
  const weight = state.layers[0]?.weight ?? 1.5;
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="fixed right-0 top-0 z-10 flex h-screen w-10 items-start justify-center bg-neutral-900/85 pt-3">
        <Button size="icon" variant="ghost" onClick={() => setCollapsed(false)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-0 z-10 h-screen w-[27rem] overflow-y-auto bg-neutral-900/85 p-3 text-sm text-white">
      <Button size="icon" variant="ghost" className="mb-2" onClick={() => setCollapsed(true)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button variant="outline" className="mb-2 w-full" onClick={onOrientationChange}>
        {state.orientation === 'landscape' ? 'Querformat' : 'Hochformat'}
      </Button>
      <div className="mb-2">
        <Button
          size="sm"
          variant={state.backgroundFillMode === 'gradient' ? 'default' : 'outline'}
          onClick={onToggleBackgroundFillMode}
        >
          {state.backgroundFillMode === 'solid' ? 'Hintergrund: Vollton' : 'Hintergrund: Verlauf'}
        </Button>
      </div>
      {state.backgroundFillMode === 'solid' && (
        <div className="mb-2 flex items-center gap-2">
          <label className="w-32 shrink-0 text-xs">Farbe</label>
          <input
            type="color"
            value={state.backgroundSolidColor}
            onChange={(e) => onBackgroundSolidColorChange(e.target.value)}
            className="h-8 w-16 rounded border"
          />
        </div>
      )}
      {state.backgroundFillMode === 'gradient' && (
        <>
          <ColorStopsEditor colorStops={state.backgroundColorStops} onChange={onBackgroundColorStopsChange} />
          <ParamSlider
            label="Hintergrund-Winkel"
            min={0}
            max={360}
            step={1}
            value={state.backgroundGradientAngle}
            onChange={onBackgroundGradientAngleChange}
          />
        </>
      )}
      <ParamSlider label="Abstand" min={4} max={50} step={1} value={spacing} onChange={onGlobalSpacingChange} />
      <ParamSlider label="Linienbreite" min={0.5} max={50} step={0.5} value={weight} onChange={onGlobalWeightChange} />
      <Button
        variant={state.animationPlaying ? 'default' : 'outline'}
        className="mb-2 w-full"
        onClick={onToggleAnimationPlaying}
      >
        {state.animationPlaying ? 'Animation: Stop' : 'Animation: Play'}
      </Button>
      <ParamSlider
        label="Animationsgeschwindigkeit"
        min={0.1}
        max={5}
        step={0.1}
        value={state.animationSpeed}
        onChange={onAnimationSpeedChange}
      />
      <Button className="mb-3 w-full" onClick={onExport}>
        Als SVG exportieren
      </Button>
      <LayerAccordion
        state={state}
        onUpdateLayer={onUpdateLayer}
        onDuplicateLayer={onDuplicateLayer}
        onRemoveLayer={onRemoveLayer}
        onReorder={onReorderLayers}
      />
    </div>
  );
}
