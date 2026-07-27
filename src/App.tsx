import { useEffect, useRef, useState } from 'react';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { ZoomControls } from './components/ZoomControls';
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
import { getCanvasSize } from './canvasSize';
import type { LayerParams, Point } from './types';

export function App() {
  const [state, setState] = useState(createDefaultState());
  const [viewZoom, setViewZoom] = useState(1);
  const { width: canvasWidth, height: canvasHeight } = getCanvasSize(state.orientation);
  const cachedLinesRef = useRef<Point[][][]>([]);
  const elapsedRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number | null>(null);
  const lastSeedsRef = useRef<number[]>([]);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  function updateLayer(index: number, patch: Partial<LayerParams>) {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((layer, i) => (i === index ? { ...layer, ...patch } : layer)),
    }));
  }

  function handleExport() {
    exportSvg(state, cachedLinesRef.current, canvasWidth, canvasHeight);
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

      const currentLayers = stateRef.current.layers;
      const currentSeeds = currentLayers.map((layer) => layer.seed);
      const structuralChange =
        currentSeeds.length !== lastSeedsRef.current.length ||
        currentSeeds.some((seed, i) => seed !== lastSeedsRef.current[i]);

      if (structuralChange) {
        elapsedRef.current = new Array(currentSeeds.length).fill(0);
      }
      lastSeedsRef.current = currentSeeds;

      const elapsed = elapsedRef.current;
      const speed = stateRef.current.animationSpeed;
      const newLayers = currentLayers.map((layer, i) => {
        if (layer.animationPaused) {
          return layer;
        }
        elapsed[i] += deltaMs * speed;
        const animated = computeAnimatedValues(layer, elapsed[i], 1);
        return { ...layer, ...animated };
      });

      setState((prev) => ({ ...prev, layers: newLayers }));

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
        zoom={viewZoom}
        width={canvasWidth}
        height={canvasHeight}
        onCachedLinesChange={(lines) => {
          cachedLinesRef.current = lines;
        }}
      />
      <ZoomControls zoom={viewZoom} onZoomChange={setViewZoom} />
      <Sidebar
        state={state}
        onOrientationChange={() =>
          setState((prev) => ({
            ...prev,
            orientation: prev.orientation === 'landscape' ? 'portrait' : 'landscape',
          }))
        }
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
