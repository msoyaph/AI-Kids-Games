/** Logical design size. Every layout is authored for at least this many logical units. */
export const DESIGN_W = 960;
export const DESIGN_H = 720;

export interface StageMetrics {
  /** CSS pixels per logical unit. */
  scale: number;
  /** Logical size of the whole screen. */
  width: number;
  height: number;
  /** Renderer resolution: device pixel ratio capped at 2. */
  resolution: number;
  /** Texture bake resolution: physical pixels per logical unit, capped at 2. */
  bakeResolution: number;
  portrait: boolean;
}

export function computeStage(cssW: number, cssH: number, dpr: number): StageMetrics {
  const w = Math.max(1, cssW);
  const h = Math.max(1, cssH);
  const scale = Math.min(w / DESIGN_W, h / DESIGN_H);
  const resolution = Math.min(Math.max(dpr || 1, 1), 2);
  const bakeResolution = Math.min(2, Math.max(1, (dpr || 1) * scale));
  return {
    scale,
    width: w / scale,
    height: h / scale,
    resolution,
    bakeResolution,
    portrait: h > w * 1.05,
  };
}
