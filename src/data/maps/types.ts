import type { Dir } from '../../core/math';

export type LocationId = string;

export interface Warp {
  x: number;
  y: number;
  w?: number;
  h?: number;
  to: LocationId;
  tx: number;
  ty: number;
  dir?: Dir;
  /** story flag required to pass; otherwise `msg` is shown */
  need?: string;
  msg?: string;
}

/** Static decorative/solid object that is part of the map (never saved). */
export interface PropPlacement {
  kind: string;
  x: number;
  y: number;
}

/** Multi-tile building with an optional door warp. */
export interface StructurePlacement {
  kind: string;
  x: number;
  y: number;
  /** id for state lookups (e.g. farm building slot) */
  id?: string;
  /** where the door leads (door tile offset comes from the StructureDef) */
  door?: { to: LocationId; tx: number; ty: number; need?: string; msg?: string };
}

/** Interaction trigger on a tile (counter, bed, board, radio…). */
export interface Trigger {
  x: number;
  y: number;
  w?: number;
  h?: number;
  action: string;
  arg?: string;
}

export type WaterZone = 'river' | 'lake' | 'ocean' | 'pier' | 'pond' | 'mine' | 'none';

export interface MapDef {
  id: LocationId;
  name: string;
  w: number;
  h: number;
  ground: Uint8Array;
  props: PropPlacement[];
  structures: StructurePlacement[];
  warps: Warp[];
  points: Record<string, { x: number; y: number; dir?: Dir }>;
  triggers: Trigger[];
  outdoor: boolean;
  farmable: boolean;
  music: string;
  water: WaterZone;
  /** optional rectangles overriding water zone (e.g. lake vs river) */
  waterZones?: { x: number; y: number; w: number; h: number; zone: WaterZone }[];
  /** spots where forage may spawn (if empty, any walkable grass) */
  forage?: boolean;
  /** dark interior / cave lighting */
  dark?: boolean;
  /** region names for shops/hint text */
  region?: string;
  /** rectangles kept free of random clutter / forage */
  clearZones?: { x: number; y: number; w: number; h: number }[];
  /** farm building plots: id → footprint */
  plots?: Record<string, { x: number; y: number; w: number; h: number }>;
}
