import type { ItemId, KartConfig, Stats } from '../data/types';
import { makeGroundHit, type GroundHint, type GroundHit } from './ground';
import type { KartParams } from './tuning';

export interface KartInput {
  /** -1 (left) .. 1 (right) */
  steer: number;
  /** -1 (brake/reverse) .. 1 (accelerate) */
  throttle: number;
  drift: boolean;
  item: boolean;
  /** Hold to throw/drop items behind (stick/keys pulled back). */
  aimBack: boolean;
  lookBack: boolean;
}

export function makeInput(): KartInput {
  return { steer: 0, throttle: 0, drift: false, item: false, aimBack: false, lookBack: false };
}

export enum RespawnState {
  None = 0,
  Falling = 1,
  Carried = 2,
}

/** Per-race counters used by challenges and results. */
export interface KartRaceStats {
  longestDrift: number;
  driftTotal: number;
  miniTurbos: [number, number, number];
  tricks: number;
  itemHits: number;
  itemHitsByItem: Partial<Record<ItemId, number>>;
  timesHit: number;
  dodges: number;
  shortcuts: number;
  perfectStart: boolean;
  boostPads: number;
  itemsUsed: number;
  falls: number;
  worstPosition: number;
  ledWholeRace: boolean;
  balloonsPopped: number;
}

export function makeRaceStats(): KartRaceStats {
  return {
    longestDrift: 0,
    driftTotal: 0,
    miniTurbos: [0, 0, 0],
    tricks: 0,
    itemHits: 0,
    itemHitsByItem: {},
    timesHit: 0,
    dodges: 0,
    shortcuts: 0,
    perfectStart: false,
    boostPads: 0,
    itemsUsed: 0,
    falls: 0,
    worstPosition: 1,
    ledWholeRace: true,
    balloonsPopped: 0,
  };
}

/** Full simulation state of one kart. Plain data + numbers; rendering reads it. */
export class Kart {
  // identity
  readonly index: number;
  racerId: string;
  kart: KartConfig;
  stats: Stats;
  params: KartParams;
  /** Local player index (0/1) or -1 for AI. */
  player: number;
  name: string;

  // transform (current and previous step, for interpolation)
  x = 0;
  y = 0;
  z = 0;
  yaw = 0;
  px = 0;
  py = 0;
  pz = 0;
  pyaw = 0;
  vx = 0;
  vy = 0;
  vz = 0;
  /** Signed forward speed (m/s). */
  speed = 0;
  /** Lateral (sideways) speed, + = sliding right. */
  slip = 0;
  grounded = true;
  airTime = 0;
  /** Smoothed ground normal (for visuals and slope physics). */
  nx = 0;
  ny = 1;
  nz = 0;
  lastGroundY = 0;
  voidTime = 0;
  readonly hint: GroundHint = { ribbon: 0, sample: 0 };
  readonly ground: GroundHit = makeGroundHit();

  // drifting
  drifting = false;
  driftDir = 0;
  driftCharge = 0;
  driftTier = 0;
  driftTime = 0;
  hopTime = 0;
  /** Steering sign captured while hopping, to start a drift on landing. */
  hopSteer = 0;

  // boosts / air
  boostTime = 0;
  boostMax = 1;
  launched = false;
  trickWindow = 0;
  trickQueued = false;
  trickAnim = 0;
  gliding = false;
  onRamp = 0;
  /** Seconds since the last boost started (for camera FOV kick). */
  boostKick = 0;

  // status effects (seconds remaining)
  spinTime = 0;
  tumbleTime = 0;
  gooTime = 0;
  shieldTime = 0;
  cloudTime = 0;
  rocketTime = 0;
  magnetTime = 0;
  magnetTarget = -1;
  invulnTime = 0;
  /** Squash-and-stretch visual timer after bumps. */
  wobble = 0;

  // respawn
  respawnState: RespawnState = RespawnState.None;
  respawnTimer = 0;
  /** Ground height at the respawn point (drone lowers the kart onto it). */
  respawnGroundY = 0;

  // race progress
  /** Continuous distance travelled along the lap (laps * length + s). */
  progress = 0;
  lastS = 0;
  lapsDone = 0;
  lapStart = 0;
  lapTimes: number[] = [];
  bestLap = Infinity;
  finished = false;
  finishTime = 0;
  rank = 1;
  wrongWayTime = 0;
  /** Last safe main-track s (for respawn). */
  safeS = 0;
  offroad = false;
  /** Current ribbon (0 main, >0 shortcut). */
  ribbon = 0;
  /** Shortcut ribbon most recently entered (for stats). */
  ribbonEntered = 0;
  /** Finish time was projected (race ended before this kart crossed the line). */
  projected = false;

  // items
  item: ItemId | null = null;
  itemUses = 0;
  rouletteTime = 0;
  /** Holding the current item behind the kart as a shield. */
  trailing = false;
  itemHeld = false;
  /** Countdown start timing: time throttle was first pressed during countdown. */
  startPress = -1;

  // battle
  balloons = 3;
  score = 0;

  // controls
  readonly input: KartInput = makeInput();
  prevDrift = false;
  prevItem = false;
  /** Steering assist (smart steering) for this kart. */
  assist = false;
  autoAccel = false;

  raceStats: KartRaceStats = makeRaceStats();

  constructor(index: number, racerId: string, kart: KartConfig, stats: Stats, params: KartParams, player: number, name: string) {
    this.index = index;
    this.racerId = racerId;
    this.kart = kart;
    this.stats = stats;
    this.params = params;
    this.player = player;
    this.name = name;
  }

  get isPlayer(): boolean {
    return this.player >= 0;
  }

  /** Can be controlled (not spinning, respawning, or rocket-driving). */
  get controllable(): boolean {
    return this.spinTime <= 0 && this.tumbleTime <= 0 && this.respawnState === RespawnState.None && this.rocketTime <= 0;
  }

  get boosting(): boolean {
    return this.boostTime > 0 || this.rocketTime > 0;
  }

  /** Can currently be hurt by an item. */
  get vulnerable(): boolean {
    return this.invulnTime <= 0 && this.shieldTime <= 0 && this.rocketTime <= 0 && this.respawnState === RespawnState.None;
  }

  savePrev(): void {
    this.px = this.x;
    this.py = this.y;
    this.pz = this.z;
    this.pyaw = this.yaw;
  }

  place(x: number, y: number, z: number, yaw: number): void {
    this.x = this.px = x;
    this.y = this.py = y;
    this.z = this.pz = z;
    this.yaw = this.pyaw = yaw;
    this.vx = this.vy = this.vz = 0;
    this.speed = 0;
    this.slip = 0;
    this.grounded = true;
    this.airTime = 0;
    this.lastGroundY = y;
  }

  startBoost(seconds: number): void {
    if (seconds > this.boostTime) {
      this.boostTime = seconds;
      this.boostMax = seconds;
    }
    this.boostKick = 0;
  }

  cancelDrift(): void {
    this.drifting = false;
    this.driftDir = 0;
    this.driftCharge = 0;
    this.driftTier = 0;
    this.driftTime = 0;
  }
}
