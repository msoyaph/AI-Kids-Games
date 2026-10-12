import { DIRS, type Terrain } from './terrain';
import type { World } from './world';

/** Path cost of an orthogonal / diagonal lattice step (ratio ≈ √2). */
const ORTHO = 2;
const DIAG = 3;
/** Search radius in cost units (~95 world units — stragglers further out are recycled). */
const MAX_COST = 190;
const BUCKETS = 4; // > DIAG
export const UNREACHABLE = 0x7fffffff;
/** Minimum ticks between starting recomputations (≈ 4 per second). */
const MIN_INTERVAL = 15;
/** Node expansions per tick for incremental builds (keeps every tick cheap). */
const BUDGET_PER_TICK = 9000;
/** Fewer reachable cells than this means the player is on an unreachable island. */
const ISLAND_CELLS = 2500;

/**
 * Distance field toward the player over the terrain's walkability lattice. Enemies follow its
 * downhill gradient, so they walk around plateaus and use ramps instead of hopping cliffs.
 *
 * Dial's algorithm with array bucket queues (integer costs: deterministic, no heap). Builds
 * run incrementally into a back buffer under a per-tick budget and swap in when complete, so
 * no single tick pays for a whole recompute.
 */
export class FlowField {
  /** Current field (cost to reach the player; UNREACHABLE where no path). */
  dist: Int32Array;
  private back: Int32Array;
  private readonly pass: Uint8Array;
  private readonly off: Int32Array;
  private readonly cost: Int32Array;
  private readonly q: Int32Array[];
  private readonly qHead = new Int32Array(BUCKETS);
  private readonly qTail = new Int32Array(BUCKETS);
  // in-progress build state
  private building = false;
  private buildTarget = -1;
  private buildCost = 0;
  private buildPending = 0;
  private buildReached = 0;
  targetCell = -1;
  private lastStart = -1e9;
  /** Completed builds (tests / debug). */
  computations = 0;
  /** Cells reached by the last completed build. */
  reached = 0;
  /**
   * The player stands somewhere the ground can't reach (e.g. launched onto a plateau with
   * no ramp). Enemies then fall back to climbing straight at her, so no spot is ever safe.
   */
  island = false;

  constructor(private terrain: Terrain) {
    const d = terrain.hdim;
    this.pass = terrain.pass;
    const cells = d * d;
    this.dist = new Int32Array(cells).fill(UNREACHABLE);
    this.back = new Int32Array(cells).fill(UNREACHABLE);
    this.off = Int32Array.from(DIRS.map(([dx, dz]) => dz * d + dx));
    this.cost = Int32Array.from(DIRS.map((_, k) => (k < 4 ? ORTHO : DIAG)));
    // a cell can be queued a few times when its distance improves
    this.q = Array.from({ length: BUCKETS }, () => new Int32Array(cells));
  }

  /** Called once per tick: start / continue builds toward the player's grounded cell. */
  update(w: World): void {
    const p = w.player;
    if (this.building) {
      this.advance(BUDGET_PER_TICK);
      return;
    }
    if (!p.onGround && this.targetCell >= 0) return; // keep the last grounded target mid-air
    const c = this.terrain.cellOf(p.x, p.z);
    if (c === this.targetCell) return;
    if (this.targetCell < 0) {
      // first field of the run: build it completely right away (spawns depend on it)
      this.compute(c);
      this.lastStart = w.tick;
      return;
    }
    if (w.tick - this.lastStart < MIN_INTERVAL) return;
    this.start(c);
    this.lastStart = w.tick;
    this.advance(BUDGET_PER_TICK);
  }

  /** Build the whole field now (tests, first tick). */
  compute(target: number): void {
    this.start(target);
    this.advance(Infinity);
  }

  private start(target: number): void {
    this.back.fill(UNREACHABLE);
    this.qHead.fill(0);
    this.qTail.fill(0);
    this.back[target] = 0;
    this.q[0][this.qTail[0]++] = target;
    this.building = true;
    this.buildTarget = target;
    this.buildCost = 0;
    this.buildPending = 1;
    this.buildReached = 1;
  }

  private advance(budget: number): void {
    const dist = this.back;
    const pass = this.pass;
    const off = this.off;
    const stepCost = this.cost;
    const q = this.q;
    const qHead = this.qHead;
    const qTail = this.qTail;
    let cost = this.buildCost;
    let pending = this.buildPending;
    let reached = this.buildReached;
    while (pending > 0 && cost <= MAX_COST && budget > 0) {
      const b = cost % BUCKETS;
      const queue = q[b];
      while (qHead[b] < qTail[b] && budget > 0) {
        const c = queue[qHead[b]++];
        pending--;
        budget--;
        if (dist[c] !== cost) continue; // stale entry
        const m = pass[c];
        for (let k = 0; k < 8; k++) {
          if (!(m & (1 << k))) continue;
          const n = c + off[k];
          const nd = cost + stepCost[k];
          if (nd < dist[n]) {
            if (dist[n] === UNREACHABLE) reached++;
            dist[n] = nd;
            const nb = nd % BUCKETS;
            if (qTail[nb] < queue.length) {
              q[nb][qTail[nb]++] = n;
              pending++;
            }
          }
        }
      }
      if (qHead[b] >= qTail[b]) {
        // bucket drained: recycle it and move on to the next cost
        qHead[b] = qTail[b] = 0;
        cost++;
      }
    }
    this.buildCost = cost;
    this.buildPending = pending;
    this.buildReached = reached;
    if (pending > 0 && cost <= MAX_COST) return; // budget spent: continue next tick
    // done: swap in
    const front = this.dist;
    this.dist = this.back;
    this.back = front;
    this.building = false;
    this.targetCell = this.buildTarget;
    this.reached = reached;
    this.island = reached < ISLAND_CELLS;
    this.computations++;
  }

  /** Path cost from a world position to the player (UNREACHABLE if none). */
  costAt(x: number, z: number): number {
    return this.dist[this.terrain.cellOf(x, z)];
  }

  reachable(x: number, z: number): boolean {
    return this.targetCell < 0 || this.island || this.costAt(x, z) !== UNREACHABLE;
  }

  /**
   * Downhill direction of the field at lattice cell c, written to out[0..1] (unit length).
   * Returns false where the field has no information (unreachable / target cell / island).
   */
  directionAt(c: number, out: Float32Array): boolean {
    if (this.island) return false;
    const here = this.dist[c];
    if (here === UNREACHABLE || here === 0) return false;
    const m = this.pass[c];
    // weighted sum of directions toward lower-cost walkable neighbours (smooth, no zig-zag)
    let gx = 0;
    let gz = 0;
    for (let k = 0; k < 8; k++) {
      if (!(m & (1 << k))) continue;
      const drop = here - this.dist[c + this.off[k]];
      if (drop <= 0) continue;
      const inv = k < 4 ? 1 : 0.7071;
      gx += DIRS[k][0] * inv * drop;
      gz += DIRS[k][1] * inv * drop;
    }
    const l = Math.sqrt(gx * gx + gz * gz);
    if (l < 1e-6) return false;
    out[0] = gx / l;
    out[1] = gz / l;
    return true;
  }

  /** Nearest reachable lattice point within `radius` of (x, z), written to out; false if none. */
  nearestReachable(x: number, z: number, radius: number, out: Float32Array): boolean {
    if (this.reachable(x, z)) {
      out[0] = x;
      out[1] = z;
      return true;
    }
    const half = this.terrain.half;
    const r = Math.ceil(radius);
    let best = Infinity;
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const d2 = dx * dx + dz * dz;
        if (d2 >= best || d2 > radius * radius) continue;
        const px = Math.round(x) + dx;
        const pz = Math.round(z) + dz;
        if (px < -half || px > half || pz < -half || pz > half) continue;
        if (this.costAt(px, pz) === UNREACHABLE) continue;
        best = d2;
        out[0] = px;
        out[1] = pz;
      }
    }
    return best < Infinity;
  }
}
