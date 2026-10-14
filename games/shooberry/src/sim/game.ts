// The rules: a deterministic fixed-step simulation of one level. Pure TypeScript (no DOM, no
// three.js; tests/unit/purity.test.ts), seeded, driven by commands, reporting what happened as
// events for the renderer and the sound. Nobody gets hurt: plants shoo critters (patience runs out,
// they poof into leaves and run home), critters nibble plants (they wilt and can be replanted).
import { BASKET, BOSS_TRICKS, BOSSES, COMPOST, CRITTERS, FRIENDS, PLANTS, SIM, SUPPORT, TILES, UMBRELLA, WAVES, type CritterStats } from '../data/tuning';
import { COLS, ENTRY_X, LANES } from './board';
import { rng } from './rng';
import type { Card, Command, Critter, GameEvent, GameState, LevelSpec, Pickup, Plant, PlantId, Shot, ShotKind, Special } from './types';

export const CURLING = { card: 'pinecone', cost: 25, recharge: 1.4, power: 170, speed: 4.5, glide: 9.5 } as const;

const SHOT_SPEED: Partial<Record<ShotKind, number>> = { berry: 6.5, floss: 7.5, dart: 7, leaf: 7, pod: 5.5 };
const SHOT_OF: Record<string, ShotKind> = { rowan: 'berry', milkweed: 'floss', primrose: 'dart', arrowhead: 'leaf', wisteria: 'pod', maple: 'samara', hollyhock: 'disc', bluebell: 'chime', 'touch-me-not': 'seeds' };
const FLOWERING = new Set(['maple', 'hollyhock', 'lavender', 'bluebell']);
const SHOOTERS = new Set(['rowan', 'wisteria', 'milkweed']);

export const statsOf = (c: Critter): CritterStats => (c.boss ? BOSSES[c.kind]! : CRITTERS[c.kind]!);
export const specialAt = (s: GameState, lane: number, col: number): Special | undefined => s.spec.specials?.[`${lane},${col}`];
export const plantAt = (s: GameState, lane: number, col: number): Plant | null => {
  const g = s.grid[lane]?.[col];
  return g && g.kind === 'plant' ? g.plant : null;
};
const inBoard = (lane: number, col: number) => lane >= 0 && lane < LANES && col >= 0 && col < COLS;

/** Can this card's plant go on this tile? (Water plants only in channels; nothing on gaps or pebbles.) */
export function canPlant(s: GameState, plant: PlantId, lane: number, col: number): boolean {
  if (!inBoard(lane, col) || s.spec.noPlanting || s.spec.curling) return false;
  if (s.grid[lane]![col]!.kind !== 'free') return false;
  const sp = specialAt(s, lane, col), water = PLANTS[plant]?.tile === 'water';
  if (sp === 'gap') return false;
  return water ? sp === 'water' : sp !== 'water';
}

export function createGame(spec: LevelSpec, seeds: PlantId[], opts: { seed?: number; autoCollect?: boolean } = {}): GameState {
  const seed = opts.seed ?? 1;
  const s: GameState = {
    spec, seed, rnd: rng(seed), t: 0,
    compost: spec.startCompost, snacks: BASKET.snacks, umbrellas: Array.from({ length: LANES }, () => spec.umbrellas !== false),
    grid: Array.from({ length: LANES }, () => Array.from({ length: COLS }, () => ({ kind: 'free' as const }))),
    critters: [], shots: [], pickups: [],
    cards: (spec.curling ? [CURLING.card] : spec.fixedSeeds ?? seeds).map((plant): Card => ({ plant, wait: plant === CURLING.card ? 0 : Math.max(0, (PLANTS[plant]?.recharge ?? 0) - 12) })),
    wave: 0, nextWaveAt: WAVES.calm, pending: [], progress: 0,
    totalPoints: spec.waves.reduce((sum, w) => sum + w.spawns.reduce((a, sp) => a + pointsOf(sp.critter), 0), 0), spawnedPoints: 0,
    nextWormAt: COMPOST.firstWorm, cartLane: 2, nextCartAt: spec.cartEvery ?? Infinity,
    autoCollect: opts.autoCollect ?? true, result: null, events: [],
    stats: { planted: 0, shooed: 0, wilted: 0, collected: 0, snacksLost: 0, umbrellasUsed: 0, bySpecies: {} },
    nextId: 1,
  };
  for (const p of spec.prePlanted ?? []) placePlant(s, p.plant, p.lane, p.col);
  return s;
}

const pointsOf = (kind: string) => (BOSSES[kind] ?? CRITTERS[kind])?.points ?? 1;

function placePlant(s: GameState, kind: PlantId, lane: number, col: number, health?: number): Plant {
  const st = PLANTS[kind]!;
  const plant: Plant = { id: s.nextId++, kind, lane, col, health: health ?? st.health, max: st.health, wait: st.every * 0.5, bornAt: s.t, actedAt: -10 };
  s.grid[lane]![col] = { kind: 'plant', plant };
  return plant;
}

function spawn(s: GameState, kind: string, lane: number, x = ENTRY_X + 0.3, group = 0): Critter {
  const boss = kind in BOSSES, st = boss ? BOSSES[kind]! : CRITTERS[kind]!;
  const c: Critter = {
    id: s.nextId++, kind, boss, lane, x, toLane: lane, laneT: 1, patience: st.patience, max: st.patience, armour: st.armour ?? 0, shield: st.shield ?? 0,
    slow: 1, slowUntil: 0, heldUntil: 0, hopsLeft: st.hops ?? 0, nextHop: 0, hopFrom: 0, hopTo: 0, hopAt: -10,
    under: st.moves === 'dig', carrying: null, dropAt: -1, mood: st.moves === 'dig' ? 'under' : 'walk', moodAt: s.t, nextTrick: s.t + 6, withSnack: false, lured: false, waited: false, rushUntil: 0, group: 0,
  };
  c.group = group || c.id;
  s.critters.push(c);
  if (c.under) s.events.push({ type: 'molehill', lane, x: st.digTo ?? 5 });
  return c;
}

/** Applies a player's (or bot's) command. Returns false when it couldn't be done. */
export function command(s: GameState, cmd: Command): boolean {
  if (s.result) return false;
  if (cmd.type === 'plant') {
    const card = s.cards[cmd.card];
    if (!card || card.wait > 0) return false;
    if (card.plant === CURLING.card) {
      if (s.compost < CURLING.cost || cmd.lane < 0 || cmd.lane >= LANES) return false;
      s.compost -= CURLING.cost;
      card.wait = CURLING.recharge;
      s.shots.push({ id: s.nextId++, kind: 'pinecone', lane: cmd.lane, x: 0.2, speed: CURLING.speed, power: CURLING.power, pierce: false, hit: [], lob: null, air: false, glide: CURLING.glide });
      s.events.push({ type: 'fire', plant: 0, shot: 'pinecone', lane: cmd.lane, x: 0.2 });
      return true;
    }
    const st = PLANTS[card.plant]!;
    if (s.compost < st.cost || !canPlant(s, card.plant, cmd.lane, cmd.col)) return false;
    s.compost -= st.cost;
    card.wait = st.recharge * rechargeFactor(s);
    placePlant(s, card.plant, cmd.lane, cmd.col);
    s.stats.planted++;
    s.events.push({ type: 'plant', plant: card.plant, lane: cmd.lane, col: cmd.col });
    return true;
  }
  if (cmd.type === 'collect') {
    const p = s.pickups.find(q => q.id === cmd.pickup);
    if (!p) return false;
    collect(s, p);
    return true;
  }
  if (cmd.type === 'collectAll') {
    for (const p of [...s.pickups]) collect(s, p);
    return true;
  }
  if (cmd.type === 'dig') {
    const p = inBoard(cmd.lane, cmd.col) ? plantAt(s, cmd.lane, cmd.col) : null;
    if (!p || s.spec.noPlanting) return false;
    s.grid[cmd.lane]![cmd.col] = { kind: 'free' };
    s.events.push({ type: 'dig', plant: p.kind, lane: cmd.lane, col: cmd.col });
    return true;
  }
  if (cmd.type === 'clear') {
    if (!inBoard(cmd.lane, cmd.col) || s.grid[cmd.lane]![cmd.col]!.kind !== 'pebble') return false;
    s.grid[cmd.lane]![cmd.col] = { kind: 'free' };
    return true;
  }
  return false;
}

function collect(s: GameState, p: Pickup) {
  s.compost += p.worth;
  s.stats.collected += p.worth;
  s.pickups.splice(s.pickups.indexOf(p), 1);
  s.events.push({ type: 'collect', pickup: p.id, worth: p.worth, lane: p.lane, x: p.x });
}

function addPickup(s: GameState, lane: number, x: number, worth: number, from: Pickup['from']) {
  const p: Pickup = { id: s.nextId++, lane, x: Math.max(0.3, Math.min(COLS - 0.3, x)), worth, bornAt: s.t, from };
  s.pickups.push(p);
  s.events.push({ type: 'pickup', pickup: p.id, lane, x: p.x, from });
}

const neighbours = (s: GameState, lane: number, col: number) => {
  const out: Plant[] = [];
  for (let dl = -1; dl <= 1; dl++) for (let dc = -1; dc <= 1; dc++) {
    if (!dl && !dc) continue;
    const p = plantAt(s, lane + dl, col + dc);
    if (p) out.push(p);
  }
  return out;
};

/** Every card's recharge is shorter with Chamomile in the garden. */
function rechargeFactor(s: GameState) {
  let n = 0;
  for (const row of s.grid) for (const g of row) if (g.kind === 'plant' && g.plant.kind === 'chamomile') n++;
  return 1 - SUPPORT.chamomileRecharge * Math.min(n, SUPPORT.chamomileMax);
}

/** How much faster a plant acts: Basil next door, a sprinkler under it, Borage's bees. */
function haste(s: GameState, p: Plant) {
  let h = 1;
  const near = neighbours(s, p.lane, p.col);
  const borage = near.some(n => n.kind === 'borage');
  if (near.some(n => n.kind === 'basil')) h += SUPPORT.basilHaste;
  if (specialAt(s, p.lane, p.col) === 'sprinkler') h += TILES.sprinkler;
  if (borage && FLOWERING.has(p.kind)) h += FRIENDS.borageBees * (1 + SUPPORT.borageBoost);
  return h;
}

/** Garden Friends that add shooing power. */
function powerOf(s: GameState, p: Plant) {
  const st = PLANTS[p.kind]!, near = neighbours(s, p.lane, p.col);
  const boost = near.some(n => n.kind === 'borage') ? 1 + SUPPORT.borageBoost : 1;
  let k = 1;
  if (p.kind === 'rowan' && near.some(n => n.kind === 'comfrey')) k += FRIENDS.comfreyRowan * boost;
  if (SHOOTERS.has(p.kind) && near.some(n => n.kind === 'allium')) k += FRIENDS.alliumShooters * boost;
  return st.power * k;
}

/** Critters a ground shot or aura can reach: walking (not underground, not mid-hop) or an owlet low by a lantern. */
function reachable(s: GameState, c: Critter, air = false) {
  if (c.withSnack || c.under) return false;
  const st = statsOf(c);
  if (st.moves === 'fly') {
    if (air || st.low) return true;
    // owlets swoop low past lanterns, where anything can reach them
    if (c.kind === 'owlet') for (let col = 0; col < COLS; col++) if (specialAt(s, c.lane, col) === 'lantern' && Math.abs(c.x - (col + 0.5)) < 1.5) return true;
    return false;
  }
  return s.t - c.hopAt > 0.5;
}

/** Shoos a critter: shield first (unless the shot goes over or through), then armour (half), then patience. */
function shoo(s: GameState, c: Critter, power: number, how: 'front' | 'over' | 'through' | 'aura') {
  if (how === 'over' && statsOf(c).blocksLobs) { s.events.push({ type: 'hit', critter: c.id, lane: c.lane, x: c.x, power: 0, blocked: true }); return; }
  let left = power;
  if (how === 'front' && c.shield > 0) {
    const took = Math.min(c.shield, left);
    c.shield -= took;
    left -= took;
  }
  if (left > 0 && c.armour > 0) {
    const took = Math.min(c.armour, left * 0.5);
    c.armour -= took;
    left -= took * 2;
  }
  if (left > 0) c.patience -= left;
  if (c.mood !== 'nibble' && c.mood !== 'flee' && power > 0) { c.mood = 'shooed'; c.moodAt = s.t; }
  s.events.push({ type: 'hit', critter: c.id, lane: c.lane, x: c.x, power });
}

/** The front-most critter in a lane ahead of x (smallest x), that a shot of this kind can reach. */
function frontmost(s: GameState, lane: number, from: number, to: number, air: boolean, groundToo = true) {
  let best: Critter | null = null;
  for (const c of s.critters) {
    if (c.lane !== lane || c.x < from || c.x > to) continue;
    const fly = statsOf(c).moves === 'fly';
    if (fly ? !reachable(s, c, air) : !groundToo || !reachable(s, c)) continue;
    if (!best || c.x < best.x) best = c;
  }
  return best;
}

function act(s: GameState, p: Plant): boolean {
  const st = PLANTS[p.kind]!, x = p.col + 0.5;
  if (st.dusk && !s.spec.dusk) return false;
  switch (st.attack) {
    case 'straight': case 'pierce': {
      const reach = st.attack === 'pierce' ? x + st.reach : SIM.sightX;
      if (!frontmost(s, p.lane, x + 0.2, reach, false)) return false;
      const kind = SHOT_OF[p.kind] ?? 'berry';
      s.shots.push({ id: s.nextId++, kind, lane: p.lane, x: x + 0.3, speed: SHOT_SPEED[kind] ?? 6.5, power: powerOf(s, p), pierce: st.attack === 'pierce', hit: [], lob: null, air: false, glide: st.attack === 'pierce' ? st.reach : 99 });
      s.events.push({ type: 'fire', plant: p.id, shot: kind, lane: p.lane, x });
      return true;
    }
    case 'lob': {
      const target = frontmost(s, p.lane, x + 0.2, SIM.sightX, true);
      if (!target) return false;
      const kind = SHOT_OF[p.kind] ?? 'samara', len = 0.9;
      // aim where the critter will be when it lands
      const lead = statsOf(target).speed * len;
      s.shots.push({ id: s.nextId++, kind, lane: p.lane, x, speed: 0, power: powerOf(s, p), pierce: false, hit: [], air: true, glide: 0, lob: { fromX: x, toX: Math.max(x + 0.3, target.x - lead), at: s.t, len, target: target.id, splash: p.kind === 'hollyhock' ? 0.6 : 0 } });
      s.events.push({ type: 'fire', plant: p.id, shot: kind, lane: p.lane, x });
      return true;
    }
    case 'air': {
      let target: Critter | null = null;
      for (let l = p.lane - 1; l <= p.lane + 1; l++) { const c = frontmost(s, l, x - 0.5, SIM.sightX, true, false); if (c && (!target || c.x < target.x)) target = c; }
      if (!target) return false;
      shoo(s, target, powerOf(s, p), 'over');
      s.events.push({ type: 'fire', plant: p.id, shot: 'chime', lane: target.lane, x: target.x });
      return true;
    }
    case 'area': {
      const hit = s.critters.filter(c => Math.abs(c.lane - p.lane) <= 1 && Math.abs(c.x - x) <= st.reach + 0.4 && reachable(s, c));
      if (!hit.length) return false;
      for (const c of hit) shoo(s, c, powerOf(s, p), 'over');
      s.events.push({ type: 'fire', plant: p.id, shot: 'seeds', lane: p.lane, x });
      return true;
    }
    case 'cloud': {
      let any = false;
      for (const c of s.critters) if (c.lane === p.lane && c.x > x && c.x < x + st.reach + 0.5 && reachable(s, c)) { shoo(s, c, st.power * st.every, 'aura'); any = true; }
      if (any && s.t - p.actedAt > 1) { p.actedAt = s.t; s.events.push({ type: 'fire', plant: p.id, shot: 'seeds', lane: p.lane, x }); }
      return true;
    }
    case 'slow': {
      const from = p.kind === 'pampas' ? p.col : x, to = p.kind === 'pampas' ? p.col + 1.6 : x + st.reach + 0.5;
      for (const c of s.critters) if (c.lane === p.lane && c.x >= from && c.x <= to && reachable(s, c)) {
        c.slow = Math.min(c.slowUntil > s.t ? c.slow : 1, st.slow ?? 0.5);
        c.slowUntil = s.t + 0.35;
        if (st.power) shoo(s, c, st.power * st.every, 'aura');
      }
      return true;
    }
    case 'tangle': {
      const c = frontmost(s, p.lane, x + 0.2, x + st.reach + 0.5, false);
      if (!c) return false;
      c.heldUntil = Math.max(c.heldUntil, s.t + (c.boss ? 0.5 : st.hold ?? 1));
      shoo(s, c, st.power, 'aura');
      s.events.push({ type: 'fire', plant: p.id, shot: 'seeds', lane: p.lane, x: c.x });
      return true;
    }
    case 'push': {
      const c = frontmost(s, p.lane, x + 0.2, x + st.reach + 0.5, false);
      if (!c) return false;
      c.x = Math.min(ENTRY_X, c.x + (c.boss ? 0.3 : st.power));
      s.events.push({ type: 'push', lane: p.lane, x: c.x });
      s.events.push({ type: 'fire', plant: p.id, shot: 'seeds', lane: p.lane, x });
      return true;
    }
    case 'lure': {
      for (const c of s.critters) {
        if (c.boss || c.lured || c.lane === p.lane || Math.abs(c.lane - p.lane) !== 1 || c.toLane !== c.lane || !reachable(s, c)) continue;
        if (c.x > x && c.x < x + st.reach + 1) { c.lured = true; c.toLane = p.lane; c.laneT = 0; }
      }
      return true;
    }
    case 'produce': {
      let worth = st.makes ?? COMPOST.pickup;
      const near = neighbours(s, p.lane, p.col);
      if (p.kind === 'yarrow') worth += SUPPORT.yarrowPerNeighbour * Math.min(near.length, SUPPORT.yarrowMax);
      if ((p.kind === 'comfrey' && near.some(n => n.kind === 'yarrow')) || (p.kind === 'yarrow' && near.some(n => n.kind === 'comfrey'))) worth = Math.round(worth * (1 + FRIENDS.yarrowComfrey));
      addPickup(s, p.lane, p.col + 0.85, worth, 'plant');
      s.events.push({ type: 'produce', plant: p.id, lane: p.lane, col: p.col });
      return true;
    }
    default: return false;
  }
}

function wilt(s: GameState, p: Plant) {
  s.grid[p.lane]![p.col] = { kind: 'free' };
  s.stats.wilted++;
  s.events.push({ type: 'wilt', plant: p.kind, lane: p.lane, col: p.col });
}

function flee(s: GameState, c: Critter) {
  s.critters.splice(s.critters.indexOf(c), 1);
  s.stats.shooed++;
  s.stats.bySpecies[c.kind] = (s.stats.bySpecies[c.kind] ?? 0) + 1;
  s.events.push({ type: 'shoo', critter: c.id, kind: c.kind, lane: c.lane, x: c.x });
  if (c.x < COLS) addPickup(s, c.lane, c.x, Math.round(pointsOf(c.kind) * COMPOST.leafPerPoint) + (c.boss ? 50 : 0), 'leaves');
}

/** A critter reaches the picnic blanket: the lane's umbrella springs open once, otherwise it takes a snack. */
function reachBlanket(s: GameState, c: Critter) {
  const lane = c.lane;
  if (s.umbrellas[lane]) {
    s.umbrellas[lane] = false;
    s.stats.umbrellasUsed++;
    s.events.push({ type: 'umbrella', lane });
    for (const o of s.critters) if (o.lane === lane && o.x < UMBRELLA.reach && !o.withSnack) { o.x = UMBRELLA.backTo + (o === c ? 0 : s.rnd() * 0.5); o.mood = 'flee'; o.moodAt = s.t; o.heldUntil = 0; }
    return;
  }
  // a swarm takes one snack together, then all of it runs home
  for (const o of s.critters) if (o.group === c.group) { o.withSnack = true; o.mood = 'flee'; o.moodAt = s.t; }
  if (s.spec.cartEvery && lane !== s.cartLane) return;
  s.snacks--;
  s.stats.snacksLost++;
  s.events.push({ type: 'snack', lane, left: s.snacks });
  if (s.snacks <= 0) { s.result = 'lost'; s.events.push({ type: 'lost' }); }
}

function bossTrick(s: GameState, c: Critter) {
  const st = statsOf(c);
  if (s.t < c.nextTrick || !st.boss) return;
  const T = BOSS_TRICKS;
  switch (st.boss) {
    case 'summon':
      for (let i = 0; i < T.summon; i++) spawn(s, 'ants', Math.max(0, Math.min(LANES - 1, c.lane + (i ? 1 : -1))), c.x + 0.4);
      c.nextTrick = s.t + T.summonEvery; break;
    case 'charge': c.rushUntil = s.t + T.chargeFor; c.nextTrick = s.t + T.chargeEvery; break;
    case 'burrow': {
      const to = (c.lane + 1 + Math.floor(s.rnd() * (LANES - 1))) % LANES;
      c.toLane = to; c.laneT = 0; c.nextTrick = s.t + T.burrowEvery; break;
    }
    case 'butt': {
      const col = Math.floor(c.x - 0.6), p = plantAt(s, c.lane, col);
      if (p && col > 0 && s.grid[c.lane]![col - 1]!.kind === 'free') { s.grid[c.lane]![col] = { kind: 'free' }; p.col = col - 1; s.grid[c.lane]![col - 1] = { kind: 'plant', plant: p }; }
      c.nextTrick = s.t + T.buttEvery; break;
    }
    case 'dive': c.rushUntil = s.t + 1.6; c.nextTrick = s.t + T.diveEvery; break;
    case 'parade': {
      const pool = ['snail', 'ants', 'mouse', 'roly-poly', 'gecko'];
      for (let i = 0; i < T.paradeDrop; i++) spawn(s, pool[Math.floor(s.rnd() * pool.length)]!, Math.floor(s.rnd() * LANES), Math.min(ENTRY_X, c.x + 0.5));
      c.nextTrick = s.t + T.paradeEvery; break;
    }
  }
  s.events.push({ type: 'boss', critter: c.id, trick: st.boss });
}

function moveCritter(s: GameState, c: Critter, dt: number) {
  const st = statsOf(c);
  if (c.withSnack) { c.x += 1.6 * dt; if (c.x > ENTRY_X + 1) s.critters.splice(s.critters.indexOf(c), 1); return; }
  if (c.mood === 'flee' && s.t - c.moodAt > 0.8) { c.mood = 'walk'; c.moodAt = s.t; }
  if (c.mood === 'shooed' && s.t - c.moodAt > 0.35) { c.mood = 'walk'; c.moodAt = s.t; }
  if (c.toLane !== c.lane) { c.laneT += dt / 1.0; if (c.laneT >= 1) { c.lane = c.toLane; c.laneT = 1; } }
  if (c.boss) bossTrick(s, c);
  if (s.t < c.heldUntil) return;
  let speed = st.speed * (s.spec.speed ?? 1) * (c.slowUntil > s.t ? c.slow : 1) * (c.rushUntil > s.t ? (st.boss === 'dive' ? 3 : 2) : 1);
  const col = Math.floor(c.x), sp = col >= 0 && col < COLS ? specialAt(s, c.lane, col) : undefined;
  if (sp === 'hot' && st.heatHaste) speed *= st.heatHaste;
  if (sp === 'updraft' && st.moves === 'fly') speed *= TILES.updraft;
  if (sp === 'gap' && !st.floats && st.moves !== 'fly') speed *= 0.6;

  if (st.moves === 'fly') {
    // moths wait at a lantern in their lane once; magpies borrow a plant and drop it further on
    if (st.lanternWait && !c.waited && sp === 'lantern') { c.waited = true; c.heldUntil = s.t + st.lanternWait; return; }
    if (st.swap === 'borrow') {
      const p = plantAt(s, c.lane, col);
      // a magpie borrows once: after dropping its plant it just flies on
      if (!c.carrying && c.dropAt < 0 && p && Math.abs(c.x - (col + 0.5)) < 0.15) {
        c.carrying = p.kind; s.grid[c.lane]![col] = { kind: 'free' };
        s.events.push({ type: 'swap', lane: c.lane, col, plant: p.kind, to: 'borrow' });
        c.dropAt = c.x - 2;
      } else if (c.carrying && c.x <= c.dropAt && col >= 0 && s.grid[c.lane]![col]!.kind === 'free' && specialAt(s, c.lane, col) !== 'gap' && specialAt(s, c.lane, col) !== 'water') {
        placePlant(s, c.carrying, c.lane, col);
        s.events.push({ type: 'drop', lane: c.lane, col, plant: c.carrying });
        c.carrying = null;
      }
    }
    c.x -= speed * dt;
    // magpies are after plants, not snacks: at the blanket one drops what it carries and flies off
    if (c.x <= SIM.blanketX) { if (st.swap === 'borrow') { c.carrying = null; c.withSnack = true; c.mood = 'flee'; c.moodAt = s.t; } else reachBlanket(s, c); }
    return;
  }
  if (c.under) {
    c.x -= speed * 1.6 * dt;
    if (c.x <= (st.digTo ?? 5)) { c.under = false; c.mood = 'walk'; c.moodAt = s.t; }
    return;
  }
  // mid-hop: fly over to the landing spot
  if (s.t - c.hopAt < 0.5) { c.x = c.hopFrom + (c.hopTo - c.hopFrom) * ((s.t - c.hopAt) / 0.5); return; }
  const front = c.x - 0.38, fcol = Math.floor(front);
  const blocker = fcol >= 0 && fcol < COLS ? plantAt(s, c.lane, fcol) : null;
  if (blocker) {
    const bst = PLANTS[blocker.kind]!;
    if (c.hopsLeft > 0 && s.t >= c.nextHop && !bst.stopsJumpers) {
      c.hopsLeft--; c.nextHop = s.t + (st.hopEvery ?? 2); c.hopFrom = c.x; c.hopTo = fcol - 0.45 + 0.38; c.hopAt = s.t; c.mood = 'hop'; c.moodAt = s.t;
      return;
    }
    if (st.swap === 'pebble') {
      // a packrat trades the plant for a pebble and heads home pleased with its swap
      s.grid[c.lane]![fcol] = { kind: 'pebble' };
      s.events.push({ type: 'swap', lane: c.lane, col: fcol, plant: blocker.kind, to: 'pebble' });
      c.withSnack = true; c.mood = 'flee'; c.moodAt = s.t;
      return;
    }
    if (c.mood !== 'nibble') { c.mood = 'nibble'; c.moodAt = s.t; }
    const shielded = neighbours(s, blocker.lane, blocker.col).some(n => n.kind === 'nasturtium') ? 1 - FRIENDS.nasturtiumShield : 1;
    blocker.health -= st.bite * shielded * dt;
    if (blocker.health <= 0) wilt(s, blocker);
    return;
  }
  if (c.mood === 'nibble') { c.mood = 'walk'; c.moodAt = s.t; }
  c.x -= speed * dt;
  if (c.x <= SIM.blanketX) reachBlanket(s, c);
}

function moveShot(s: GameState, sh: Shot, dt: number): boolean {
  if (sh.lob) {
    const k = (s.t - sh.lob.at) / sh.lob.len;
    sh.x = sh.lob.fromX + (sh.lob.toX - sh.lob.fromX) * Math.min(1, k);
    if (k < 1) return true;
    const target = s.critters.find(c => c.id === sh.lob!.target && c.lane === sh.lane);
    const hit = target && reachable(s, target, true) ? target : frontmost(s, sh.lane, sh.lob.toX - 0.5, sh.lob.toX + 0.5, true);
    if (hit) shoo(s, hit, sh.power, 'over');
    if (sh.lob.splash) for (const c of s.critters) if (c !== hit && c.lane === sh.lane && Math.abs(c.x - sh.x) <= sh.lob.splash && reachable(s, c, true)) shoo(s, c, sh.power * 0.5, 'over');
    return false;
  }
  const step = sh.speed * dt;
  sh.x += step;
  sh.glide -= step;
  for (const c of s.critters) {
    if (c.lane !== sh.lane || sh.hit.includes(c.id) || Math.abs(c.x - sh.x) > 0.32 || !reachable(s, c)) continue;
    if (sh.kind === 'pinecone') { c.shield = 0; shoo(s, c, sh.power, 'through'); return false; }
    if (sh.pierce) { sh.hit.push(c.id); shoo(s, c, sh.power, 'through'); continue; }
    shoo(s, c, sh.power, 'front');
    return false;
  }
  return sh.x < SIM.sightX + 1 && sh.glide > 0;
}

/** Endless mode makes its next wave from the round number. */
function endlessWave(s: GameState) {
  const n = s.wave + 1, pool = ['snail', 'mouse', 'ants', 'roly-poly', 'beetle', 'grasshopper', 'frog', 'vole', 'hedgehog', 'magpie', 'gecko', 'goat', 'jackrabbit', 'packrat', 'seagull', 'sheep'];
  const budget = 5 + n * 3, allowed = pool.slice(0, Math.min(pool.length, 3 + n));
  const spawns = [];
  let spent = 0, delay = 0;
  while (spent < budget) {
    const kind = allowed[Math.floor(s.rnd() * allowed.length)]!;
    spawns.push({ critter: kind, lane: -1, delay });
    spent += pointsOf(kind);
    delay += Math.max(0.8, WAVES.gap - n * 0.15) * (0.6 + s.rnd() * 0.8);
  }
  return { spawns, flag: n % 5 === 0 };
}

/** One fixed step of the rules (1/60 s by default). Commands apply first. */
export function step(s: GameState, dt = 1 / 60, commands: readonly Command[] = []) {
  for (const cmd of commands) command(s, cmd);
  if (s.result) return;
  s.t += dt;
  const spec = s.spec;
  // waves: the next one starts on time, or early when the garden is clear
  const waveCount = spec.endless ? Infinity : spec.waves.length;
  // a clear garden brings the next wave sooner, after a short breather
  if (s.wave > 0 && !s.critters.length && !s.pending.length && s.nextWaveAt - s.t > WAVES.breather) s.nextWaveAt = s.t + WAVES.breather;
  if (s.wave < waveCount && s.t >= s.nextWaveAt) {
    const w = spec.endless ? endlessWave(s) : spec.waves[s.wave]!;
    if (spec.endless) s.totalPoints += w.spawns.reduce((a, sp) => a + pointsOf(sp.critter), 0);
    const rush = w.flag ? WAVES.rush : 1;
    for (const sp of w.spawns) s.pending.push({ at: s.t + sp.delay * rush, critter: sp.critter, lane: sp.lane });
    const len = Math.max(0, ...w.spawns.map(sp => sp.delay * rush));
    s.events.push({ type: 'wave', index: s.wave, flag: !!w.flag, final: s.wave === waveCount - 1 });
    s.wave++;
    s.nextWaveAt = s.t + len + WAVES.between;
    if (s.nextWaveAt - s.t < 6) s.nextWaveAt = s.t + 6;
  }
  for (let i = s.pending.length - 1; i >= 0; i--) {
    const p = s.pending[i]!;
    if (p.at > s.t) continue;
    s.pending.splice(i, 1);
    const st = BOSSES[p.critter] ?? CRITTERS[p.critter]!;
    const lane = p.lane >= 0 ? p.lane : Math.floor(s.rnd() * LANES);
    let group = 0;
    for (let k = 0; k < (st.group ?? 1); k++) group = spawn(s, p.critter, lane, ENTRY_X + 0.3 + k * 0.45, group).group;
    s.spawnedPoints += st.points;
  }
  s.progress = s.totalPoints ? Math.min(1, s.spawnedPoints / s.totalPoints) : 0;
  // worms, the snack cart
  if (spec.worms !== false && s.t >= s.nextWormAt) {
    s.nextWormAt = s.t + COMPOST.wormEvery + (s.rnd() * 2 - 1) * COMPOST.wormJitter;
    const lane = Math.floor(s.rnd() * LANES), col = Math.floor(s.rnd() * COLS);
    if (specialAt(s, lane, col) !== 'water' && specialAt(s, lane, col) !== 'gap') addPickup(s, lane, col + 0.5, COMPOST.pickup, 'worm');
  }
  if (spec.cartEvery && s.t >= s.nextCartAt) { s.cartLane = (s.cartLane + 1 + Math.floor(s.rnd() * (LANES - 1))) % LANES; s.nextCartAt = s.t + spec.cartEvery; }
  // cards recharge
  for (const c of s.cards) if (c.wait > 0) c.wait = Math.max(0, c.wait - dt);
  // plants act; hot tiles dry them unless a channel is next to them; the plant doctor mends neighbours
  for (const row of s.grid) for (const g of row) {
    if (g.kind !== 'plant') continue;
    const p = g.plant, st = PLANTS[p.kind]!;
    if (specialAt(s, p.lane, p.col) === 'hot' && !st.heatproof && ![[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dl, dc]) => specialAt(s, p.lane + dl!, p.col + dc!) === 'water')) {
      p.health -= p.max * TILES.hotDry * dt;
      if (p.health <= 0) { wilt(s, p); continue; }
    }
    if (p.kind === 'chamomile') for (const n of neighbours(s, p.lane, p.col)) n.health = Math.min(n.max, n.health + n.max * FRIENDS.chamomileMend * dt);
    if (st.attack === 'none' || st.attack === 'support') continue;
    p.wait -= dt * haste(s, p);
    if (p.wait > 0) continue;
    if (act(s, p)) { p.wait = st.every; if (st.attack !== 'cloud' && st.attack !== 'slow' && st.attack !== 'lure') p.actedAt = s.t; }
    else p.wait = 0.1;
  }
  // shots fly, critters move
  for (let i = s.shots.length - 1; i >= 0; i--) if (!moveShot(s, s.shots[i]!, dt)) s.shots.splice(i, 1);
  for (const c of [...s.critters]) {
    if (s.result) break;
    if (c.patience <= 0 && !c.withSnack) { flee(s, c); continue; }
    moveCritter(s, c, dt);
  }
  // pickups: auto-collect, or they sink back into the soil after a while
  for (let i = s.pickups.length - 1; i >= 0; i--) {
    const p = s.pickups[i]!, age = s.t - p.bornAt;
    if (s.autoCollect && age >= COMPOST.autoCollectDelay) collect(s, p);
    else if (age >= COMPOST.pickupLife) s.pickups.splice(i, 1);
  }
  // won when every wave has come and gone
  if (!s.result && !spec.endless && spec.waves.length > 0 && s.wave >= spec.waves.length && !s.pending.length && !s.critters.some(c => !c.withSnack)) {
    s.result = 'won';
    s.events.push({ type: 'won' });
  }
}

/** Stars for a won level: one per snack still in the basket. */
export const stars = (s: GameState) => (s.result === 'won' ? Math.max(1, s.snacks) : 0);

/** Runs the rules for `seconds` (tests, bots, the pacing report). */
export function run(s: GameState, seconds: number, each?: (s: GameState) => Command[] | void, dt = 1 / 60) {
  const end = s.t + seconds;
  while (s.t < end && !s.result) {
    const cmds = each?.(s) ?? [];
    step(s, dt, cmds);
    s.events.length = 0;
  }
}

export type { GameEvent };
