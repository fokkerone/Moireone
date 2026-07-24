import { useEffect, useRef } from 'react';
import p5 from 'p5';
import type { PatternState, Point } from '../types';
import { renderPattern } from '../render';

interface CanvasProps {
  state: PatternState;
  onCachedLinesChange: (lines: Point[][][]) => void;
}

export function Canvas({ state, onCachedLinesChange }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<PatternState>(state);
  const p5Ref = useRef<p5 | null>(null);
  const onCachedLinesChangeRef = useRef(onCachedLinesChange);

  useEffect(() => {
    stateRef.current = state;
    p5Ref.current?.redraw();
  }, [state]);

  useEffect(() => {
    onCachedLinesChangeRef.current = onCachedLinesChange;
  }, [onCachedLinesChange]);

  useEffect(() => {
    const sketch = (p: p5) => {
      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.noLoop();
      };

      p.draw = () => {
        const lines = renderPattern(p, stateRef.current);
        onCachedLinesChangeRef.current(lines);
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        p.redraw();
      };
    };

    const instance = new p5(sketch, containerRef.current ?? undefined);
    p5Ref.current = instance;

    return () => {
      instance.remove();
      p5Ref.current = null;
    };
  }, []);

  return <div ref={containerRef} className="fixed inset-0" />;
}
