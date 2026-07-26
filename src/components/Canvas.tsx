import { useEffect, useRef } from 'react';
import p5 from 'p5';
import type { PatternState, Point } from '../types';
import { renderPattern } from '../render';

interface CanvasProps {
  state: PatternState;
  onCachedLinesChange: (lines: Point[][][]) => void;
  zoom: number;
}

export function Canvas({ state, onCachedLinesChange, zoom }: CanvasProps) {
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
    let disposed = false;
    // Capture the container node now: under React 19 StrictMode's dev-only
    // double-invoke of this effect, containerRef.current can already read as
    // null by the time this effect's own cleanup runs, which would make a
    // `containerRef.current` lookup inside the cleanup a silent no-op.
    const container = containerRef.current;

    const sketch = (p: p5) => {
      p.setup = () => {
        if (disposed) return;
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.noLoop();
      };

      p.draw = () => {
        if (disposed) return;
        const lines = renderPattern(p, stateRef.current);
        onCachedLinesChangeRef.current(lines);
      };

      p.windowResized = () => {
        if (disposed) return;
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        p.redraw();
      };
    };

    const instance = new p5(sketch, container ?? undefined);
    p5Ref.current = instance;

    return () => {
      disposed = true;
      // p5 always creates its own default canvas internally before it ever
      // calls our (disposed-guarded) p.setup, so guarding p.setup alone
      // cannot stop that default canvas from appearing if this instance's
      // async bootstrap is still in flight when cleanup runs. Flagging a
      // critical error short-circuits p5's internal setup sequence before
      // it gets there. NOTE: `hitCriticalError` is an undocumented/private
      // p5.js internal field (verified against the installed p5@^2.3.1) with
      // no public API contract, so a future p5 release could silently change
      // or remove its effect without a compile error. The queued microtask
      // sweep below is a version-resilient backstop for that scenario: it
      // only touches public DOM APIs and re-runs the same removal on the
      // next microtask, after p5's awaited `presetup` hook (where the
      // default canvas is actually created) would have had a chance to run.
      (instance as unknown as { hitCriticalError: boolean }).hitCriticalError = true;
      instance.remove();
      p5Ref.current = null;
      container?.querySelectorAll('canvas').forEach((el) => el.remove());
      queueMicrotask(() => {
        container?.querySelectorAll('canvas').forEach((el) => el.remove());
      });
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
      />
    </div>
  );
}
