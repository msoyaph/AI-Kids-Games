/**
 * Touch vs keyboard survival (headless, deterministic — machine load can't change the numbers).
 * The same bot, seeds and level-up picks play every run; only the way its wishes reach Thea
 * differs, through the game's real control code:
 *   ideal       the bot's analog wish straight into the sim (npm run simulate)
 *   keyboard    8-way keys read against a camera the player leaves alone
 *   touch-off   the glass stick (input/stick.ts) against a still camera (auto camera off)
 *   touch-on    the stick against the auto camera (render/autoCamera.ts)
 *   touch-lock  …plus the heading lock (input/touchSteer.ts)
 *   touch-slow  the auto camera slowed while steering on a diagonal (rate × cos² of the stick angle)
 * A "thumb" holds its keys / stick direction between decisions, like a person: it re-aims when
 * the bot's wish turns more than AIM_TOL from what it last aimed at, or when Thea's actual
 * heading has drifted DRIFT_TOL from the wish (you notice she's veering), REACTION seconds
 * later. The thumb aims by what it sees: the wish's direction on screen at that moment.
 * Identical for every scheme. --casual uses a looser thumb (a younger player).
 *
 * Usage: npx tsx scripts/touch-compare.ts [seeds=12] [skill=0.7] [--map meadow]
 *        [--difficulty relaxed] [--casual] [--modes keyboard,touch-on] [--circle]
 */
import { spawn } from 'node:child_process';
import { CHARACTERS } from '../src/config/characters';
import { isMapId, type MapId } from '../src/config/maps';
import { isDifficultyId, type DifficultyId } from '../src/config/difficulty';
import { TUNING_DEFAULTS } from '../src/config/tuning';
import { formatTime } from '../src/core/math';
import { stickReading, stickResponse } from '../src/input/stick';
import { TouchSteer } from '../src/input/touchSteer';
import { autoCameraTurn } from '../src/render/autoCamera';
import { Bot } from '../src/sim/bot';
import { newRun } from '../src/sim/run';
import { closeChest, step } from '../src/sim/sim';
import { resolveLevelUp } from '../src/sim/upgrades';
import { emptyInput, type World } from '../src/sim/world';
import { SrcKind } from '../src/sim/sources';

const MODES = ['ideal', 'keyboard', 'touch-off', 'touch-on', 'touch-lock', 'touch-slow'] as const;
type Mode = (typeof MODES)[number];
const DT = 1 / 60;
const DEG = Math.PI / 180;
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

interface Thumb {
  aimTol: number;
  driftTol: number;
  reaction: number;
}
const ATTENTIVE: Thumb = { aimTol: 12 * DEG, driftTol: 30 * DEG, reaction: 0.1 };
const CASUAL: Thumb = { aimTol: 20 * DEG, driftTol: 50 * DEG, reaction: 0.2 };

/** Screen angle (clockwise from up) of world direction (x, z) for a camera at `yaw`. */
function screenAngle(x: number, z: number, yaw: number): number {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const sx = x * -fz + z * fx; // · right (−fz, fx)
  const sy = x * fx + z * fz; // · forward
  return Math.atan2(sx, sy);
}

/** World direction of a screen-space move (x right, y up) for a camera at `yaw`. */
function toWorld(mx: number, my: number, yaw: number, out: { x: number; z: number }): void {
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  out.x = -fz * mx + fx * my;
  out.z = fx * mx + fz * my;
}

export interface CompareResult {
  hero: string;
  seed: number;
  time: number;
  won: boolean;
  damage: number;
  /** Damage taken by kind: contact, shots, explosions, hazards, boss attacks. */
  byKind: number[];
}

const KINDS = [SrcKind.Contact, SrcKind.Shot, SrcKind.Explosion, SrcKind.Hazard, SrcKind.Boss];
const KIND_NAMES = ['contact', 'shots', 'blasts', 'hazards', 'boss'];

/** One run with the bot steering through `mode`. */
export function controlledRun(opts: { characterId: string; seed: number; mode: Mode; skill: number; map: MapId; difficulty: DifficultyId; thumb: Thumb; maxSeconds?: number; onTick?: (w: World, yaw: number) => void }): CompareResult {
  const w = newRun({ seed: opts.seed, characterId: opts.characterId, map: opts.map, difficulty: opts.difficulty });
  const bot = new Bot(opts.seed, opts.skill, true);
  const wish = emptyInput();
  const input = emptyInput();
  const cam = TUNING_DEFAULTS.camera;
  const steer = new TouchSteer();
  const reading = stickReading();
  const wv = { x: 0, z: 0 };
  let yaw = 0;
  // the thumb: what it holds (screen angle, or none), what it last aimed at, a pending re-aim
  let held: number | null = null;
  let aimed = 0;
  let pendingAt = -1;
  const maxT = opts.maxSeconds ?? 20 * 60 + 5;
  const { mode, thumb } = opts;
  while (w.time < maxT) {
    if (w.state === 'levelup') {
      resolveLevelUp(w, bot.chooseUpgrade(w));
      continue;
    }
    if (w.state === 'chest') {
      closeChest(w);
      continue;
    }
    if (w.state !== 'playing') break;
    bot.decide(w, wish);
    input.jump = wish.jump;
    input.slide = wish.slide;
    input.autoHop = false;
    if (mode === 'ideal') {
      input.moveX = wish.moveX;
      input.moveZ = wish.moveZ;
    } else {
      const wantMove = Math.hypot(wish.moveX, wish.moveZ) > 0.05;
      const wishAng = Math.atan2(wish.moveX, wish.moveZ);
      const readYaw = mode === 'touch-lock' ? steer.yaw(yaw) : yaw;
      // where the held thumb is sending Thea right now
      let drift = 0;
      if (held !== null && wantMove) {
        toWorld(Math.sin(held), Math.cos(held), readYaw, wv);
        drift = Math.abs(wrap(Math.atan2(wv.x, wv.z) - wishAng));
      }
      const needAim = wantMove !== (held !== null) || (wantMove && (Math.abs(wrap(wishAng - aimed)) > thumb.aimTol || drift > thumb.driftTol));
      if (needAim && pendingAt < 0) pendingAt = w.time + thumb.reaction;
      if (pendingAt >= 0 && w.time >= pendingAt) {
        pendingAt = -1;
        held = wantMove ? screenAngle(wish.moveX, wish.moveZ, yaw) : null;
        aimed = wishAng;
      }
      let mx = 0;
      let my = 0;
      if (held !== null) {
        if (mode === 'keyboard') {
          const q = Math.round(held / (Math.PI / 4)) * (Math.PI / 4);
          mx = Math.round(Math.sin(q));
          my = Math.round(Math.cos(q));
          const l = Math.hypot(mx, my);
          mx /= l;
          my /= l;
        } else {
          // the thumb pushes to 95% of the travel (full speed past STICK_FULL)
          stickResponse(Math.sin(held) * 0.95 * 50, -Math.cos(held) * 0.95 * 50, 50, reading);
          mx = reading.x;
          my = reading.y;
        }
      }
      if (mode === 'touch-lock') steer.thumb(held !== null, held ?? 0);
      if (mode === 'touch-on' || mode === 'touch-lock' || mode === 'touch-slow') {
        const fwd = held === null ? 1 : Math.max(0, Math.cos(held));
        const turn = autoCameraTurn(yaw, w.player.vx, w.player.vz, DT, cam, mode === 'touch-slow' ? fwd * fwd : 1);
        yaw += turn;
        steer.autoTurned(turn, mode === 'touch-lock', held !== null);
      }
      toWorld(mx, my, mode === 'touch-lock' ? steer.yaw(yaw) : yaw, wv);
      input.moveX = wv.x;
      input.moveZ = wv.z;
    }
    step(w, input);
    w.events.clear();
    opts.onTick?.(w, yaw);
  }
  const byKind = KINDS.map((k) => {
    let sum = 0;
    for (let i = k << 8; i < (k + 1) << 8; i++) sum += w.stats.damageBy[i] ?? 0;
    return Math.round(sum);
  });
  return { hero: opts.characterId, seed: opts.seed, time: w.time, won: w.state === 'won', damage: Math.round(w.stats.damageTaken), byKind };
}

/**
 * The circling check: from a run's start, the thumb holds one diagonal (up-right) for 8 s and
 * never corrects. How far does Thea's heading turn, and how far from the start does she get?
 */
function circle(mode: Mode): { turnDeg: number; dist: number } {
  const w = newRun({ seed: 4242, characterId: 'thea', map: 'meadow', difficulty: 'relaxed', god: true });
  const steer = new TouchSteer();
  const reading = stickReading();
  const input = emptyInput();
  const wv = { x: 0, z: 0 };
  const held = 45 * DEG;
  let yaw = 0;
  let first: number | null = null;
  let turned = 0;
  let prev = 0;
  const x0 = w.player.x;
  const z0 = w.player.z;
  for (let k = 0; k < 8 * 60 && w.state === 'playing'; k++) {
    stickResponse(Math.sin(held) * 47.5, -Math.cos(held) * 47.5, 50, reading);
    if (mode === 'touch-lock') steer.thumb(true, held);
    if (mode !== 'touch-off' && mode !== 'keyboard') {
      const turn = autoCameraTurn(yaw, w.player.vx, w.player.vz, DT, TUNING_DEFAULTS.camera, mode === 'touch-slow' ? Math.cos(held) ** 2 : 1);
      yaw += turn;
      steer.autoTurned(turn, mode === 'touch-lock', true);
    }
    toWorld(reading.x, reading.y, mode === 'touch-lock' ? steer.yaw(yaw) : yaw, wv);
    input.moveX = wv.x;
    input.moveZ = wv.z;
    step(w, input);
    w.events.clear();
    if ((w.state as World['state']) === 'levelup') resolveLevelUp(w, null);
    const sp = Math.hypot(w.player.vx, w.player.vz);
    if (sp > 1) {
      const h = Math.atan2(w.player.vx, w.player.vz);
      if (first === null) first = h;
      else turned += wrap(h - prev);
      prev = h;
    }
  }
  return { turnDeg: Math.abs(turned) / DEG, dist: Math.hypot(w.player.x - x0, w.player.z - z0) };
}

// ───────────────────────────── CLI ─────────────────────────────

const argv = process.argv.slice(2);
const opt = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const v = argv[i + 1];
  argv.splice(i, 2);
  return v;
};
const flag = (name: string): boolean => {
  const i = argv.indexOf(name);
  if (i >= 0) argv.splice(i, 1);
  return i >= 0;
};
const mapArg = opt('--map') ?? 'meadow';
const diffArg = opt('--difficulty') ?? 'relaxed';
const only = opt('--mode') as Mode | undefined;
const modesArg = opt('--modes');
const casual = flag('--casual');
const json = flag('--json');
const circleOnly = flag('--circle');
if (!isMapId(mapArg)) throw new Error(`unknown map ${mapArg}`);
if (!isDifficultyId(diffArg)) throw new Error(`unknown difficulty ${diffArg}`);
const seeds = Number(argv[0] ?? 12);
const skill = Number(argv[1] ?? 0.7);
const thumb = casual ? CASUAL : ATTENTIVE;

if (circleOnly) {
  console.log('Holding the stick up-right for 8 s, never correcting (Thea, Meadow start):');
  for (const m of ['touch-off', 'touch-on', 'touch-lock', 'touch-slow'] as const) {
    const r = circle(m);
    console.log(`  ${m.padEnd(10)} heading turned ${r.turnDeg.toFixed(0).padStart(4)}°, ended ${r.dist.toFixed(1)} m from the start`);
  }
} else if (only) {
  // one scheme (a child process of the driver below)
  const res: CompareResult[] = [];
  for (const c of CHARACTERS) for (let s = 0; s < seeds; s++) res.push(controlledRun({ characterId: c.id, seed: 1000 + s * 7919, mode: only, skill, map: mapArg, difficulty: diffArg, thumb }));
  console.log(`JSON ${JSON.stringify(res)}`);
} else {
  const modes = (modesArg ? modesArg.split(',') : [...MODES]) as Mode[];
  const t0 = performance.now();
  console.log(`Touch vs keyboard — ${mapArg}, ${diffArg}, ${CHARACTERS.length} heroes × ${seeds} seeds, bot skill ${skill}, ${casual ? 'casual' : 'attentive'} thumb\n`);
  const runs = await Promise.all(
    modes.map(
      (m) =>
        new Promise<[Mode, CompareResult[]]>((resolve, reject) => {
          const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/touch-compare.ts', String(seeds), String(skill), '--map', mapArg, '--difficulty', diffArg, '--mode', m, ...(casual ? ['--casual'] : [])], { stdio: ['ignore', 'pipe', 'inherit'] });
          let out = '';
          child.stdout.on('data', (d) => (out += d));
          child.on('close', (code) => {
            const line = out.split('\n').find((l) => l.startsWith('JSON '));
            if (code !== 0 || !line) reject(new Error(`${m} failed (${code})`));
            else resolve([m, JSON.parse(line.slice(5)) as CompareResult[]]);
          });
        }),
    ),
  );
  const summary: Record<string, { avg: number; se: number; median: number; wins: number; n: number; damage: number; byHero: Record<string, number>; diff: number; diffSe: number }> = {};
  const baseRuns = (runs.find(([m]) => m === 'keyboard') ?? runs[0])[1];
  const meanSe = (v: number[]): [number, number] => {
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, v.length - 1));
    return [mean, sd / Math.sqrt(v.length)];
  };
  for (const [m, res] of runs) {
    const times = res.map((r) => r.time).sort((a, b) => a - b);
    // paired with the keyboard run of the same hero and seed
    const [diff, diffSe] = meanSe(res.map((r, k) => r.time - baseRuns[k].time));
    const byHero: Record<string, number> = {};
    for (const c of CHARACTERS) {
      const h = res.filter((r) => r.hero === c.id);
      byHero[c.id] = h.reduce((a, r) => a + r.time, 0) / h.length;
    }
    const [avg, se] = meanSe(times);
    summary[m] = { avg, se, median: times[times.length >> 1], wins: res.filter((r) => r.won).length, n: res.length, damage: res.reduce((a, r) => a + r.damage, 0) / res.length, byHero, diff, diffSe };
  }
  const signed = (d: number): string => `${d >= 0 ? '+' : '−'}${formatTime(Math.abs(d))}`;
  console.log(`${'scheme'.padEnd(11)} ${'avg ± se'.padStart(13)} ${'median'.padStart(7)} ${'wins'.padStart(7)} ${'dmg'.padStart(6)}  ${'vs keyboard (paired)'.padStart(20)}   ${CHARACTERS.map((c) => c.id.padStart(7)).join('')}`);
  for (const m of modes) {
    const s = summary[m];
    console.log(
      `${m.padEnd(11)} ${`${formatTime(s.avg)} ± ${formatTime(s.se)}`.padStart(13)} ${formatTime(s.median).padStart(7)} ${`${s.wins}/${s.n}`.padStart(7)} ${s.damage.toFixed(0).padStart(6)}  ${`${signed(s.diff)} ± ${formatTime(s.diffSe)}`.padStart(20)}   ${CHARACTERS.map((c) => formatTime(s.byHero[c.id]).padStart(7)).join('')}`,
    );
  }
  console.log(`\ndamage taken per run, by kind (${KIND_NAMES.join(' / ')}):`);
  for (const [m, res] of runs) console.log(`  ${m.padEnd(11)} ${KIND_NAMES.map((_, k) => (res.reduce((a, r) => a + r.byKind[k], 0) / res.length).toFixed(0).padStart(6)).join(' ')}`);
  if (json) console.log(`JSON ${JSON.stringify({ map: mapArg, difficulty: diffArg, seeds, skill, thumb: casual ? 'casual' : 'attentive', summary })}`);
  console.log(`\n(${((performance.now() - t0) / 1000).toFixed(1)} s)`);
}
