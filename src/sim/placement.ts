// Placement mode: a ghost footprint in front of the player for villager home plots
// (and, later, bridges/ramps). Confirm with the action button.
import { VILLAGER_BY_ID } from '../data/villagers';
import { Ground } from '../world/types';
import type { Rect } from '../world/types';
import type { Game } from './game';
import { facingVec, tileOf } from './player';
import { addStructure } from './structures';
import type { Structure } from './state';
import { invalidateReach } from './villagers';

export interface Placement {
  kind: 'plot' | 'bridge' | 'ramp';
  owner?: string;
  rect: Rect | null;
  /** extra tiles shown (e.g. door step) */
  extra: Rect | null;
  valid: boolean;
  reason: string;
  dir?: number;
  level?: number;
  onPlaced?: (s: Structure) => void;
  /** custom confirm (bridges / ramps) */
  onConfirm?: (g: Game, p: Placement) => boolean;
  /** recompute rect/validity from the player's position */
  compute: (g: Game, p: Placement) => void;
}

export function placementRT(g: Game): Placement | null {
  return (g.runtime.placement as Placement | undefined) ?? null;
}

export function cancelPlacement(g: Game): void {
  g.runtime.placement = undefined;
  if (g.mode === 'placement') g.mode = 'play';
}

const CLEARABLE = new Set(['weed', 'item', 'flower', 'dig']);

export function computePlot(g: Game, pl: Placement): void {
  const w = g.world;
  const p = g.state.player;
  const [fx, fz] = facingVec(p.facing);
  const here = tileOf(w, p.x, p.z);
  const hx = here % w.size, hz = (here / w.size) | 0;
  const dx = Math.abs(fx) > Math.abs(fz) ? Math.sign(fx) : 0;
  const dz = dx === 0 ? Math.sign(fz) || 1 : 0;
  // 3x3 house whose center sits 3 tiles ahead; door step on its south side
  const cx = hx + dx * 3, cz = hz + dz * 3;
  const rect = { x: cx - 1, z: cz - 1, w: 3, d: 3 };
  const door = { x: cx, z: cz + 2, w: 1, d: 1 };
  pl.rect = rect;
  pl.extra = door;
  const fail = (reason: string) => {
    pl.valid = false;
    pl.reason = reason;
  };
  for (let z = rect.z - 1; z < rect.z + rect.d + 1; z++)
    for (let x = rect.x - 1; x < rect.x + rect.w + 1; x++) {
      if (!w.inb(x, z)) return fail('Too close to the edge of the island.');
      const i = w.idx(x, z);
      const inside = x >= rect.x && x < rect.x + rect.w && z >= rect.z && z < rect.z + rect.d;
      if (w.structure(i)) return fail('Too close to another building.');
      if (!inside) continue;
      if (w.height(i) !== p.level) return fail('The ground needs to be flat.');
      const gr = w.ground(i);
      if (gr !== Ground.Grass && gr !== Ground.Dirt && gr !== Ground.Sand) return fail("Homes can't go on water.");
      const o = w.obj(i);
      if (o && !CLEARABLE.has(o.k)) return fail('Something is in the way (trees, rocks or decorations).');
    }
  const di = w.idx(door.x, door.z);
  if (!w.inb(door.x, door.z) || !w.standable(di) || w.height(di) !== p.level) return fail('The front door needs a clear step.');
  pl.valid = true;
  pl.reason = '';
}

export function startPlotPlacement(g: Game, owner: string, onPlaced?: (s: Structure) => void): void {
  g.runtime.placement = { kind: 'plot', owner, rect: null, extra: null, valid: false, reason: '', compute: computePlot, onPlaced } satisfies Placement;
  g.mode = 'placement';
}

export function updatePlacement(g: Game): void {
  const pl = placementRT(g);
  if (!pl) return;
  pl.compute(g, pl);
}

/** Confirm the current placement. Returns true if placed. */
export function confirmPlacement(g: Game): boolean {
  const pl = placementRT(g);
  if (!pl) return false;
  pl.compute(g, pl);
  if (!pl.valid || !pl.rect) {
    g.toast(pl.reason || "Can't place that here.", 'warn');
    g.emit('sfx', { name: 'error' });
    return false;
  }
  if (pl.onConfirm) return pl.onConfirm(g, pl);
  if (pl.kind === 'plot') {
    const s = addStructure(g, { type: 'plot', ...pl.rect, level: g.state.player.level, owner: pl.owner });
    g.emit('plotPlaced', { owner: pl.owner ?? '' });
    g.toast(`Plot marked for ${VILLAGER_BY_ID[pl.owner ?? '']?.name ?? 'a new neighbor'}!`, 'good');
    invalidateReach();
    cancelPlacement(g);
    pl.onPlaced?.(s);
    return true;
  }
  return false;
}

export function plotsFor(g: Game, owner: string): Structure | undefined {
  return g.state.world.structures.find((s) => (s.type === 'plot' || s.type === 'villagerHome' || s.type === 'construction') && s.owner === owner);
}

/** Mark plots (for the given owners) to be built and moved into tomorrow morning. */
export function scheduleMoveIn(g: Game, owners: string[]): void {
  for (const s of g.state.world.structures) if (s.type === 'plot' && s.owner && owners.includes(s.owner)) s.readyDay = g.state.clock.day + 1;
}
