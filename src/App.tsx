import { useEffect, useRef, useState } from 'react';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { computeAnimatedValues } from './animation';
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
  const elapsedRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number | null>(null);

  function updateLayer(index: number, patch: Partial<LayerParams>) {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((layer, i) => (i === index ? { ...layer, ...patch } : layer)),
    }));
  }

  function handleExport() {
    exportSvg(state, cachedLinesRef.current, window.innerWidth, window.innerHeight);
  }

  useEffect(() => {
    if (!state.animationPlaying) {
      return;
    }

    let frameId: number;

    const tick = (timestamp: number) => {
      const lastTime = lastFrameTimeRef.current;
      const deltaMs = lastTime === null ? 0 : timestamp - lastTime;
      lastFrameTimeRef.current = timestamp;

      setState((prev) => {
        const elapsed = elapsedRef.current;
        if (elapsed.length !== prev.layers.length) {
          elapsed.length = prev.layers.length;
          for (let i = 0; i < elapsed.length; i++) {
            if (elapsed[i] === undefined) {
              elapsed[i] = 0;
            }
          }
        }

        return {
          ...prev,
          layers: prev.layers.map((layer, i) => {
            if (layer.animationPaused) {
              return layer;
            }
            elapsed[i] += deltaMs * prev.animationSpeed;
            const animated = computeAnimatedValues(layer, elapsed[i], 1);
            return { ...layer, ...animated };
          }),
        };
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      lastFrameTimeRef.current = null;
    };
  }, [state.animationPlaying]);

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
        onToggleAnimationPlaying={() =>
          setState((prev) => ({ ...prev, animationPlaying: !prev.animationPlaying }))
        }
        onAnimationSpeedChange={(speed) => setState((prev) => ({ ...prev, animationSpeed: speed }))}
      />
    </>
  );
}
