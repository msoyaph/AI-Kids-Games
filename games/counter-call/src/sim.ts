/**
 * Counter Call's rules: pure, seeded and fixed-step, so a day replays exactly in tests.
 * Nothing here touches the DOM, Three.js, audio or storage.
 *
 * The room, seen from behind the counter (the camera looks toward -z):
 *   stations (z = 2.35)  →  Minty's lane  →  the counter (z = -0.6)  →  friends (z = -1.6)  →  the door
 */
import { CHAR_BY_ID, GUESTS, hostById } from './data/characters';
import { DAYS, type DayDef } from './data/days';
import { FOOD_BY_ID, STATION_ORDER, type FoodId } from './data/menu';
import { UPGRADE_BY_ID, type UpgradeId } from './data/upgrades';

export const STEP = 1 / 60;
/** Tray spaces before perks and upgrades. */
export const TRAY_MAX = 3;
/** In Endless Rush, the day ends when this many friends have gone home hungry. */
export const LIVES = 3;
export const QUEUE_MAX = 4;
export const SPOT_COUNT = 3;
const HOST_SPEED = 5.4;
const GUEST_SPEED = 2.7;

export interface Vec { x: number; z: number }

export const LAYOUT = {
  stationX: [-3.3, -1.65, 0, 1.65, 3.3],
  stationZ: 2.35,
  /** Where Minty stands to use a station. */
  cookZ: 1.15,
  spotX: [-2.5, 0, 2.5],
  counterZ: -0.6,
  /** Where Minty stands to serve. */
  serveZ: 0.2,
  /** Where friends stand at the counter. */
  guestZ: -2.0,
  aisleZ: -4.0,
  door: { x: -3.7, z: -6.9 },
  bell: { x: 1.25, z: -0.6 },
  cake: { x: 4.5, z: -0.6 },
} as const;

/** What the host's perk and the shop upgrades change. */
export interface Mods {
  /** Walking speed (1 = normal). */
  speed: number;
  /** How long friends wait (1 = normal). */
  patience: number;
  /** Cooking time (1 = normal, lower is faster). */
  cook: number;
  /** Spaces on the tray. */
  tray: number;
  /** Extra coins from every happy friend. */
  tip: number;
  /** Rounds of free cake each day. */
  samples: number;
}

export interface GameOptions {
  /** Overrides how many friends visit (a shorter day for tests and for trying things out). */
  guests?: number;
  /** Who is playing (a host id from the character registry). */
  host?: string;
  /** Shop upgrade levels. */
  upgrades?: Partial<Record<UpgradeId, number>>;
  /** Endless Rush: friends keep coming, faster and hungrier, until LIVES of them leave. */
  endless?: boolean;
}

export function modsFor(host?: string, upgrades: Partial<Record<string, number>> = {}): Mods {
  const level = (id: UpgradeId) => Math.min(UPGRADE_BY_ID[id].costs.length, Math.max(0, Math.floor(upgrades[id] ?? 0)));
  const perk = hostById(host).perk?.id;
  return {
    speed: (perk === 'quick' ? 1.2 : 1) * (1 + 0.08 * level('shoes')),
    patience: (perk === 'charm' ? 1.2 : 1) * (1 + 0.1 * level('mats')),
    cook: (perk === 'chef' ? 0.85 : 1) * (1 - 0.12 * level('stove')),
    tray: TRAY_MAX + (perk === 'hands' ? 1 : 0) + level('tray'),
    tip: level('tips') + (perk === 'tips' ? 1 : 0),
    samples: 1 + (perk === 'treats' ? 1 : 0) + level('cake'),
  };
}

export type Target = { kind: 'station'; index: number } | { kind: 'guest'; spot: number };
export type StationPhase = 'idle' | 'cooking' | 'ready';
export interface Station { food: FoodId; unlocked: boolean; phase: StationPhase; t: number; total: number }

/** What Minty is doing right now (drives her animation). */
export type HostAct = 'idle' | 'walk' | 'start' | 'wait' | 'collect' | 'serve' | 'shrug';
export interface Host {
  x: number;
  z: number;
  /** Heading in radians: 0 faces the stations and the camera (+z), π faces the friends. */
  face: number;
  act: HostAct;
  /** Seconds left of a short action (starting a station, picking up, serving). */
  busy: number;
  current: Target | null;
  queue: Target[];
  tray: FoodId[];
}

export type GuestPhase = 'arriving' | 'waiting' | 'happy' | 'leaving';
export interface OrderItem { food: FoodId; done: boolean }
export interface Guest {
  uid: number;
  /** Character id in the registry. */
  char: string;
  spot: number;
  phase: GuestPhase;
  /** True once they have been fully served. */
  glad: boolean;
  x: number;
  z: number;
  face: number;
  path: Vec[];
  order: OrderItem[];
  patience: number;
  patienceMax: number;
  /** Seconds left of the happy dance. */
  t: number;
  /** Their order includes their favorite food. */
  favorite: boolean;
  /** They were called in early with the bell. */
  eager: boolean;
}

export type SimEvent =
  | { type: 'arrive'; uid: number }
  | { type: 'order'; uid: number }
  | { type: 'start'; station: number }
  | { type: 'ready'; station: number }
  | { type: 'collect'; station: number; food: FoodId }
  | { type: 'deliver'; uid: number; foods: FoodId[] }
  | { type: 'complete'; uid: number; coins: number; hearts: number; favorite: boolean; together: boolean; streak: number }
  | { type: 'samples'; count: number }
  | { type: 'giveup'; uid: number }
  | { type: 'nomatch' }
  | { type: 'trayfull' }
  | { type: 'bell'; called: boolean }
  | { type: 'discard'; food: FoodId }
  | { type: 'over' };

export interface State {
  seed: number;
  rng: number;
  dayIndex: number;
  day: DayDef;
  /** Endless Rush: no last friend, and the day ends after LIVES misses. */
  endless: boolean;
  /** Who is playing (a host id), and what their perk and the upgrades change. */
  hostId: string;
  mods: Mods;
  time: number;
  host: Host;
  stations: Station[];
  guests: Guest[];
  /** Friends still to arrive today (Infinity in Endless Rush). */
  toSpawn: number;
  /** Friends who have arrived so far. */
  spawned: number;
  nextSpawn: number;
  /** Who visits next (character ids, cycled). */
  lineup: string[];
  eagerNext: boolean;
  coins: number;
  served: number;
  missed: number;
  /** Hearts earned today (up to 3 per friend). */
  hearts: number;
  /** Happy friends in a row since the last one who left hungry, and today's best run. */
  streak: number;
  bestStreak: number;
  /** Rounds of free cake left today. */
  samples: number;
  /** What happened this step, for sound and effects. The caller drains it. */
  events: SimEvent[];
  over: boolean;
  uid: number;
}

/** Mulberry32, kept in the state so a day replays exactly from its seed. */
function rand(s: State): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = Math.imul(s.rng ^ (s.rng >>> 15), s.rng | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** In Endless Rush `dayIndex` picks the menu: everything on that day's menu is open. */
export function newGame(seed: number, dayIndex = 0, opts: GameOptions = {}): State {
  const index = Math.min(DAYS.length - 1, Math.max(0, Math.floor(dayIndex) || 0));
  const endless = !!opts.endless;
  const day: DayDef = endless ? { name: 'Endless Rush', menu: DAYS[index].menu, guests: 0, sizes: [3, 2, 0], gap: [6, 8], patience: 40 }
    : opts.guests && opts.guests > 0 ? { ...DAYS[index], guests: Math.floor(opts.guests) } : DAYS[index];
  const host = hostById(opts.host);
  const mods = modsFor(host.id, opts.upgrades);
  const s: State = {
    seed, rng: seed | 0, dayIndex: index, day, endless, hostId: host.id, mods, time: 0,
    host: { x: 0, z: LAYOUT.cookZ, face: 0, act: 'idle', busy: 0, current: null, queue: [], tray: [] },
    stations: STATION_ORDER.map(food => ({ food, unlocked: day.menu.includes(food), phase: 'idle' as StationPhase, t: 0, total: FOOD_BY_ID[food].cookSeconds * mods.cook })),
    guests: [], toSpawn: endless ? Infinity : day.guests, spawned: 0, nextSpawn: 1.2, lineup: GUESTS.map(g => g.id), eagerNext: false,
    coins: 0, served: 0, missed: 0, hearts: 0, streak: 0, bestStreak: 0, samples: mods.samples, events: [], over: false, uid: 1,
  };
  for (let i = s.lineup.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [s.lineup[i], s.lineup[j]] = [s.lineup[j], s.lineup[i]];
  }
  return s;
}

/** The friend waiting at a counter spot, if there is one. */
export function guestAt(s: State, spot: number): Guest | undefined {
  return s.guests.find(g => g.spot === spot && g.phase === 'waiting');
}

export function freeSpots(s: State): number[] {
  const free: number[] = [];
  for (let i = 0; i < SPOT_COUNT; i++) if (!s.guests.some(g => g.spot === i && g.phase !== 'leaving')) free.push(i);
  return free;
}

const same = (a: Target, b: Target) => (a.kind === 'station' && b.kind === 'station' ? a.index === b.index : a.kind === 'guest' && b.kind === 'guest' && a.spot === b.spot);

/** Minty's to-do list in order: what she is doing now, then what is queued. */
export function pending(s: State): Target[] {
  return s.host.current ? [s.host.current, ...s.host.queue] : [...s.host.queue];
}

/** Ask Minty to use a station or serve a friend. Returns false when the tap does nothing. */
export function tap(s: State, target: Target): boolean {
  if (s.over) return false;
  if (target.kind === 'station') {
    const st = s.stations[target.index];
    if (!st || !st.unlocked) return false;
  } else if (!guestAt(s, target.spot)) return false;
  const h = s.host;
  const last = h.queue[h.queue.length - 1] ?? h.current;
  if (last && same(last, target)) return false;
  if (h.queue.length >= QUEUE_MAX) return false;
  h.queue.push(target);
  return true;
}

/** Ring the counter bell: the next friend comes in right away (and tips a little extra). */
export function ringBell(s: State): boolean {
  if (s.over) return false;
  const called = s.toSpawn > 0 && s.nextSpawn > 0.4 && freeSpots(s).length > 0;
  if (called) {
    s.nextSpawn = 0;
    s.eagerNext = true;
  }
  s.events.push({ type: 'bell', called });
  return called;
}

/** Take something off the tray (it goes to the snack shelf for later). */
export function discard(s: State, slot: number): boolean {
  const food = s.host.tray[slot];
  if (s.over || !food) return false;
  s.host.tray.splice(slot, 1);
  s.events.push({ type: 'discard', food });
  return true;
}

/** Hand out free cake: every waiting friend is happy to wait all over again. A few rounds a day. */
export function giveSamples(s: State): boolean {
  if (s.over || s.samples <= 0) return false;
  const waiting = s.guests.filter(g => g.phase === 'waiting');
  if (!waiting.length) return false;
  s.samples--;
  for (const g of waiting) g.patience = g.patienceMax;
  s.events.push({ type: 'samples', count: waiting.length });
  return true;
}

/**
 * Order sizes, arrival gaps and patience right now. A normal day keeps its own numbers. Endless
 * Rush gets busier with every friend who arrives: bigger orders, shorter gaps, less patience,
 * until nobody could keep up (RUSH tunes how fast).
 */
const RUSH = { gap: 0.035, gapFloor: 0.25, patience: 0.026, patienceFloor: 0.22 };
function pace(s: State): Pick<DayDef, 'sizes' | 'gap' | 'patience'> {
  if (!s.endless) return s.day;
  const n = s.spawned, k = Math.max(RUSH.gapFloor, 1 - n * RUSH.gap);
  return {
    sizes: n < 5 ? [3, 2, 0] : n < 12 ? [1, 3, 1] : [0, 3, 3],
    gap: [s.day.gap[0] * k, s.day.gap[1] * k],
    patience: s.day.patience * Math.max(RUSH.patienceFloor, 1 - n * RUSH.patience),
  };
}

/** 0 to 3 stars for the day: half the friends happy, three in four, or everyone. */
export function stars(s: State): number {
  const total = s.day.guests;
  if (s.served >= total) return 3;
  if (s.served >= Math.ceil(total * 0.75)) return 2;
  if (s.served >= Math.ceil(total * 0.5)) return 1;
  return 0;
}

function walk(o: { x: number; z: number; face: number }, to: Vec, dist: number): boolean {
  const dx = to.x - o.x, dz = to.z - o.z, d = Math.hypot(dx, dz);
  if (d <= dist) {
    o.x = to.x;
    o.z = to.z;
    return true;
  }
  o.x += (dx / d) * dist;
  o.z += (dz / d) * dist;
  o.face = Math.atan2(dx, dz);
  return false;
}

function makeOrder(s: State, char: string): OrderItem[] {
  const menu = s.day.menu, weights = pace(s).sizes;
  let roll = rand(s) * (weights[0] + weights[1] + weights[2]);
  let size = 1;
  for (let i = 0; i < 3; i++) {
    roll -= weights[i];
    if (roll < 0) { size = i + 1; break; }
  }
  const foods: FoodId[] = [];
  const favorite = CHAR_BY_ID[char]?.favorite;
  if (favorite && menu.includes(favorite) && rand(s) < 0.6) foods.push(favorite);
  while (foods.length < size) {
    const food = menu[Math.floor(rand(s) * menu.length)];
    // No doubles while there is still something different to pick.
    if (foods.includes(food) && foods.length < menu.length) continue;
    foods.push(food);
  }
  foods.sort((a, b) => STATION_ORDER.indexOf(a) - STATION_ORDER.indexOf(b));
  return foods.map(food => ({ food, done: false }));
}

function spawn(s: State): boolean {
  const free = freeSpots(s);
  if (!free.length) return false;
  const spot = free[Math.floor(rand(s) * free.length)];
  let pick = 0;
  for (let i = 0; i < s.lineup.length; i++) if (!s.guests.some(g => g.char === s.lineup[i])) { pick = i; break; }
  const char = s.lineup.splice(pick, 1)[0];
  s.lineup.push(char);
  const order = makeOrder(s, char);
  const def = CHAR_BY_ID[char];
  const patienceMax = pace(s).patience * (def?.patience ?? 1) * (1 + 0.3 * (order.length - 1)) * s.mods.patience;
  const guest: Guest = {
    uid: s.uid++, char, spot, phase: 'arriving', glad: false,
    x: LAYOUT.door.x, z: LAYOUT.door.z, face: 0,
    path: [{ x: LAYOUT.spotX[spot], z: LAYOUT.aisleZ }, { x: LAYOUT.spotX[spot], z: LAYOUT.guestZ }],
    order, patience: patienceMax, patienceMax, t: 0,
    favorite: !!def?.favorite && order.some(o => o.food === def.favorite), eager: s.eagerNext,
  };
  s.eagerNext = false;
  s.spawned++;
  s.guests.push(guest);
  s.events.push({ type: 'arrive', uid: guest.uid });
  return true;
}

const exitPath = (g: Guest): Vec[] => [{ x: g.x + 0.9, z: LAYOUT.aisleZ }, { x: LAYOUT.door.x + 0.6, z: LAYOUT.door.z }];

function begin(h: Host, act: HostAct, seconds: number): void {
  h.act = act;
  h.busy = seconds;
  h.current = null;
}

function serve(s: State, g: Guest): void {
  const h = s.host;
  const foods: FoodId[] = [];
  for (const item of g.order) {
    if (item.done) continue;
    const slot = h.tray.indexOf(item.food);
    if (slot < 0) continue;
    h.tray.splice(slot, 1);
    item.done = true;
    foods.push(item.food);
  }
  if (!foods.length) {
    s.events.push({ type: 'nomatch' });
    begin(h, 'shrug', 0.5);
    return;
  }
  begin(h, 'serve', 0.45);
  s.events.push({ type: 'deliver', uid: g.uid, foods });
  if (g.order.some(o => !o.done)) {
    // A nibble buys a little more waiting.
    g.patience = Math.min(g.patienceMax, g.patience + g.patienceMax * 0.15 * foods.length);
    return;
  }
  const left = g.patience / g.patienceMax;
  const hearts = left > 0.5 ? 3 : left > 0.22 ? 2 : 1;
  // Bonuses: a whole order of two or more carried over in one go, and a run of happy friends.
  const together = g.order.length > 1 && foods.length === g.order.length;
  s.streak++;
  s.bestStreak = Math.max(s.bestStreak, s.streak);
  const coins = g.order.reduce((sum, o) => sum + FOOD_BY_ID[o.food].price, 0) + (hearts - 1) * 2 + (g.favorite ? 3 : 0) + (g.eager ? 2 : 0)
    + (together ? 2 : 0) + Math.min(s.streak - 1, 5) + s.mods.tip;
  g.phase = 'happy';
  g.glad = true;
  g.t = 1.3;
  s.coins += coins;
  s.served++;
  s.hearts += hearts;
  s.events.push({ type: 'complete', uid: g.uid, coins, hearts, favorite: g.favorite, together, streak: s.streak });
}

function stepHost(s: State): void {
  const h = s.host;
  if (h.busy > 0) {
    h.busy -= STEP;
    if (h.busy > 0) return;
    h.act = 'idle';
  }
  if (!h.current) {
    h.current = h.queue.shift() ?? null;
    if (!h.current) {
      h.act = 'idle';
      return;
    }
  }
  const t = h.current;
  const stand: Vec = t.kind === 'station' ? { x: LAYOUT.stationX[t.index], z: LAYOUT.cookZ } : { x: LAYOUT.spotX[t.spot], z: LAYOUT.serveZ };
  if (!walk(h, stand, HOST_SPEED * s.mods.speed * STEP)) {
    h.act = 'walk';
    return;
  }
  if (t.kind === 'station') {
    h.face = 0;
    const st = s.stations[t.index];
    if (st.phase === 'idle') {
      st.phase = 'cooking';
      st.t = 0;
      s.events.push({ type: 'start', station: t.index });
      begin(h, 'start', 0.4);
    } else if (st.phase === 'cooking') {
      // Wait for it, unless there is something else to do.
      if (h.queue.length) h.current = null;
      else h.act = 'wait';
    } else if (h.tray.length >= s.mods.tray) {
      s.events.push({ type: 'trayfull' });
      begin(h, 'shrug', 0.5);
    } else {
      h.tray.push(st.food);
      st.phase = 'idle';
      st.t = 0;
      s.events.push({ type: 'collect', station: t.index, food: st.food });
      begin(h, 'collect', 0.3);
    }
    return;
  }
  h.face = Math.PI;
  const g = guestAt(s, t.spot);
  if (g) serve(s, g);
  else {
    h.current = null;
    h.act = 'idle';
  }
}

function stepGuest(s: State, g: Guest): boolean {
  if (g.phase === 'arriving') {
    if (walk(g, g.path[0], GUEST_SPEED * STEP)) g.path.shift();
    if (!g.path.length) {
      g.phase = 'waiting';
      g.face = 0;
      s.events.push({ type: 'order', uid: g.uid });
    }
  } else if (g.phase === 'waiting') {
    g.patience -= STEP;
    if (g.patience <= 0) {
      g.patience = 0;
      g.phase = 'leaving';
      g.path = exitPath(g);
      s.missed++;
      s.streak = 0;
      s.events.push({ type: 'giveup', uid: g.uid });
    }
  } else if (g.phase === 'happy') {
    g.t -= STEP;
    if (g.t <= 0) {
      g.phase = 'leaving';
      g.path = exitPath(g);
    }
  } else {
    if (walk(g, g.path[0], GUEST_SPEED * STEP)) g.path.shift();
    if (!g.path.length) return false;
  }
  return true;
}

/** Advance the day by one fixed step. */
export function step(s: State): void {
  if (s.over) return;
  s.time += STEP;
  for (let i = 0; i < s.stations.length; i++) {
    const st = s.stations[i];
    if (st.phase !== 'cooking') continue;
    st.t += STEP;
    if (st.t >= st.total) {
      st.phase = 'ready';
      s.events.push({ type: 'ready', station: i });
    }
  }
  stepHost(s);
  s.guests = s.guests.filter(g => stepGuest(s, g));
  if (s.toSpawn > 0) {
    // Nobody waits around in an empty room.
    if (!s.guests.length) s.nextSpawn = Math.min(s.nextSpawn, 1);
    s.nextSpawn -= STEP;
    if (s.nextSpawn <= 0 && spawn(s)) {
      s.toSpawn--;
      const gap = pace(s).gap;
      s.nextSpawn = gap[0] + rand(s) * (gap[1] - gap[0]);
    }
  }
  if (s.endless ? s.missed >= LIVES : s.toSpawn <= 0 && !s.guests.length) {
    s.over = true;
    s.events.push({ type: 'over' });
  }
}
