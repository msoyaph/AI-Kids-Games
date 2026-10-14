// The bots: a "good" player and a "casual" one (slower, makes mistakes, plants fewer producers),
// playing the real rules through the same commands a player sends. They choose seeds for a level
// from what it brings (flyers, shields, water, jumpers...) and then build a garden lane by lane.
// Used by the balance and pacing reports and tests (tests/unit/balance.test.ts).
import { BOSSES, CRITTERS, PLANTS } from '../data/tuning';
import { COLS, LANES } from './board';
import { canPlant, CURLING, plantAt, specialAt, statsOf } from './game';
import { rng } from './rng';
import type { Command, GameState, LevelSpec, PlantId } from './types';

export type Skill = 'good' | 'casual';

/** Picks the seeds for a level from the plants on offer. */
export function chooseSeeds(spec: LevelSpec, offered: PlantId[], slots: number, skill: Skill = 'good', seed = 1): PlantId[] {
  const rnd = rng(seed * 7 + 3);
  const has = (id: string) => offered.includes(id);
  const pool = new Set(spec.waves.flatMap(w => w.spawns.map(s => s.critter)));
  const st = [...pool].map(k => CRITTERS[k]).filter(Boolean);
  const fly = st.some(c => c!.moves === 'fly'), shields = st.some(c => c!.shield), frogs = st.some(c => c!.blocksLobs);
  const hops = st.some(c => c!.moves === 'hop'), swarms = st.some(c => c!.group), water = Object.values(spec.specials ?? {}).includes('water');
  const want: string[] = [];
  const add = (...ids: string[]) => { for (const id of ids) if (has(id) && !want.includes(id)) { want.push(id); return; } };
  add('comfrey', 'yarrow');
  add(spec.dusk ? 'primrose' : 'rowan', 'rowan');
  add('boxwood');
  if (water) add('arrowhead');
  if (fly) add('bluebell', 'maple', 'hollyhock');
  if (shields) add('wisteria', 'hollyhock', 'maple');
  if (frogs) add('milkweed', 'rowan');
  if (hops) add('hop-vine', 'lambs-ear', 'pampas');
  if (swarms) add('touch-me-not', 'allium');
  for (const id of ['yarrow', 'milkweed', 'wisteria', 'agave', 'lambs-ear', 'maple', 'hollyhock', 'basil', 'chamomile', 'allium', 'touch-me-not', 'lavender', 'hop-vine', 'pampas', 'borage', 'rowan', 'primrose', 'pickerelweed', 'nasturtium', 'four-oclock']) {
    if (want.length >= slots) break;
    if (skill === 'casual' && rnd() < 0.25) continue;
    add(id);
  }
  for (const id of offered) if (want.length < slots) add(id);
  return want.slice(0, slots);
}

interface Brain { next: number; rnd: () => number; skill: Skill }

/** Makes a bot for a game: call it every step; it returns the commands to send. */
export function makeBot(skill: Skill = 'good', seed = 1) {
  const brain: Brain = { next: 0, rnd: rng(seed * 13 + 5), skill };
  return (s: GameState): Command[] => {
    if (s.t < brain.next) return [];
    brain.next = s.t + (skill === 'good' ? 0.35 : 1.1 + brain.rnd() * 0.8);
    const cmd = decide(s, brain);
    return cmd ? [cmd] : [];
  };
}

const costOf = (id: string) => (id === CURLING.card ? CURLING.cost : PLANTS[id]?.cost ?? 1e9);
const cardOf = (s: GameState, id: string) => s.cards.findIndex(c => c.plant === id && c.wait <= 0 && s.compost >= costOf(id));
const count = (s: GameState, pred: (id: string) => boolean) => { let n = 0; for (const row of s.grid) for (const g of row) if (g.kind === 'plant' && pred(g.plant.kind)) n++; return n; };
const attackers = new Set(['straight', 'pierce', 'lob', 'area', 'cloud']);

function laneThreat(s: GameState, lane: number) {
  let t = 0, front = 99, fly = 0, shield = 0;
  for (const c of s.critters) {
    if (c.lane !== lane || c.withSnack) continue;
    const st = statsOf(c);
    t += st.points * (c.patience / c.max);
    front = Math.min(front, c.x);
    if (st.moves === 'fly') fly++;
    if (c.shield > 0 || st.blocksLobs) shield++;
  }
  return { t, front, fly, shield };
}

/** Shooing per second from the attackers that can still reach the lane's front critter (left of it). */
function laneDefence(s: GameState, lane: number, front = 99) {
  let d = 0;
  for (let col = 0; col < Math.min(COLS, Math.floor(front - 0.4)); col++) {
    const p = plantAt(s, lane, col);
    if (p && attackers.has(PLANTS[p.kind]!.attack)) d += PLANTS[p.kind]!.power / PLANTS[p.kind]!.every;
  }
  return d;
}

/** The leftmost free tile in a lane between two columns that this plant can go on. */
function spot(s: GameState, id: string, lane: number, from: number, to: number) {
  for (let col = from; col <= to; col++) if (canPlant(s, id, lane, col)) return col;
  return -1;
}

function decide(s: GameState, b: Brain): Command | null {
  // clear pebbles first
  for (let lane = 0; lane < LANES; lane++) for (let col = 0; col < COLS; col++) if (s.grid[lane]![col]!.kind === 'pebble') return { type: 'clear', lane, col };
  if (s.spec.curling) {
    const card = cardOf(s, 'pinecone');
    if (card < 0) return null;
    let best = -1, bx = 99;
    for (let lane = 0; lane < LANES; lane++) { const t = laneThreat(s, lane); if (t.t > 0 && t.front < bx && t.front < 8.5) { bx = t.front; best = lane; } }
    return best >= 0 ? { type: 'plant', card, lane: best, col: 0 } : null;
  }
  if (s.spec.noPlanting) return null;
  const casual = b.skill === 'casual';
  // on a boss level, keep the boss's lane (the middle one) for shooters
  const bossLane = s.spec.waves.some(w => w.spawns.some(sp => sp.critter in BOSSES)) ? 2 : -1;
  const has = (id: string) => s.cards.some(c => c.plant === id);
  const producers = count(s, id => PLANTS[id]!.attack === 'produce');
  const wantProducers = (casual ? 3 : 5) + (s.spec.seedSlots >= 7 ? 1 : 0);
  const threats = Array.from({ length: LANES }, (_, lane) => { const t = laneThreat(s, lane); return { lane, ...t, d: laneDefence(s, lane, t.front) }; });
  const urgent = threats.filter(t => t.t > 0 && t.d < t.t * 9).sort((a, c) => c.t / (c.d + 1) - a.t / (a.d + 1) || a.front - c.front);

  // 0. a boss on the board: more shooters in its lane first
  const boss = s.critters.find(c => c.boss && !c.withSnack);
  if (boss && statsOf(boss).moves !== 'fly') {
    for (const id of ['wisteria', 'milkweed', s.spec.dusk ? 'primrose' : 'rowan', 'rowan', 'hollyhock', 'maple']) {
      const card = cardOf(s, id);
      if (card < 0) continue;
      const col = spot(s, id, boss.lane, 1, Math.min(6, Math.floor(boss.x) - 2));
      if (col >= 0) return { type: 'plant', card, lane: boss.lane, col };
    }
  } else if (boss) {
    const card = ['bluebell', 'hollyhock', 'maple'].map(id => cardOf(s, id)).find(c => c >= 0);
    if (card !== undefined) { const id = s.cards[card]!.plant; for (const l of [boss.lane, boss.lane - 1, boss.lane + 1]) { if (l < 0 || l >= LANES || (id !== 'bluebell' && l !== boss.lane)) continue; const col = spot(s, id, l, 1, 6); if (col >= 0) return { type: 'plant', card, lane: l, col }; } }
  }
  // 1. a blocker in front of anything getting close
  for (const t of threats) {
    if (t.t <= 0 || t.front > 6.5) continue;
    const blocker = ['agave', 'boxwood', 'pampas'].find(id => cardOf(s, id) >= 0);
    if (!blocker) break;
    const already = [...Array(COLS).keys()].some(col => { const p = plantAt(s, t.lane, col); return p && PLANTS[p.kind]!.attack === 'none' && col < t.front; });
    if (already) continue;
    const col = Math.min(COLS - 1, Math.max(3, Math.floor(t.front) - 1));
    for (let c = col; c >= 3; c--) if (canPlant(s, blocker, t.lane, c)) return { type: 'plant', card: cardOf(s, blocker), lane: t.lane, col: c };
  }
  // 2. answers to flyers: if the level brings any, every lane gets cover early (before it fills up)
  const flyersComing = s.spec.waves.some(w => w.spawns.some(sp => CRITTERS[sp.critter]?.moves === 'fly'));
  for (const t of threats) {
    if ((t.fly > 0 || (flyersComing && producers >= 2)) && (t.lane !== bossLane || t.fly > 0)) {
      const air = ['bluebell', 'maple', 'hollyhock'].find(id => cardOf(s, id) >= 0);
      const covered = [t.lane - 1, t.lane, t.lane + 1].some(l => l >= 0 && l < LANES && [...Array(COLS).keys()].some(col => { const p = plantAt(s, l, col); return p && (p.kind === 'bluebell' || (l === t.lane && (p.kind === 'maple' || p.kind === 'hollyhock'))); }));
      if (air && !covered) { const col = spot(s, air, t.lane, 1, 7); if (col >= 0) return { type: 'plant', card: cardOf(s, air), lane: t.lane, col }; }
    }
  }
  // 3. producers early (and keep a few)
  if (producers < wantProducers && (producers < 2 || s.compost < 220)) {
    const prod = ['comfrey', 'yarrow'].find(id => cardOf(s, id) >= 0);
    if (prod) for (let lane = 0; lane < LANES; lane++) { const l = (lane + 2) % LANES; if (l === bossLane) continue; const col = spot(s, prod, l, 0, casual ? 2 : 1); if (col >= 0 && (casual || b.rnd() < 0.9)) return { type: 'plant', card: cardOf(s, prod), lane: l, col }; }
  }
  // 4. shooters where the threat outweighs the defence (casual players sometimes pick a lane at random)
  const shooters = ['wisteria', 'milkweed', 'hollyhock', s.spec.dusk ? 'primrose' : 'rowan', 'rowan', 'maple', 'primrose', 'arrowhead'].filter(id => has(id));
  const order = urgent.length ? urgent.map(t => t.lane) : threats.sort((a, c) => a.d - c.d).map(t => t.lane);
  for (const lane0 of order) {
    const lane = casual && b.rnd() < 0.2 ? Math.floor(b.rnd() * LANES) : lane0;
    const t = threats.find(x => x.lane === lane)!;
    for (const id of shooters) {
      const card = cardOf(s, id);
      if (card < 0) continue;
      if (PLANTS[id]!.attack === 'lob' && t.shield === 0 && t.fly === 0 && shooters.some(o => o !== id && PLANTS[o]!.attack === 'straight' && cardOf(s, o) >= 0)) continue;
      const water = PLANTS[id]!.tile === 'water';
      const col = water ? spot(s, id, lane, 0, 6) : spot(s, id, lane, 1, casual ? 4 : 5);
      if (col >= 0) return { type: 'plant', card, lane, col };
    }
  }
  // 4b. a lane under attack with no shooter and no room: dig up a producer or helper to make room
  for (const lane of order) {
    const t = threats.find(x => x.lane === lane)!;
    if (t.t <= 0 || t.d > 0 || t.front > 8) continue;
    const id = shooters.find(x => cardOf(s, x) >= 0 && PLANTS[x]!.tile !== 'water');
    if (!id || spot(s, id, lane, 0, Math.min(6, Math.floor(t.front) - 1)) >= 0) continue;
    for (let col = 0; col < Math.min(COLS, Math.floor(t.front)); col++) {
      const p = plantAt(s, lane, col);
      if (p && ['produce', 'support', 'lure'].includes(PLANTS[p.kind]!.attack) && producers > 2) return { type: 'dig', lane, col };
    }
  }
  // 5. helpers when there's compost to spare
  if (s.compost > 200) {
    for (const id of ['touch-me-not', 'allium', 'hop-vine', 'lambs-ear', 'pampas', 'lavender', 'basil', 'chamomile', 'borage', 'nasturtium', 'four-oclock', 'pickerelweed']) {
      const card = cardOf(s, id);
      if (card < 0) continue;
      const lane = order.find(l => l !== bossLane) ?? Math.floor(b.rnd() * LANES);
      const col = PLANTS[id]!.tile === 'water' ? spot(s, id, lane, 0, 6) : spot(s, id, lane, id === 'touch-me-not' || id === 'pampas' || id === 'lambs-ear' ? 4 : 1, 6);
      if (col >= 0 && specialAt(s, lane, col) !== 'hot') return { type: 'plant', card, lane, col };
    }
  }
  // 6. otherwise, more shooters in the weakest lane
  for (const t of [...threats].sort((a, c) => a.d - c.d)) {
    for (const id of shooters) {
      const card = cardOf(s, id);
      if (card < 0) continue;
      const col = PLANTS[id]!.tile === 'water' ? spot(s, id, t.lane, 0, 6) : spot(s, id, t.lane, 1, 6);
      if (col >= 0) return { type: 'plant', card, lane: t.lane, col };
    }
  }
  return null;
}
