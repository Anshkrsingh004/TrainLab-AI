/**
 * Chart palette — validated against the app's card surfaces (light #ffffff,
 * dark #121b31) with the data-viz palette validator: brand blue passes the
 * lightness band, chroma floor, and >= 3:1 contrast checks in both modes.
 *
 * Recharts needs concrete color strings (CSS vars are unreliable in SVG
 * presentation attributes), so we resolve by theme here.
 */

export interface ChartColors {
  series: string; // single-series brand blue
  seriesFill: string; // area fill (translucent)
  grid: string; // hairline gridlines
  axis: string; // axis / tick labels
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

const LIGHT: ChartColors = {
  series: "#2a78d6",
  seriesFill: "rgba(42,120,214,0.14)",
  grid: "#e1e0d9",
  axis: "#898781",
  tooltipBg: "#ffffff",
  tooltipBorder: "rgba(11,11,11,0.10)",
  tooltipText: "#0b0b0b",
};

const DARK: ChartColors = {
  series: "#3987e5",
  seriesFill: "rgba(57,135,229,0.18)",
  grid: "#2c2c2a",
  axis: "#898781",
  tooltipBg: "#121b31",
  tooltipBorder: "rgba(255,255,255,0.12)",
  tooltipText: "#ffffff",
};

export function chartColors(resolvedTheme: string | undefined): ChartColors {
  return resolvedTheme === "dark" ? DARK : LIGHT;
}
