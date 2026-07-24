import type { LayerParams, PatternState } from './types';
import { MIN_LAYERS, MAX_LAYERS, setLayerCount } from './state';

type ChangeHandler = (state: PatternState) => void;

function createSlider(
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  onInput: (value: number) => void
): HTMLElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'control-row';
  wrapper.textContent = label;

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener('input', () => onInput(Number(input.value)));

  wrapper.appendChild(input);
  return wrapper;
}

function createColorPicker(
  label: string,
  value: string,
  onInput: (value: string) => void
): HTMLElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'control-row';
  wrapper.textContent = label;

  const input = document.createElement('input');
  input.type = 'color';
  input.value = value;
  input.addEventListener('input', () => onInput(input.value));

  wrapper.appendChild(input);
  return wrapper;
}

function renderLayerBlock(
  layer: LayerParams,
  index: number,
  updateLayer: (index: number, patch: Partial<LayerParams>) => void
): HTMLElement {
  const block = document.createElement('fieldset');
  block.className = 'layer-block';

  const legend = document.createElement('legend');
  legend.textContent = `Layer ${index + 1}`;
  block.appendChild(legend);

  block.appendChild(createColorPicker('Farbe', layer.color, (v) => updateLayer(index, { color: v })));
  block.appendChild(createSlider('Winkel', 0, 360, 1, layer.baseAngle, (v) => updateLayer(index, { baseAngle: v })));
  block.appendChild(createSlider('Noise-Scale', 0.0002, 0.05, 0.0002, layer.noiseScale, (v) => updateLayer(index, { noiseScale: v })));
  block.appendChild(createSlider('Noise-Stärke', 0, 360, 1, layer.noiseStrength, (v) => updateLayer(index, { noiseStrength: v })));
  block.appendChild(createSlider('Abstand', 4, 60, 1, layer.spacing, (v) => updateLayer(index, { spacing: v })));
  block.appendChild(createSlider('Strichstärke', 0.5, 6, 0.1, layer.weight, (v) => updateLayer(index, { weight: v })));
  block.appendChild(createSlider('Deckkraft', 0, 1, 0.01, layer.alpha, (v) => updateLayer(index, { alpha: v })));

  return block;
}

export function createControls(
  container: HTMLElement,
  initialState: PatternState,
  onChange: ChangeHandler
): void {
  let state = initialState;

  const globalSection = document.createElement('div');
  globalSection.className = 'global-controls';
  container.appendChild(globalSection);

  const layersSection = document.createElement('div');
  layersSection.className = 'layers-controls';
  container.appendChild(layersSection);

  function updateLayer(index: number, patch: Partial<LayerParams>): void {
    const layers = state.layers.map((layer, i) => (i === index ? { ...layer, ...patch } : layer));
    state = { ...state, layers };
    onChange(state);
  }

  function renderLayers(): void {
    layersSection.innerHTML = '';
    state.layers.forEach((layer, index) => {
      layersSection.appendChild(renderLayerBlock(layer, index, updateLayer));
    });
  }

  globalSection.appendChild(
    createSlider('Anzahl Layer', MIN_LAYERS, MAX_LAYERS, 1, state.layers.length, (count) => {
      state = setLayerCount(state, count);
      renderLayers();
      onChange(state);
    })
  );

  globalSection.appendChild(
    createColorPicker('Hintergrund', state.background, (color) => {
      state = { ...state, background: color };
      onChange(state);
    })
  );

  const exportButton = document.createElement('button');
  exportButton.textContent = 'Als SVG exportieren';
  exportButton.id = 'export-svg-button';
  globalSection.appendChild(exportButton);

  renderLayers();
}
