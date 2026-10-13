/**
 * The game rules, with no DOM, canvas or timers: a seeded, fixed-step simulation that unit tests
 * can run directly. Rendering and input live elsewhere and only read this state.
 *
 * Star Sprint: a little comet races across the night sky. Glide up and down to catch the stars
 * that fly toward you. Sleepy clouds don't hurt; they just make the comet slow and drowsy for a
 * moment. The sky speeds up as the round goes on.
 */
export interface Vec { x: number; y: number }
export interface Thing { id: number; kind: 'star' | 'cloud'; x: number; y: number; r: number; spin: number }
export interface State {
  seed: number;
  rand: number;
  time: number;
  duration: number;
  score: number;
  streak: number;
  bestStreak: number;
  player: Vec & { tilt: number };
  things: Thing[];
  nextId: number;
  nextSpawn: number;
  /** Seconds of drowsiness left after bumping a cloud (slower gliding). */
  sleepy: number;
  over: boolean;
}

export const WORLD = { w: 1600, h: 900 } as const;
export const PLAYER_X = 340;
export const PLAYER_R = 38;
export const GLIDE = 640;
export const SLEEPY_TIME = 1.2;
export const STEP = 1 / 60;
const TOP = 90, BOTTOM = WORLD.h - 90;

/** Small, fast, seeded random numbers (mulberry32), stored in the state so runs replay exactly. */
export function random(s: State): number {
  let t = (s.rand = (s.rand + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** How fast the sky flows past, in world units a second: gentle at first, quicker near the end. */
export const skySpeed = (s: State) => 360 + 260 * Math.min(1, s.time / s.duration);

function spawn(s: State) {
  // Three stars for every cloud, and never a cloud right where the last star is.
  const kind = random(s) < 0.25 ? 'cloud' : 'star';
  const y = TOP + random(s) * (BOTTOM - TOP);
  const last = s.things.at(-1);
  if (kind === 'cloud' && last && last.kind === 'star' && Math.abs(last.y - y) < 160 && last.x > WORLD.w - 200) return;
  s.things.push({ id: s.nextId++, kind, x: WORLD.w + 80, y, r: kind === 'cloud' ? 58 : 28, spin: random(s) * Math.PI });
}

export function newGame(seed = 1, duration = 60): State {
  const s: State = { seed, rand: seed, time: 0, duration, score: 0, streak: 0, bestStreak: 0, player: { x: PLAYER_X, y: WORLD.h / 2, tilt: 0 }, things: [], nextId: 1, nextSpawn: 0.4, sleepy: 0, over: false };
  // A few stars already on their way, so the first second has something to catch.
  for (let i = 0; i < 3; i++) s.things.push({ id: s.nextId++, kind: 'star', x: 760 + i * 300, y: TOP + random(s) * (BOTTOM - TOP), r: 28, spin: random(s) * Math.PI });
  return s;
}

export type Event = 'star' | 'cloud';

/** Advance one fixed step. Only `input.y` matters (−1 up … 1 down). Returns what the comet touched. */
export function step(s: State, input: Vec, dt = STEP): Event[] {
  if (s.over) return [];
  const events: Event[] = [];
  const y = Math.max(-1, Math.min(1, input.y));
  const glide = GLIDE * (s.sleepy > 0 ? 0.45 : 1);
  s.player.y = Math.min(BOTTOM, Math.max(TOP, s.player.y + y * glide * dt));
  s.player.tilt += (y * 0.35 - s.player.tilt) * Math.min(1, dt * 10);
  s.sleepy = Math.max(0, s.sleepy - dt);

  const speed = skySpeed(s);
  for (const thing of s.things) thing.x -= speed * dt;
  s.things = s.things.filter(thing => {
    if (thing.x < -120) { if (thing.kind === 'star') s.streak = 0; return false; }
    if (Math.hypot(thing.x - s.player.x, thing.y - s.player.y) > thing.r + PLAYER_R * (thing.kind === 'cloud' ? 0.7 : 1)) return true;
    if (thing.kind === 'star') { s.score++; s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak); events.push('star'); }
    else { s.sleepy = SLEEPY_TIME; s.streak = 0; events.push('cloud'); }
    return false;
  });

  s.nextSpawn -= dt;
  if (s.nextSpawn <= 0) { spawn(s); s.nextSpawn = 0.45 + random(s) * 0.5 - 0.15 * Math.min(1, s.time / s.duration); }
  s.time = Math.min(s.duration, s.time + dt);
  if (s.time >= s.duration) s.over = true;
  return events;
}

export const timeLeft = (s: State) => Math.max(0, Math.ceil(s.duration - s.time));
