import p5 from 'p5';
import type { Point } from './types';
import { createDefaultState } from './state';
import { renderPattern } from './render';
import { createControls } from './controls';
import { exportSvg } from './svgExport';

let currentState = createDefaultState();
let cachedLines: Point[][][] = [];

const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.noLoop();

    const controlsContainer = document.getElementById('controls')!;
    createControls(controlsContainer, currentState, (nextState) => {
      currentState = nextState;
      p.redraw();
    });

    document.getElementById('export-svg-button')!.addEventListener('click', () => {
      exportSvg(currentState, cachedLines, p.width, p.height);
    });
  };

  p.draw = () => {
    cachedLines = renderPattern(p, currentState);
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    p.redraw();
  };
};

new p5(sketch);
