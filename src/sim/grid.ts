import type { MapDef } from '../data/maps/types';

export const F_WALK = 1;
export const F_BUILD = 2;
export const F_SPAWN = 4;
export const F_GOAL = 8;
export const F_WATER = 16;
export const F_ROCK = 32;
export const F_TREE = 64;
export const F_BUSH = 128;

/** Static terrain + which tower (if any) occupies each cell. */
export class Grid {
  readonly cols: number;
  readonly rows: number;
  readonly flags: Uint8Array;
  /** Tower id occupying the cell, or -1. */
  readonly tower: Int32Array;
  readonly spawns: number[] = [];
  readonly goals: number[] = [];
  /** Castle centre in tile coordinates. */
  castleX = 0;
  castleY = 0;

  constructor(map: MapDef) {
    const rows = map.grid.length;
    const cols = Math.max(...map.grid.map((r) => r.length));
    this.cols = cols;
    this.rows = rows;
    this.flags = new Uint8Array(cols * rows);
    this.tower = new Int32Array(cols * rows).fill(-1);
    let gx = 0;
    let gy = 0;
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
            gx += x + 0.5;
            gy += y + 0.5;
            break;
          default:
            f = F_ROCK;
        }
        this.flags[i] = f;
      }
    }
    if (this.goals.length === 0) throw new Error(`Map ${map.id} has no castle`);
    if (this.spawns.length === 0) throw new Error(`Map ${map.id} has no spawn`);
    this.castleX = gx / this.goals.length;
    this.castleY = gy / this.goals.length;
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
