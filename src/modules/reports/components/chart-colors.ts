/**
 * Paleta categórica validada (six-checks do skill de dataviz) para o
 * cartão escuro da barbearia (superfície #181818). Ordem fixa — nunca
 * ciclar ou reordenar por valor. "gold" reaproveita o dourado da marca;
 * as demais são as cores default do skill, já validadas para essa superfície.
 */
export const CHART_COLORS = {
  gold: "#c98500",
  blue: "#3987e5",
  aqua: "#199e70",
  violet: "#9085e9",
  red: "#e66767",
  magenta: "#d55181",
  orange: "#d95926",
  other: "#5b5b5b",
} as const;

export const CATEGORICAL_ORDER = [
  CHART_COLORS.gold,
  CHART_COLORS.blue,
  CHART_COLORS.aqua,
  CHART_COLORS.violet,
  CHART_COLORS.red,
  CHART_COLORS.magenta,
] as const;

export const CHART_SURFACE = "#181818";
export const CHART_GRID_COLOR = "#2A2A2A";
export const CHART_AXIS_COLOR = "#B5B5B5";
