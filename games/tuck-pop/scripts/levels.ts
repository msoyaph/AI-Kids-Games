// npm run levels
// Builds the 60 Adventure levels from the progression below, then proves each one:
//  1. a layout is generated from the level's seed (scattered clumps, items on blocks, stones);
//  2. a beam solver plays the real rules to reach the goal in as few moves as it can. Its moves
//     are saved to tests/fixtures/adventure-solutions.json, and CI replays them to prove 3 stars
//     are possible;
//  3. par3 = solver moves + a little slack (more in early worlds), and the move limit leaves room
//     to spare. A casual bot then plays each level 40 times; levels that are too hard for their
//     world get more moves.
// Writes src/data/levels.json. Rerun after changing the rules (the tests fail on stale data).
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { hash32, Rng } from '../src/core/rng';
import { findLines, fitsAt, newLines } from '../src/sim/board';
import { boardValue, casualChoice } from '../src/sim/bot';
import { LEVELS_PER_WORLD, levelGame, starsFor, type Level } from '../src/sim/adventure';
import { canMove, cloneGame, goalMet, place, progress, type Game, type Goal } from '../src/sim/game';
import { PIECES } from '../src/sim/pieces';
import { RULES_VERSION } from '../src/save/run';

type Kind = Goal['kind'];
interface Spec { kind: Kind; target: number; density: number; tip?: string }
const S = (kind: Kind, target: number, density: number, tip?: string): Spec => ({ kind, target, density, tip });

const PLAN: Spec[][] = [
  [ // Meadow: cherries; gentle start
    S('lines', 3, 0, 'Fill a whole row or column to make it pop!'), S('lines', 5, 0.1), S('items', 3, 0.15, 'Cherries sit on blocks. Clear their row or column to pick them!'),
    S('lines', 6, 0.12), S('items', 4, 0.18), S('score', 200, 0.1, 'Clear more lines at once, and keep clearing, for bigger scores!'), S('lines', 8, 0.18),
    S('items', 5, 0.2), S('score', 300, 0.15), S('lines', 9, 0.2), S('items', 6, 0.22), S('score', 400, 0.18), S('lines', 10, 0.22), S('items', 7, 0.24), S('score', 500, 0.2),
  ],
  [ // Ocean: pearls, and stones arrive
    S('stones', 2, 0.12, 'Stones need two clears: the first cracks them, the second breaks them!'), S('items', 5, 0.2), S('lines', 10, 0.2), S('stones', 3, 0.15), S('score', 500, 0.2),
    S('items', 6, 0.22), S('stones', 3, 0.2), S('lines', 11, 0.24), S('score', 650, 0.22), S('items', 7, 0.25), S('stones', 4, 0.22), S('lines', 12, 0.26), S('items', 8, 0.26), S('score', 800, 0.25), S('stones', 5, 0.25),
  ],
  [ // Candy: gems, busier boards, a few stones in the way
    S('lines', 12, 0.25), S('items', 7, 0.26), S('stones', 4, 0.24), S('score', 700, 0.25), S('items', 8, 0.28), S('lines', 13, 0.28), S('stones', 5, 0.26),
    S('score', 850, 0.28), S('items', 9, 0.3), S('lines', 14, 0.3), S('stones', 6, 0.28), S('score', 1000, 0.3), S('items', 10, 0.32), S('lines', 15, 0.32), S('stones', 6, 0.3),
  ],
  [ // Space: comets, the biggest challenges
    S('score', 900, 0.3), S('items', 9, 0.3), S('stones', 6, 0.28), S('lines', 15, 0.3), S('score', 1050, 0.32), S('items', 10, 0.32), S('stones', 7, 0.3),
    S('lines', 16, 0.32), S('score', 1200, 0.33), S('items', 11, 0.34), S('stones', 7, 0.32), S('lines', 17, 0.34), S('score', 1350, 0.34), S('items', 12, 0.35), S('stones', 8, 0.34),
  ],
];
const WEIGHTS: [number, number, number][] = [[55, 40, 5], [48, 42, 10], [42, 44, 14], [38, 44, 18]];
const SLACK = [3, 2, 1, 0], ROOM = [10, 8, 7, 6], CASUAL_FLOOR = [0.9, 0.75, 0.6, 0.45];
const BEAM = 64;

/** A layout: clumps up to the density, then items (on blocks) or stones (on empty cells), never a full line. */
function layout(spec: Spec, world: number, seed: number): string[] {
  const rng = new Rng(seed ^ 0x1a7);
  const lines = newLines();
  const cells = new Array<string>(64).fill('.');
  let lo = 0, hi = 0;
  const set = (i: number) => { if (i < 32) lo |= 1 << i; else hi |= 1 << (i - 32); };
  const free = (i: number) => cells[i] === '.';
  const ok = (l: number, h: number) => findLines(l, h, lines).count === 0;
  const want = Math.round(64 * spec.density);
  for (let tries = 0; 64 - [...cells].filter(free).length < want && tries < 400; tries++) {
    const p = rng.pick(PIECES.filter(q => q.tier < 2));
    const i = rng.int(p.count);
    if (!fitsAt(lo, hi, p, i) || !ok(lo | p.lo[i]!, hi | p.hi[i]!)) continue;
    const color = String(1 + rng.int(6));
    for (const [dr, dc] of p.cells) { const k = (p.pr[i]! + dr) * 8 + p.pc[i]! + dc; cells[k] = color; set(k); }
  }
  const spread = (pool: number[], n: number) => {
    // pick n cells, preferring rows and columns not used yet
    const out: number[] = [], rows = new Set<number>(), cols = new Set<number>();
    for (const k of rng.shuffle([...pool])) {
      if (out.length >= n) break;
      if (rows.has(k >> 3) && cols.has(k & 7) && pool.length > n * 2) continue;
      out.push(k); rows.add(k >> 3); cols.add(k & 7);
    }
    return out;
  };
  if (spec.kind === 'items') {
    const n = spec.target + 1 + Math.floor(spec.target / 4);
    let filled = cells.map((c, k) => (c !== '.' ? k : -1)).filter(k => k >= 0);
    while (filled.length < n) { // add single blocks to carry items
      const k = rng.int(64); if (!free(k)) continue;
      const [l, h] = k < 32 ? [lo | (1 << k), hi] : [lo, hi | (1 << (k - 32))];
      if (!ok(l, h)) continue;
      cells[k] = String(1 + rng.int(6)); set(k); filled.push(k);
    }
    for (const k of spread(filled, n)) cells[k] = 'g';
  }
  // stone goals put a few spare stones on the board (like spare items), so there's more than one way to win
  const stones = spec.kind === 'stones' ? spec.target + 1 + Math.floor(spec.target / 3) : world >= 2 ? 1 + Math.floor(rng.next() * 3) : 0;
  const empties = () => cells.map((c, k) => (c === '.' ? k : -1)).filter(k => k >= 0);
  for (const k of spread(empties(), stones * 3).slice(0, stones * 3)) {
    if ([...cells].filter(c => c === 's').length >= stones) break;
    const [l, h] = k < 32 ? [lo | (1 << k), hi] : [lo, hi | (1 << (k - 32))];
    if (!ok(l, h)) continue;
    cells[k] = 's'; set(k);
  }
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) rows.push(cells.slice(r * 8, r * 8 + 8).join(''));
  return rows;
}

/** How close a state is to its goal (higher is better). */
function value(g: Game, goal: Goal): number {
  if (goalMet(g)) return 1e9 - g.moves;
  if (g.over) return -1e9;
  const fill = (i: number) => {
    let row = 0, col = 0;
    for (let k = 0; k < 8; k++) { if (g.colors[(i >> 3) * 8 + k]) row++; if (g.colors[k * 8 + (i & 7)]) col++; }
    return Math.max(row, col) / 8;
  };
  let v = (Math.min(progress(g), goal.target) / goal.target) * 1000 + boardValue(g.lo, g.hi) * 3;
  if (goal.kind === 'items' || goal.kind === 'stones') {
    for (let i = 0; i < 64; i++) {
      const item = goal.kind === 'items' ? (i < 32 ? (g.itemLo >>> i) & 1 : (g.itemHi >>> (i - 32)) & 1) : (i < 32 ? ((g.s1Lo | g.s2Lo) >>> i) & 1 : ((g.s1Hi | g.s2Hi) >>> (i - 32)) & 1);
      if (item) v += fill(i) * 40;
    }
    if (goal.kind === 'stones') v += 60 * (countBits(g.s1Lo) + countBits(g.s1Hi)); // cracked stones are halfway
  }
  if (goal.kind === 'score') v += g.score * 0.5;
  return v;
}
const countBits = (x: number) => { let n = 0; while (x) { x &= x - 1; n++; } return n; };

/** Beam search through real moves. Returns the moves of the fastest win it finds, or null. */
function solve(level: Level, width = BEAM): [number, number][] | null {
  type Node = { g: Game; path: [number, number][] };
  let beam: Node[] = [{ g: levelGame(level), path: [] }];
  for (let depth = 0; depth < level.moves; depth++) {
    const next: Node[] = [];
    const seen = new Set<string>();
    for (const node of beam) for (let slot = 0; slot < 3; slot++) {
      const s = node.g.tray[slot];
      if (!s) continue;
      for (let pos = 0; pos < s.piece.count; pos++) {
        if (!fitsAt(node.g.lo, node.g.hi, s.piece, pos)) continue;
        const g = cloneGame(node.g);
        place(g, slot, pos);
        const key = `${g.lo},${g.hi},${g.trayNo},${g.tray.map(t => t?.piece.id ?? '-').join('')},${g.score}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const path = [...node.path, [slot, pos] as [number, number]];
        if (goalMet(g)) return path;
        if (!g.over) next.push({ g, path });
      }
    }
    if (!next.length) return null;
    next.sort((a, b) => value(b.g, level.goal) - value(a.g, level.goal));
    beam = next.slice(0, width);
  }
  return null;
}

/** The share of casual-bot tries that reach the goal. */
function casualRate(level: Level, tries = 40): number {
  let won = 0;
  for (let t = 0; t < tries; t++) {
    const g = levelGame(level), rng = new Rng(hash32(level.seed, t));
    while (!g.over && canMove(g)) { const c = casualChoice(g, rng); if (!c) break; place(g, c.slot, c.pos); }
    if (starsFor(level, g) > 0) won++;
  }
  return won / tries;
}

const levels: Level[] = [], solutions: { id: string; moves: [number, number][] }[] = [];
for (let w = 0; w < PLAN.length; w++) {
  let worldRate = 0;
  for (let n = 0; n < LEVELS_PER_WORLD; n++) {
    const spec = PLAN[w]![n]!;
    const id = `w${w + 1}-${String(n + 1).padStart(2, '0')}`;
    let found: { level: Level; path: [number, number][] } | null = null;
    // try a few seeds until the solver finds a win within a generous draft limit
    for (let attempt = 0; attempt < 12 && !found; attempt++) {
      const seed = hash32(0xad7e, w, n, attempt);
      const draft: Level = { id, world: w, n: n + 1, goal: { kind: spec.kind, target: spec.target }, moves: 90, par3: 90, par2: 90, layout: layout(spec, w, seed), weights: WEIGHTS[w]!, seed, ...(spec.tip ? { tip: spec.tip } : {}) };
      const path = solve(draft);
      if (path) found = { level: draft, path };
    }
    if (!found) throw new Error(`${id}: no solution found`);
    const { level, path } = found;
    // 3 stars: what a good, goal-aware player manages (a narrow search), never below the solver's proof
    const good = solve(level, 4)?.length ?? path.length + 6;
    level.par3 = Math.max(path.length + SLACK[w]!, good);
    level.moves = level.par3 + ROOM[w]!;
    level.par2 = level.par3 + Math.ceil((level.moves - level.par3) / 2);
    if (w >= 2) level.clock = Math.round(20 + level.par3 * 4);
    // kind enough for its world? more moves (the 2-star par moves halfway) until a young player usually gets 1 star
    let rate = casualRate(level);
    // the move limit may grow to this: stones need two clears each, so their levels get the most room
    const cap = Math.max(level.moves, Math.ceil(level.par3 * { stones: 2.6, items: 2.2, lines: 1.8, score: 1.8 }[spec.kind]) + 8);
    for (let k = 0; k < 20 && rate < CASUAL_FLOOR[w]! && level.moves < cap; k++) { level.moves = Math.min(cap, level.moves + (spec.kind === 'score' ? 6 : 3)); level.par2 = level.par3 + Math.ceil((level.moves - level.par3) / 2); rate = casualRate(level); }
    worldRate += rate;
    levels.push(level); solutions.push({ id, moves: path });
    console.log(`${id} ${spec.kind} ${spec.target}: solver ${path.length}, good ${good} → 3★ in ${level.par3}, 2★ in ${level.par2}, limit ${level.moves}; casual 1★ ${(rate * 100).toFixed(0)}%`);
  }
  console.log(`World ${w + 1}: casual 1★ average ${((worldRate / LEVELS_PER_WORLD) * 100).toFixed(0)}% (floor ${CASUAL_FLOOR[w]! * 100}%)`);
}

const data = JSON.stringify(levels);
const dataHash = createHash('sha256').update(data).digest('hex');
writeFileSync('src/data/levels.json', JSON.stringify({ rulesVersion: RULES_VERSION, levels }, null, 0) + '\n');
mkdirSync('tests/fixtures', { recursive: true });
writeFileSync('tests/fixtures/adventure-solutions.json', JSON.stringify({ dataHash, rulesVersion: RULES_VERSION, solutions }) + '\n');
console.log(`Wrote ${levels.length} levels (src/data/levels.json) and their solutions.`);
