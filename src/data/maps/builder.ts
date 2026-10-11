/** Small DSL for authoring maps in data files: shapes, ASCII stamps, props, warps. */
import type { Dir } from '../../core/math';
import { Rng } from '../../core/rng';
import { Ter, type TerId } from '../../sim/terrain';
import { STRUCTURES } from '../structures';
import type { MapDef, PropPlacement, StructurePlacement, Trigger, Warp, WaterZone } from './types';

export class MapBuilder {
  readonly w: number;
  readonly h: number;
  readonly ground: Uint8Array;
  props: PropPlacement[] = [];
  structures: StructurePlacement[] = [];
  warps: Warp[] = [];
  triggers: Trigger[] = [];
  points: Record<string, { x: number; y: number; dir?: Dir }> = {};
  waterZones: { x: number; y: number; w: number; h: number; zone: WaterZone }[] = [];
  clearZones: { x: number; y: number; w: number; h: number }[] = [];
  plots: Record<string, { x: number; y: number; w: number; h: number }> = {};
  /** tiles reserved from props / clutter */
  private taken: Uint8Array;

  constructor(w: number, h: number, fill: TerId = Ter.GRASS) {
    this.w = w;
    this.h = h;
    this.ground = new Uint8Array(w * h).fill(fill);
    this.taken = new Uint8Array(w * h);
  }

  in(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  get(x: number, y: number): number {
    return this.in(x, y) ? this.ground[y * this.w + x] : Ter.VOID;
  }
  set(x: number, y: number, t: TerId): this {
    if (this.in(x, y)) this.ground[y * this.w + x] = t;
    return this;
  }
  rect(x: number, y: number, w: number, h: number, t: TerId): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, t);
    return this;
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, t: TerId): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.set(x, y, t);
      }
    return this;
  }
  /** Thick line of terrain between two points (inclusive). */
  path(x0: number, y0: number, x1: number, y1: number, t: TerId, thick = 1): this {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / Math.max(1, steps));
      const y = Math.round(y0 + ((y1 - y0) * s) / Math.max(1, steps));
      this.rect(x - Math.floor((thick - 1) / 2), y - Math.floor((thick - 1) / 2), thick, thick, t);
    }
    return this;
  }
  /** Stamp ASCII rows; legend maps chars to terrain and/or a prop kind. */
  ascii(x0: number, y0: number, rows: readonly string[], legend: Record<string, { t?: TerId; prop?: string }>): this {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const l = legend[row[i]];
        if (!l) continue;
        if (l.t !== undefined) this.set(x0 + i, y0 + j, l.t);
        if (l.prop) this.prop(l.prop, x0 + i, y0 + j);
      }
    });
    return this;
  }
  prop(kind: string, x: number, y: number): this {
    if (!this.in(x, y)) return this;
    this.props.push({ kind, x, y });
    this.taken[y * this.w + x] = 1;
    return this;
  }
  isTaken(x: number, y: number): boolean {
    return !this.in(x, y) || this.taken[y * this.w + x] === 1;
  }
  reserve(x: number, y: number, w: number, h: number): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (this.in(x + i, y + j)) this.taken[(y + j) * this.w + x + i] = 1;
    return this;
  }
  structure(kind: string, x: number, y: number, w: number, h: number, id?: string, door?: StructurePlacement['door']): this {
    this.structures.push({ kind, x, y, id, door });
    const sd = STRUCTURES[kind] ?? STRUCTURES[kind + '0'];
    if (sd?.door) this.reserve(x + sd.door.dx, y + sd.door.dy + 1, 1, 2); // keep the doorstep clear
    return this.reserve(x, y, w, h);
  }
  warp(x: number, y: number, to: string, tx: number, ty: number, opts: Partial<Warp> = {}): this {
    this.warps.push({ x, y, to, tx, ty, ...opts });
    return this;
  }
  point(name: string, x: number, y: number, dir?: Dir): this {
    this.points[name] = { x, y, dir };
    return this;
  }
  trigger(x: number, y: number, action: string, arg?: string, w = 1, h = 1): this {
    this.triggers.push({ x, y, w, h, action, arg });
    return this;
  }
  /** Fill a border band with a prop (e.g. trees) leaving gaps. thickness may vary by noise. */
  forestBorder(kind: string, thick: number, seed: number, gaps: { x: number; y: number; w: number; h: number }[] = []): this {
    const rng = new Rng(seed);
    const inGap = (x: number, y: number) => gaps.some((g) => x >= g.x && x < g.x + g.w && y >= g.y && y < g.y + g.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const d = Math.min(x, y, this.w - 1 - x, this.h - 1 - y);
        const t = thick + (rng.next() < 0.35 ? 1 : 0);
        if (d < t && !inGap(x, y) && !this.isTaken(x, y)) {
          // checkerboard-ish to keep sprites readable; fill the rest with solid void-grass
          this.prop(kind, x, y);
        }
      }
    return this;
  }
  /** Scatter props on matching terrain in a region. */
  scatter(kind: string, density: number, seed: number, region = { x: 0, y: 0, w: this.w, h: this.h }, onTer: TerId[] = [Ter.GRASS]): this {
    const rng = new Rng(seed);
    for (let y = region.y; y < region.y + region.h; y++)
      for (let x = region.x; x < region.x + region.w; x++) {
        if (this.isTaken(x, y)) continue;
        if (!onTer.includes(this.get(x, y) as TerId)) continue;
        if (rng.next() < density) this.prop(kind, x, y);
      }
    return this;
  }

  clear(x: number, y: number, w: number, h: number): this {
    this.clearZones.push({ x, y, w, h });
    return this;
  }
  plot(id: string, x: number, y: number, w: number, h: number): this {
    this.plots[id] = { x, y, w, h };
    this.clearZones.push({ x, y, w, h });
    return this;
  }

  build(meta: Omit<MapDef, 'w' | 'h' | 'ground' | 'props' | 'structures' | 'warps' | 'points' | 'triggers' | 'waterZones' | 'clearZones' | 'plots'>): MapDef {
    return {
      ...meta,
      w: this.w,
      h: this.h,
      ground: this.ground,
      props: this.props,
      structures: this.structures,
      warps: this.warps,
      points: this.points,
      triggers: this.triggers,
      waterZones: this.waterZones,
      clearZones: this.clearZones,
      plots: this.plots,
    };
  }
}

/** Build an interior from ASCII. Legend chars: '#' wall top, 'W' wall face, '.' floor, ',' tile floor, 'c' carpet. */
export function interior(
  id: string,
  name: string,
  rows: readonly string[],
  extra: Record<string, { t?: TerId; prop?: string }> = {},
  music = 'home',
): MapBuilder & { meta: { id: string; name: string; music: string } } {
  const h = rows.length, w = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== w) throw new Error(`interior ${id}: row ${i} has ${r.length} chars, expected ${w}`);
  });
  const b = new MapBuilder(w, h, Ter.FLOOR) as MapBuilder & { meta: { id: string; name: string; music: string } };
  b.ascii(0, 0, rows, {
    '#': { t: Ter.WALLTOP },
    W: { t: Ter.WALL },
    '.': { t: Ter.FLOOR },
    ',': { t: Ter.TILEFLOOR },
    c: { t: Ter.CARPET },
    s: { t: Ter.STONEFLOOR },
    D: { t: Ter.FLOOR },
    ...extra,
  });
  b.meta = { id, name, music };
  return b;
}
