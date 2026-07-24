import { useRef, useState } from 'react';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import {
  createDefaultState,
  duplicateLayer,
  removeLayer,
  reorderLayers,
  setGlobalSpacing,
  setGlobalWeight,
} from './state';
import { exportSvg } from './svgExport';
import type { LayerParams, Point } from './types';

export function App() {
  const [state, setState] = useState(createDefaultState());
  const cachedLinesRef = useRef<Point[][][]>([]);

  function updateLayer(index: number, patch: Partial<LayerParams>) {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((layer, i) => (i === index ? { ...layer, ...patch } : layer)),
    }));
  }

  function handleExport() {
    exportSvg(state, cachedLinesRef.current, window.innerWidth, window.innerHeight);
  }

  return (
    <>
      <Canvas
        state={state}
        onCachedLinesChange={(lines) => {
          cachedLinesRef.current = lines;
        }}
      />
      <Sidebar
        state={state}
        onBackgroundChange={(color) => setState((prev) => ({ ...prev, background: color }))}
        onGlobalSpacingChange={(spacing) => setState((prev) => setGlobalSpacing(prev, spacing))}
        onGlobalWeightChange={(weight) => setState((prev) => setGlobalWeight(prev, weight))}
        onUpdateLayer={updateLayer}
        onDuplicateLayer={(index) => setState((prev) => duplicateLayer(prev, index))}
        onRemoveLayer={(index) => setState((prev) => removeLayer(prev, index))}
        onReorderLayers={(from, to) => setState((prev) => reorderLayers(prev, from, to))}
        onExport={handleExport}
      />
    </>
  );
}
