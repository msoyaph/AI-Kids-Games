import type { MapDef } from '../data/maps/types';

export const F_WALK = 1;
export const F_BUILD = 2;
export const F_SPAWN = 4;
export const F_GOAL = 8;
export const F_WATER = 16;
export const F_ROCK = 32;
export const F_TREE = 64;
export const F_BUSH = 128;

/** Cells whose walkability changes during a match. */
export type DynamicKind = 'bridgeA' | 'bridgeB' | 'unstable' | 'rubble';

/** Static terrain + which tower (if any) occupies each cell. */
export class Grid {
  readonly cols: number;
  readonly rows: number;
  readonly flags: Uint8Array;
  /** Tower id occupying the cell, or -1. */
  readonly tower: Int32Array;
  readonly spawns: number[] = [];
  readonly goals: number[] = [];
  /** Castle centre in tile coordinates (the first castle when there are two). */
  castleX = 0;
  castleY = 0;
  /** Centre of every castle (2×2 clusters of goal cells). */
  readonly castles: { x: number; y: number }[] = [];
  /** Teleporter gates: walking into `from` comes out at `to`. */
  readonly teleports: { from: number; to: number }[] = [];
  /** Cell → its gate exit (or -1). */
  readonly teleportTo: Int32Array;
  /** Cells whose walkability changes (bridges, unstable ground, rubble). */
  readonly dynamic: { cell: number; kind: DynamicKind }[] = [];
  /** Flyers' route: sky portal first, then the lane cells toward the castle. Empty = straight flight. */
  readonly skyPath: number[] = [];
  /** Current terrain state. */
  bridgePhase = 0;
  shifted = false;
  /** Bumps whenever walkability changes (towers or terrain). */
  terrainVersion = 0;

  constructor(map: MapDef) {
    const rows = map.grid.length;
    const cols = Math.max(...map.grid.map((r) => r.length));
    this.cols = cols;
    this.rows = rows;
    this.flags = new Uint8Array(cols * rows);
    this.tower = new Int32Array(cols * rows).fill(-1);
    this.teleportTo = new Int32Array(cols * rows).fill(-1);
    const gates: Record<string, number> = {};
    let portal = -1;
    const lane = new Set<number>();
    for (let y = 0; y < rows; y++) {
      const line = map.grid[y]!;
      for (let x = 0; x < cols; x++) {
        const ch = line[x] ?? '#';
        const i = y * cols + x;
        let f = 0;
        switch (ch) {
          case '.':
            f = F_WALK | F_BUILD;
            break;
          case 'o':
            f = F_BUILD;
            break;
          case '=':
            f = F_WALK;
            break;
          case '~':
            f = F_WATER;
            break;
          case 'T':
            f = F_TREE;
            break;
          case 'B':
            f = F_BUSH;
            break;
          case 'S':
            f = F_WALK | F_SPAWN;
            this.spawns.push(i);
            break;
          case 'C':
            f = F_WALK | F_GOAL;
            this.goals.push(i);
            break;
          case 'P':
          case 'Q':
          case 'p':
          case 'q':
            f = F_WALK;
            gates[ch] = i;
            break;
          case 'H':
            f = F_WALK; // bridge A starts down
            this.dynamic.push({ cell: i, kind: 'bridgeA' });
            break;
          case 'h':
            f = F_WATER; // bridge B starts up
            this.dynamic.push({ cell: i, kind: 'bridgeB' });
            break;
          case 'Y':
            f = F_WATER;
            portal = i;
            break;
          case 'F':
            f = F_WATER;
            lane.add(i);
            break;
          case 'U':
            f = F_WALK;
            this.dynamic.push({ cell: i, kind: 'unstable' });
            break;
          case 'R':
            f = F_ROCK;
            this.dynamic.push({ cell: i, kind: 'rubble' });
            break;
          default:
            f = F_ROCK;
        }
        this.flags[i] = f;
      }
    }
    if (this.goals.length === 0) throw new Error(`Map ${map.id} has no castle`);
    if (this.spawns.length === 0) throw new Error(`Map ${map.id} has no spawn`);
    // castles: cluster goal cells that touch
    const seen = new Set<number>();
    for (const g0 of this.goals) {
      if (seen.has(g0)) continue;
      const stack = [g0];
      let sx = 0;
      let sy = 0;
      let n = 0;
      seen.add(g0);
      while (stack.length) {
        const c = stack.pop()!;
        sx += (c % cols) + 0.5;
        sy += ((c / cols) | 0) + 0.5;
        n++;
        for (const o of this.goals) {
          if (seen.has(o)) continue;
          if (Math.abs((o % cols) - (c % cols)) <= 1 && Math.abs(((o / cols) | 0) - ((c / cols) | 0)) <= 1) {
            seen.add(o);
            stack.push(o);
          }
        }
      }
      this.castles.push({ x: sx / n, y: sy / n });
    }
    this.castleX = this.castles[0]!.x;
    this.castleY = this.castles[0]!.y;
    // teleporter pairs
    for (const [a, b] of [
      ['P', 'Q'],
      ['p', 'q'],
    ] as const) {
      if (gates[a] !== undefined && gates[b] !== undefined) {
        this.teleports.push({ from: gates[a]!, to: gates[b]! });
        this.teleportTo[gates[a]!] = gates[b]!;
      }
    }
    // sky lane: follow F cells from the portal (each lane cell touches the next)
    if (portal >= 0) {
      this.skyPath.push(portal);
      let cur = portal;
      const used = new Set<number>([portal]);
      for (;;) {
        let nextCell = -1;
        for (const dy of [0, -1, 1]) {
          for (const dx of [1, 0, -1]) {
            if (!dx && !dy) continue;
            const nx = (cur % cols) + dx;
            const ny = ((cur / cols) | 0) + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            const ni = ny * cols + nx;
            if (lane.has(ni) && !used.has(ni) && nextCell < 0) nextCell = ni;
          }
        }
        if (nextCell < 0) break;
        used.add(nextCell);
        this.skyPath.push(nextCell);
        cur = nextCell;
      }
    }
  }

  /** Nearest castle centre to a point. */
  nearestCastle(x: number, y: number): { x: number; y: number } {
    let best = this.castles[0]!;
    let bestD = Infinity;
    for (const c of this.castles) {
      const d = (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  /** Set the walkability of every dynamic cell for a terrain state (bridge phase, shifted or not). */
  applyTerrain(bridgePhase: number, shifted: boolean): void {
    this.setTerrainFlags(bridgePhase, shifted);
    this.bridgePhase = bridgePhase;
    this.shifted = shifted;
    this.terrainVersion++;
  }

  /** Flags only (used to test "what if" terrain states, then restored). */
  setTerrainFlags(bridgePhase: number, shifted: boolean): void {
    for (const d of this.dynamic) {
      const i = d.cell;
      let f: number;
      switch (d.kind) {
        case 'bridgeA':
          f = bridgePhase === 0 ? F_WALK : F_WATER;
          break;
        case 'bridgeB':
          f = bridgePhase === 1 ? F_WALK : F_WATER;
          break;
        case 'unstable':
          f = shifted ? F_ROCK : F_WALK;
          break;
        case 'rubble':
          f = shifted ? F_WALK | F_BUILD : F_ROCK;
          break;
      }
      this.flags[i] = f;
    }
  }

  idx(x: number, y: number): number {
    return y * this.cols + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  /** Walkable right now (terrain allows it and no tower on it). */
  isOpen(i: number): boolean {
    return (this.flags[i]! & F_WALK) !== 0 && this.tower[i]! < 0;
  }

  isBuildable(i: number): boolean {
    return (this.flags[i]! & F_BUILD) !== 0 && this.tower[i]! < 0;
  }

  cellX(i: number): number {
    return i % this.cols;
  }

  cellY(i: number): number {
    return (i / this.cols) | 0;
  }

  /** Cell index containing a tile-space point, or -1 if outside. */
  cellAt(x: number, y: number): number {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    return this.inBounds(cx, cy) ? cy * this.cols + cx : -1;
  }
}
