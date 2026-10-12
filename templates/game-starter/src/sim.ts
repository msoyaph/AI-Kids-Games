/**
 * The game rules, with no DOM, canvas or timers: a seeded, fixed-step simulation that unit tests
 * can run directly. Rendering and input live elsewhere and only read this state.
 *
 * Star Catch: steer a little firefly around the sky and catch as many stars as you can before
 * the timer runs out. Replace these rules with your own game.
 */
export interface Vec { x: number; y: number }
export interface Star { id: number; x: number; y: number; r: number; spin: number }
export interface State {
  seed: number;
  rand: number;
  time: number;
  duration: number;
  score: number;
  player: Vec & { facing: number };
  stars: Star[];
  nextId: number;
  over: boolean;
}

export const WORLD = { w: 1600, h: 900 } as const;
export const SPEED = 520;
export const PLAYER_R = 36;
export const STAR_COUNT = 5;
export const STEP = 1 / 60;

/** Small, fast, seeded random numbers (mulberry32), stored in the state so runs replay exactly. */
export function random(s: State): number {
  let t = (s.rand = (s.rand + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function spawnStar(s: State): Star {
  for (let tries = 0; ; tries++) {
    const star = { id: s.nextId, x: 80 + random(s) * (WORLD.w - 160), y: 80 + random(s) * (WORLD.h - 160), r: 26 + random(s) * 10, spin: random(s) * Math.PI };
    // never right on top of the player, so every catch takes a little steering
    if (Math.hypot(star.x - s.player.x, star.y - s.player.y) > 260 || tries > 20) { s.nextId++; return star; }
  }
}

export function newGame(seed = 1, duration = 60): State {
  const s: State = { seed, rand: seed, time: 0, duration, score: 0, player: { x: WORLD.w / 2, y: WORLD.h / 2, facing: 0 }, stars: [], nextId: 1, over: false };
  for (let i = 0; i < STAR_COUNT; i++) s.stars.push(spawnStar(s));
  return s;
}

/** Advance one fixed step. `input` is a direction with length 0–1. Returns the stars caught. */
export function step(s: State, input: Vec, dt = STEP): number {
  if (s.over) return 0;
  const len = Math.hypot(input.x, input.y);
  const k = len > 1 ? 1 / len : 1;
  s.player.x = Math.min(WORLD.w - PLAYER_R, Math.max(PLAYER_R, s.player.x + input.x * k * SPEED * dt));
  s.player.y = Math.min(WORLD.h - PLAYER_R, Math.max(PLAYER_R, s.player.y + input.y * k * SPEED * dt));
  if (len > 0.05) s.player.facing = Math.atan2(input.y, input.x);
  let caught = 0;
  s.stars = s.stars.map(star => {
    if (Math.hypot(star.x - s.player.x, star.y - s.player.y) > star.r + PLAYER_R) return star;
    caught++;
    return spawnStar(s);
  });
  s.score += caught;
  s.time = Math.min(s.duration, s.time + dt);
  if (s.time >= s.duration) s.over = true;
  return caught;
}

export const timeLeft = (s: State) => Math.max(0, Math.ceil(s.duration - s.time));
