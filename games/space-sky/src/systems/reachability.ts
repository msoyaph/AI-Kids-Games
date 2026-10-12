import type { EntDef } from '../data/levelTypes';
import { jumpHeightTiles } from './platformer';
import { isSolidTile, tileAt, T_GEYSER, T_GOO, T_PAD, T_PLATFORM, type LevelEnt, type LevelModel } from './level';

/**
 * Conservative level checker used by tests: can a kid reach every sample, NPC, machine, crystal,
 * sticker and goal, solve every door, and always walk back to the rocket? Movement is modelled
 * on a tile grid with the real jump height of the level's world.
 */

export interface ReachOptions {
  gravityG: number;
  rover: boolean;
  /** Seconds of jetpack hover (0 for rovers). Normal difficulty is the stricter case. */
  hover: number;
  include?: (e: LevelEnt) => boolean;
}

export interface ReachReport {
  ok: boolean;
  problems: string[];
  reachable: number;
  /** Doors that could be opened. */
  doorsOpened: string[];
}

interface Graph {
  w: number;
  h: number;
  cols: number;
  standable: Uint8Array;
  launch: Float32Array;
}

const WALK = 300;
const TILE = 48;

function blockedCell(m: LevelModel, closed: Set<string>, doorCells: Map<string, string>, x: number, y: number): boolean {
  if (x < 0 || x >= m.w || y >= m.h) return true;
  if (y < 0) return false;
  if (isSolidTile(tileAt(m, x, y))) return true;
  const d = doorCells.get(`${x},${y}`);
  return d !== undefined && closed.has(d);
}

export function analyzeLevel(m: LevelModel, opts: ReachOptions): ReachReport {
  const problems: string[] = [];
  const include = opts.include ?? (() => true);
  const ents = m.ents.filter(include);
  const cols = opts.rover ? 2 : 1;
  const H = Math.floor(jumpHeightTiles(opts.gravityG) - 0.15);
  const gg = (2.7 / jumpHeightTiles(opts.gravityG)) ** 2;
  const g = 2400 * gg;
  const v0 = Math.sqrt(2 * g * (jumpHeightTiles(opts.gravityG) * TILE));

  // Door cells.
  const doorCells = new Map<string, string>();
  const doors: Array<{ id: string; open: string[]; x: number; y: number; h: number }> = [];
  for (const e of ents) {
    if (e.kind === 'door' && e.def?.kind === 'door') {
      doors.push({ id: e.def.id, open: e.def.open, x: e.tx, y: e.ty, h: e.h });
      for (let k = 0; k < e.h; k++) doorCells.set(`${e.tx},${e.ty + k}`, e.def.id);
    }
  }
  const closed = new Set(doors.map((d) => d.id));

  const buildGraph = (): Graph => {
    const standable = new Uint8Array(m.w * m.h);
    const launch = new Float32Array(m.w * m.h);
    for (let y = 1; y < m.h; y++) {
      for (let x = 0; x + cols - 1 < m.w; x++) {
        let free = true;
        let support = false;
        let lh = H;
        for (let c = 0; c < cols; c++) {
          if (blockedCell(m, closed, doorCells, x + c, y) || blockedCell(m, closed, doorCells, x + c, y - 1)) free = false;
          const below = tileAt(m, x + c, y + 1);
          const belowDoor = doorCells.get(`${x + c},${y + 1}`);
          if (isSolidTile(below) || below === T_PLATFORM || (belowDoor && closed.has(belowDoor))) support = true;
          if (below === T_PAD) lh = Math.max(lh, Math.floor(H * 1.9));
          if (below === T_GEYSER) lh = Math.max(lh, Math.floor(H * 2.2));
          if (tileAt(m, x + c, y) === T_GOO) {
            support = true;
            lh = Math.max(lh, Math.floor(H * 1.25));
          }
        }
        if (free && support) {
          standable[y * m.w + x] = 1;
          launch[y * m.w + x] = lh;
        }
      }
    }
    return { w: m.w, h: m.h, cols, standable, launch };
  };

  const clearRect = (x0: number, x1: number, y0: number, y1: number): boolean => {
    const xa = Math.min(x0, x1);
    const xb = Math.max(x0, x1) + cols - 1;
    const ya = Math.min(y0, y1);
    const yb = Math.max(y0, y1);
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) if (blockedCell(m, closed, doorCells, x, y)) return false;
    return true;
  };

  /** Horizontal tiles you can cover in a jump that ends dy tiles higher (negative = lower). */
  const reachX = (dyUp: number, lh: number): number => {
    const hPx = dyUp * TILE;
    const vv = Math.sqrt(2 * g * (lh * TILE + 6));
    const disc = vv * vv - 2 * g * hPx;
    if (disc < 0) return -1;
    const t = (vv + Math.sqrt(disc)) / g + (dyUp <= 0 ? opts.hover * 0.6 : 0);
    return Math.floor((WALK * t) / TILE) - 1;
  };
  void v0;

  const neighbors = (gr: Graph, x: number, y: number, out: number[]): void => {
    out.length = 0;
    const lh = gr.launch[y * gr.w + x];
    // Walk.
    for (const dx of [-1, 1]) {
      const nx = x + dx;
      if (nx < 0 || nx + cols - 1 >= gr.w) continue;
      if (gr.standable[y * gr.w + nx]) out.push(y * gr.w + nx);
      else if (clearRect(nx, nx, y - 1, y)) {
        // Walk off the ledge and fall straight down.
        let fy = y;
        while (fy < gr.h - 1 && !gr.standable[fy * gr.w + nx] && clearRect(nx, nx, fy, fy + 1)) fy++;
        if (gr.standable[fy * gr.w + nx]) out.push(fy * gr.w + nx);
      }
    }
    // Jumps.
    const maxDx = reachX(-6, lh) + 1;
    for (let ty = Math.max(1, y - lh); ty < gr.h; ty++) {
      for (let tx = Math.max(0, x - maxDx); tx <= Math.min(gr.w - cols, x + maxDx); tx++) {
        if (tx === x && ty === y) continue;
        if (!gr.standable[ty * gr.w + tx]) continue;
        const dyUp = y - ty;
        const rx = reachX(dyUp, lh);
        if (rx < 0 || Math.abs(tx - x) > rx) continue;
        // Try a box-shaped path: up, across, down, at some peak height.
        const topPeak = y - lh;
        let ok = false;
        for (let pk = Math.min(y, ty) - (dyUp >= 0 ? 0 : 0); pk >= topPeak && !ok; pk--) {
          if (pk < 0) break;
          if (!clearRect(x, x, pk - 1, y - 1)) break;
          if (!clearRect(x, tx, pk - 1, pk)) continue;
          if (!clearRect(tx, tx, pk - 1, ty)) continue;
          ok = true;
        }
        if (ok) out.push(ty * gr.w + tx);
      }
    }
  };

  const start = (): number => {
    let y = m.startY;
    const x = m.startX;
    let gr = buildGraph();
    while (y < m.h - 1 && !gr.standable[y * m.w + x]) y++;
    void gr;
    gr = buildGraph();
    return y * m.w + x;
  };

  const bfs = (gr: Graph, from: number): Uint8Array => {
    const seen = new Uint8Array(gr.w * gr.h);
    const queue: number[] = [from];
    seen[from] = 1;
    const nb: number[] = [];
    while (queue.length) {
      const c = queue.pop()!;
      neighbors(gr, c % gr.w, Math.floor(c / gr.w), nb);
      for (const n of nb) if (!seen[n]) {
        seen[n] = 1;
        queue.push(n);
      }
    }
    return seen;
  };

  // Is a point (entity cell) touchable from the reachable set?
  const touchable = (gr: Graph, seen: Uint8Array, ex: number, ey: number, reachUp: number): boolean => {
    for (let y = ey; y <= Math.min(gr.h - 1, ey + reachUp + 1); y++) {
      for (let x = ex - cols; x <= ex + 1; x++) {
        if (x < 0 || x >= gr.w) continue;
        const i = y * gr.w + x;
        if (seen[i] && clearRect(x, x, ey, y)) return true;
      }
    }
    return false;
  };

  let gr = buildGraph();
  const s0 = start();
  let seen = bfs(gr, s0);
  const opened: string[] = [];

  // Open doors in rounds as their switches become doable.
  for (let round = 0; round < 10; round++) {
    const activatable = new Set<string>();
    for (const e of ents) {
      const d = e.def as EntDef | null;
      if (e.kind === 'plate' && d?.kind === 'plate') {
        if (!d.heavy && touchable(gr, seen, e.tx, e.ty, 0)) activatable.add(d.id);
        if (d.heavy && heavyPlateDoable(m, ents, e, gr, seen)) activatable.add(d.id);
      }
      if (e.kind === 'machine' && d?.kind === 'machine') {
        const orbs = ents.filter((o) => o.kind === 'orb' && touchable(gr, seen, o.tx, o.ty, H));
        if (touchable(gr, seen, e.tx, e.ty, 1) && orbs.length >= d.needs) activatable.add(d.id);
      }
    }
    const groups = new Map<string, LevelEnt[]>();
    for (const e of ents) if (e.kind === 'crystal' && e.def?.kind === 'crystal') groups.set(e.def.group, [...(groups.get(e.def.group) ?? []), e]);
    for (const [gid, list] of groups) if (list.every((c) => touchable(gr, seen, c.tx, c.ty, 1))) activatable.add(gid);
    let changed = false;
    for (const d of doors) {
      if (!closed.has(d.id)) continue;
      if (d.open.length && d.open.every((id) => activatable.has(id))) {
        closed.delete(d.id);
        opened.push(d.id);
        changed = true;
      }
    }
    if (!changed) break;
    gr = buildGraph();
    seen = bfs(gr, s0);
  }
  for (const d of doors) if (closed.has(d.id)) problems.push(`door ${d.id} at ${d.x},${d.y} can never open`);

  // Everything important must be reachable.
  for (const e of ents) {
    const d = e.def as EntDef | null;
    const where = `${e.kind}${d && 'item' in d ? ':' + (d as { item: string }).item : ''} at ${e.tx},${e.ty}`;
    switch (e.kind) {
      case 'sample':
      case 'item':
      case 'sticker':
      case 'goal':
      case 'coin':
        if (!touchable(gr, seen, e.tx, e.ty, H)) problems.push(`${where} is out of reach`);
        break;
      case 'npc':
      case 'machine':
      case 'crystal':
      case 'sign':
        if (!touchable(gr, seen, e.tx, e.ty, 1)) problems.push(`${where} is out of reach`);
        break;
      case 'orb':
        if (!touchable(gr, seen, e.tx, e.ty, H)) problems.push(`${where} is out of reach`);
        break;
      default:
        break;
    }
  }

  // From every reachable spot you must be able to get back to the rocket.
  const reverse = new Uint8Array(gr.w * gr.h);
  {
    const adj: number[][] = [];
    const nb: number[] = [];
    for (let i = 0; i < seen.length; i++) {
      if (!seen[i]) continue;
      neighbors(gr, i % gr.w, Math.floor(i / gr.w), nb);
      for (const n of nb) (adj[n] ??= []).push(i);
    }
    const q = [s0];
    reverse[s0] = 1;
    while (q.length) {
      const c = q.pop()!;
      for (const p of adj[c] ?? []) if (!reverse[p]) {
        reverse[p] = 1;
        q.push(p);
      }
    }
    let trapped = 0;
    let example = '';
    for (let i = 0; i < seen.length; i++) if (seen[i] && !reverse[i]) {
      trapped++;
      if (!example) example = `${i % gr.w},${Math.floor(i / gr.w)}`;
    }
    if (trapped > 0) problems.push(`${trapped} spots can't get back to the rocket (e.g. ${example})`);
  }

  let reachable = 0;
  for (let i = 0; i < seen.length; i++) reachable += seen[i];
  return { ok: problems.length === 0, problems, reachable, doorsOpened: opened };
}

/** A heavy plate is doable if a block sits on the same floor with nothing in between and the player can get behind it. */
function heavyPlateDoable(m: LevelModel, ents: LevelEnt[], plate: LevelEnt, gr: Graph, seen: Uint8Array): boolean {
  for (const b of ents) {
    if (b.kind !== 'block' || b.ty !== plate.ty) continue;
    const dir = Math.sign(plate.tx - b.tx);
    if (dir === 0) return true;
    let ok = true;
    for (let x = b.tx; x !== plate.tx + dir; x += dir) {
      if (isSolidTile(tileAt(m, x, b.ty))) ok = false;
      const below = tileAt(m, x, b.ty + 1);
      if (!isSolidTile(below) && below !== T_PLATFORM) ok = false;
    }
    const behind = b.tx - dir;
    if (ok && behind >= 0 && behind < gr.w && seen[b.ty * gr.w + behind]) return true;
  }
  return false;
}
