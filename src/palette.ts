export const DEFAULT_LAYER_COLORS = ['#ff5ea8', '#5ec8ff', '#a8ff5e', '#ffcf5e', '#c85eff'];

export function getDefaultLayerColor(index: number): string {
  return DEFAULT_LAYER_COLORS[index % DEFAULT_LAYER_COLORS.length];
}

export function getDefaultLayerColorEnd(index: number): string {
  return DEFAULT_LAYER_COLORS[(index + 2) % DEFAULT_LAYER_COLORS.length];
}
