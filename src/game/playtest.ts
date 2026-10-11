// Builds anonymous playtest records from finished (or abandoned) races. See src/save/playtest.ts for storage.
import { findRacer } from '../data/racers';
import type { InputManager, InputSource } from '../input/manager';
import type { PlaytestInput, PlaytestPlayer, PlaytestRecord } from '../save/playtest';
import type { Settings } from '../save/save';
import type { Kart } from '../sim/kart';
import type { AssistLevel } from '../tuning/balance';
import type { RaceSession } from './session';

export const BUILD_VERSION: string = typeof __CALEX_VERSION__ === 'string' ? __CALEX_VERSION__ : 'dev';

function inputFor(source: InputSource, input: InputManager, settings: Settings): PlaytestInput {
  switch (source.kind) {
    case 'keyboard':
      return 'keyboard';
    case 'gamepad':
    case 'combo':
      return 'gamepad';
    case 'touch':
      return settings.touchSteer === 'tilt' ? 'tilt' : 'touch';
    default:
      return input.lastDevice === 'touch' ? (settings.touchSteer === 'tilt' ? 'tilt' : 'touch') : input.lastDevice;
  }
}

const START = ['none', 'boost', 'perfect'] as const;

function player(k: Kart, source: InputSource, input: InputManager, settings: Settings, total: number, quit: boolean): PlaytestPlayer {
  const s = k.raceStats;
  const assist: AssistLevel = k.assistLevel;
  return {
    racer: k.racerId,
    weight: findRacer(k.racerId).weight,
    body: k.kart.body,
    wheels: k.kart.wheels,
    glider: k.kart.glider,
    input: inputFor(source, input, settings),
    assist,
    autoAccel: k.autoAccel,
    pos: k.rank,
    of: total,
    time: quit || !k.finished ? -1 : +k.finishTime.toFixed(3),
    projected: k.projected,
    laps: k.lapTimes.map((t) => +t.toFixed(3)),
    falls: s.falls,
    drift: +s.driftTotal.toFixed(2),
    mt: [s.miniTurbos[0], s.miniTurbos[1], s.miniTurbos[2]],
    items: s.itemsUsed,
    hitsTaken: s.timesHit,
    hitsGiven: s.itemHits,
    dodges: s.dodges,
    shortcuts: s.shortcutsById.slice(),
    start: s.startResult < 0 ? 'early' : START[s.startResult] ?? 'none',
    tricks: s.tricks,
    pads: s.boostPads,
    walls: s.wallHits,
    offroad: +s.offroadTime.toFixed(2),
    score: k.score,
  };
}

/** One record for a session (all local players). `quit` = the race was left before the results. */
export function buildPlaytestRecord(
  session: RaceSession,
  ctx: { input: InputManager; settings: Settings; fps: number; tier: string; touchDevice: boolean },
  quit: boolean,
): Omit<PlaytestRecord, 'n'> {
  const cfg = session.cfg;
  const w = session.world;
  return {
    build: BUILD_VERSION,
    mode: cfg.mode,
    track: cfg.trackId ?? cfg.arenaId ?? 'custom',
    cls: cfg.speedClass,
    mirror: cfg.mirror,
    laps: cfg.laps,
    items: cfg.items,
    itemSet: cfg.itemSet,
    ai: cfg.ai.length,
    quit,
    dur: +w.raceTime.toFixed(2),
    fps: Math.round(ctx.fps),
    tier: ctx.tier,
    touchDevice: ctx.touchDevice,
    p: session.locals.map((i) => player(w.karts[i], cfg.players[i].source, ctx.input, ctx.settings, w.karts.length, quit)),
  };
}
