import type { KartConfig, SpeedClass } from '../data/types';
import type { ItemSet } from '../data/items';
import { findTrack } from '../data/tracks/index';
import { findArena } from '../data/arenas';
import { World } from '../sim/world';
import { TrackModel } from '../sim/track/trackModel';
import { ArenaModel } from '../sim/arena';
import { RaceTracker } from '../sim/race';
import { AiController } from '../sim/ai/aiController';
import { BattleAi } from '../sim/ai/battleDriver';
import { ItemSystem } from '../sim/items/itemSystem';
import { HazardSystem } from '../sim/hazards';
import { BattleRules } from '../sim/battle';
import { CoinRushRules, COIN_RUSH_TIME, type ArenaRules } from '../sim/coinRush';
import { RespawnState, type KartRaceStats } from '../sim/kart';
import type { SimEvent } from '../sim/events';
import { GhostRecorder, GF_BOOST, GF_DRIFT, GF_DRIFT_LEFT, GF_GLIDE, GF_AIR, type GhostData } from '../sim/ghost';
import { RaceView, type SplitMode } from '../render/raceView';
import { GhostVisual } from '../render/ghostVisual';
import type { GameRenderer } from '../render/renderer';
import type { InputManager, InputSource } from '../input/manager';
import { Hud } from '../ui/hud';
import type { GameAudio } from '../audio/types';
import type { Settings } from '../save/save';
import { formatTime } from '../core/math';
import { resolveAssist } from '../tuning/balance';
import { ReplayPlayer, ReplayRecorder } from './replay';
import { LessonSim } from '../sim/school';
import { findLesson } from '../data/school';

export type GameMode = 'grandPrix' | 'timeTrial' | 'versus' | 'battle' | 'school';

export interface PlayerSlot {
  racerId: string;
  kart: KartConfig;
  source: InputSource;
}

export interface AiSlot {
  racerId: string;
  kart: KartConfig;
  skillBonus?: number;
}

export interface SessionConfig {
  mode: GameMode;
  trackId?: string;
  /** Dev: race on an in-memory track (track editor test laps). */
  trackData?: import('../data/types').TrackData;
  arenaId?: string;
  speedClass: SpeedClass;
  mirror: boolean;
  items: boolean;
  itemSet: ItemSet;
  laps: number;
  players: PlayerSlot[];
  ai: AiSlot[];
  /** Kart indices from pole position backwards (players are indices 0..P-1, then AI). */
  gridOrder?: number[];
  seed: number;
  ghost?: { data: GhostData; racerId: string; kart: KartConfig } | null;
  staffGhost?: { data: GhostData; racerId: string; kart: KartConfig } | null;
  battleTime?: number;
  /** Arena rules: balloon battle (default) or Coin Rush. */
  battleRule?: 'balloons' | 'coins';
  /** Driving School lesson (mode 'school'). */
  lesson?: import('../data/school').LessonId;
  /** Performance test run: nothing is recorded (no progress, playtest log or ghosts). */
  benchmark?: boolean;
  intro?: boolean;
}

export interface RacerResult {
  index: number;
  racerId: string;
  name: string;
  player: number;
  rank: number;
  finishTime: number;
  bestLap: number;
  lapTimes: number[];
  projected: boolean;
  score: number;
  stats: KartRaceStats;
}

export interface SessionResult {
  config: SessionConfig;
  results: RacerResult[];
  /** Time Trial: encoded ghost of player 1's run. */
  ghost?: string;
  /** Driving School result. */
  lesson?: { id: import('../data/school').LessonId; score: number; medal: import('../data/school').LessonMedal | null };
}

export interface SessionContext {
  gr: GameRenderer;
  input: InputManager;
  audio: GameAudio;
  uiRoot: HTMLElement;
  settings: Settings;
}

/**
 * One race or battle from grid to results. Owns the sim world, its subsystems, the 3D view and HUDs.
 * The App drives it with step()/render() from the fixed-step loop.
 */
export class RaceSession {
  readonly world: World;
  readonly track: TrackModel | null;
  readonly arena: ArenaModel | null;
  readonly race: RaceTracker | null;
  readonly battle: ArenaRules | null;
  /** Set in Coin Rush (same object as `battle`). */
  readonly coinRush: CoinRushRules | null = null;
  readonly ai: AiController | null;
  readonly items: ItemSystem | null;
  readonly view: RaceView;
  readonly huds: Hud[] = [];
  readonly locals: number[];
  private readonly hazards: HazardSystem | null;
  private readonly recorder: GhostRecorder | null;
  private readonly ghostVisuals: GhostVisual[] = [];
  private finishedAt = -1;
  private done = false;
  private finalLapAnnounced = new Set<number>();
  private introAngle = 0;
  private readonly hudLayer: HTMLDivElement;
  onComplete?: (r: SessionResult) => void;
  time = 0;
  /** Hit-stop: the world holds still for a few frames when a local player hits or gets hit. */
  private freeze = 0;
  /** Instant replay: recorded during the race (memory only), played back from the results screen. */
  replayRec: ReplayRecorder | null = null;
  /** Driving School rules (mode 'school'). */
  lessonSim: LessonSim | null = null;
  private lessonEl: HTMLDivElement | null = null;
  replay: ReplayPlayer | null = null;
  private readonly replayEvents: SimEvent[] = [];
  private blurLevel = 0;

  /** Hide the HUD and touch controls while a full screen (e.g. benchmark results) sits on top of the race. */
  hideHud(): void {
    this.hudLayer.style.display = 'none';
    this.ctx.input.touch.show(false);
    this.ctx.input.inRace = false;
  }

  /** True once the results have been produced (the race/battle is over). */
  get completed(): boolean {
    return this.done;
  }

  constructor(
    readonly ctx: SessionContext,
    readonly cfg: SessionConfig,
  ) {
    const isBattle = cfg.mode === 'battle';
    this.track = isBattle ? null : new TrackModel(cfg.trackData ?? findTrack(cfg.trackId ?? ''), cfg.mirror);
    this.arena = isBattle ? new ArenaModel(findArena(cfg.arenaId ?? '')) : null;
    const ground = this.track ?? this.arena!;
    const racers = [
      ...cfg.players.map((p, i) => ({ racerId: p.racerId, kart: p.kart, player: i })),
      ...cfg.ai.map((a) => ({ racerId: a.racerId, kart: a.kart, player: -1 })),
    ];
    this.world = new World({
      ground,
      speedClass: cfg.speedClass,
      seed: cfg.seed,
      racers,
      introTime: cfg.intro === false ? 0 : 3.2,
      countdownTime: 3,
    });
    this.locals = cfg.players.map((_, i) => i);
    for (const i of this.locals) {
      const k = this.world.karts[i];
      const src = cfg.players[i].source;
      const device = src.kind === 'touch' ? 'touch' : src.kind === 'keyboard' ? 'keyboard' : src.kind === 'any' ? ctx.input.lastDevice : 'gamepad';
      k.assistLevel = resolveAssist(ctx.settings.assist, device);
      k.autoAccel = ctx.settings.autoAccel || cfg.players[i].source.kind === 'touch';
    }
    // --- subsystems
    if (this.track) {
      this.race = new RaceTracker(this.world, this.track, cfg.laps);
      const order = cfg.gridOrder ?? racers.map((_, i) => i);
      this.race.placeGrid(order);
      const bonus: Record<number, number> = {};
      cfg.ai.forEach((a, i) => {
        if (a.skillBonus) bonus[cfg.players.length + i] = a.skillBonus;
      });
      this.ai = new AiController(this.world, this.track, { skillBonus: bonus, noRubberBand: cfg.mode === 'timeTrial' || cfg.mode === 'school' });
      this.battle = null;
    } else {
      this.race = null;
      this.ai = null;
      this.battle = null;
    }
    const wantItems = cfg.items || cfg.mode === 'timeTrial' || isBattle;
    if (wantItems) {
      const boxes = this.arena
        ? this.arena.data.itemBoxes.map((b) => ({ x: b.x, y: (b.y ?? 0) + 1.1, z: b.z }))
        : cfg.mode === 'timeTrial' || cfg.mode === 'school'
          ? []
          : undefined;
      this.items = new ItemSystem(this.world, ground, this.track, { set: cfg.itemSet, battle: isBattle, boxes });
      this.ai?.attachItems(this.items);
    } else this.items = null;
    if (cfg.mode === 'timeTrial' && this.items) for (const i of this.locals) this.items.give(this.world.karts[i], 'turbo3');
    this.hazards = this.track && (this.track.data.hazards?.length ?? 0) > 0 ? new HazardSystem(this.world, this.track, this.items?.hazards ?? this.ai?.hazards) : null;
    if (isBattle && this.arena && this.items) {
      const coins = cfg.battleRule === 'coins';
      const rules = coins ? new CoinRushRules(this.world, this.arena, this.items, cfg.battleTime ?? COIN_RUSH_TIME) : new BattleRules(this.world, this.arena, this.items, cfg.battleTime ?? 150);
      rules.placeStart();
      (this as { battle: ArenaRules | null }).battle = rules;
      if (coins) (this as { coinRush: CoinRushRules | null }).coinRush = rules as CoinRushRules;
      new BattleAi(this.world, this.arena, this.items, coins ? (rules as CoinRushRules).coins : null);
    }
    this.recorder = cfg.mode === 'timeTrial' ? new GhostRecorder() : null;
    if (cfg.lesson && this.track && this.race) this.lessonSim = new LessonSim(findLesson(cfg.lesson), this.world, this.track, this.race, this.items);
    if (!cfg.benchmark && !cfg.trackData) this.replayRec = new ReplayRecorder(this.world, this.items);

    // --- presentation
    ctx.gr.quality.setSplitScreen(this.locals.length > 1);
    ctx.gr.applyQuality();
    this.view = new RaceView(ctx.gr, this.world, { track: this.track ?? undefined, arena: this.arena ?? undefined }, this.locals);
    this.view.split = ctx.settings.splitMode as SplitMode;
    this.view.setFeel(ctx.settings.screenShake, ctx.settings.reduceEffects);
    for (const c of this.view.cams) c.distanceSetting = ctx.settings.cameraDistance;
    if (this.items) this.view.attachItems(this.items);
    if (this.hazards) this.view.attachHazards(this.hazards);
    if (isBattle && !this.coinRush) this.view.enableBalloons();
    if (this.coinRush) this.view.attachCoins(this.coinRush);
    const tints = [0x9fe3ff, 0xffd23f];
    [cfg.ghost, cfg.staffGhost].forEach((g, i) => {
      if (!g) return;
      const gv = new GhostVisual(g.data, g.racerId, g.kart, tints[i]);
      this.view.scene.add(gv.visual.root);
      this.ghostVisuals.push(gv);
    });
    this.hudLayer = document.createElement('div');
    this.hudLayer.className = 'hud-layer';
    ctx.uiRoot.appendChild(this.hudLayer);
    const hudMode = isBattle ? 'battle' : cfg.mode === 'timeTrial' || cfg.mode === 'school' ? 'timeTrial' : 'race';
    const touchHud = ctx.gr.isTouch && this.locals.length === 1;
    for (let i = 0; i < this.locals.length; i++) {
      const h = new Hud(this.hudLayer, hudMode, i, { track: this.track ?? undefined, arena: this.arena ?? undefined }, cfg.mirror, this.locals.length > 1, touchHud, ctx.settings.hudSize ?? 1, ctx.settings.touch?.leftHanded ?? false);
      h.setRect(this.view.rectFor(i, this.locals.length));
      if (this.coinRush) h.setCoinMode();
      if (cfg.lesson) h.hideLaps();
      this.huds.push(h);
    }
    if (this.lessonSim) {
      this.lessonEl = document.createElement('div');
      this.lessonEl.className = 'lesson-status';
      this.hudLayer.appendChild(this.lessonEl);
      this.view.attachLesson(this.lessonSim);
    }
    // input routing
    ctx.input.players = cfg.players.map((p) => p.source);
    ctx.input.inRace = true;
    const touchUsed = cfg.players.some((p) => p.source.kind === 'touch' || (p.source.kind === 'any' && ctx.gr.isTouch));
    ctx.input.touch.setMode(ctx.settings.touchSteer);
    ctx.input.touch.setAutoAccel(ctx.settings.autoAccel || ctx.gr.isTouch);
    ctx.input.touch.show(touchUsed && this.locals.length === 1);
    // the look-back button makes room for a bigger item box (Settings → HUD size)
    ctx.uiRoot.style.setProperty('--hud-scale', String(ctx.settings.hudSize ?? 1));
    const music = this.track ? this.track.data.music : this.arena!.data.music;
    ctx.audio.playMusic(music);
    ctx.audio.setFinalLap(false);
  }

  get courseName(): string {
    return this.track ? this.track.data.name : this.arena!.data.name;
  }

  /** Skip the intro flyover when anyone presses a button. */
  private checkSkip(): void {
    if (this.world.phase !== 'intro') return;
    for (let i = 0; i < this.locals.length; i++) if (this.ctx.input.anyGameButton(i) && this.world.phaseTime > -2.6) this.world.skipIntro();
  }

  step(dt: number): void {
    const w = this.world;
    this.time += dt;
    if (this.freeze > 0) {
      this.freeze -= dt;
      return;
    }
    this.checkSkip();
    // player input
    for (let i = 0; i < this.locals.length; i++) {
      const k = w.karts[this.locals[i]];
      if (k.finished && this.cfg.mode !== 'battle') continue; // AI autopilot drives after the finish
      this.ctx.input.fillKartInput(i, k.input, k.autoAccel, w.phase === 'race');
    }
    w.step(dt);
    this.replayRec?.step();
    // ghost recording (player 1)
    if (this.recorder && w.phase === 'race') {
      const k = w.karts[0];
      if (!k.finished) {
        let f = 0;
        if (k.drifting) f |= GF_DRIFT | (k.driftDir < 0 ? GF_DRIFT_LEFT : 0);
        if (k.gliding) f |= GF_GLIDE;
        if (k.boosting) f |= GF_BOOST;
        if (!k.grounded) f |= GF_AIR;
        this.recorder.record(w.raceTime, k.x, k.y, k.z, k.yaw, f);
      }
    }
    if (this.battle) this.battle.updateRanks();
    w.events.drain(this.onEvent);
    this.checkDone();
  }

  /** Freeze the world for `sec` (single player only, never in Time Trial or with Reduce effects). */
  private hitStop(sec: number): void {
    if (this.locals.length !== 1 || this.ctx.settings.reduceEffects || this.cfg.mode === 'timeTrial' || this.cfg.benchmark) return;
    if (this.freeze > 0) return;
    this.freeze = sec;
    // hold the interpolation still so nothing jitters while frozen
    for (const k of this.world.karts) {
      k.px = k.x;
      k.py = k.y;
      k.pz = k.z;
      k.pyaw = k.yaw;
    }
  }

  /** Haptics for local players (gamepad rumble / phone vibration). */
  private feel(kart: number, strong: number, weak: number, ms: number): void {
    const i = this.locals.indexOf(kart);
    if (i >= 0) this.ctx.input.rumble(i, strong, weak, ms);
  }

  /** Touch haptics stay short and few: drift tier up, being hit by an item, a big landing. */
  private buzz(kart: number, ms: number): void {
    const i = this.locals.indexOf(kart);
    if (i >= 0) this.ctx.input.buzz(i, ms);
  }

  private lastTier: number[] = [];

  private onEvent = (e: SimEvent): void => {
    this.replayRec?.event(e);
    this.view.onEvent(e);
    this.ctx.audio.onSimEvent(e, this.world, this.locals);
    const hudFor = (kart: number): Hud | null => {
      const i = this.locals.indexOf(kart);
      return i >= 0 ? this.huds[i] : null;
    };
    // ---- impact feel: hit-stop, camera kick, rumble
    switch (e.type) {
      case 'itemHit':
        if (e.effect !== 'goo' && e.effect !== 'cloud') this.buzz(e.kart, 40);
        if (this.locals.includes(e.kart)) {
          this.hitStop(0.085);
          this.view.kick(e.kart, e.effect === 'tumble' ? 0.9 : 0.65);
          this.feel(e.kart, e.effect === 'goo' || e.effect === 'cloud' ? 0.25 : 0.85, 0.5, e.effect === 'tumble' ? 380 : 260);
        } else if (e.by >= 0 && this.locals.includes(e.by)) {
          this.hitStop(0.06);
          this.feel(e.by, 0.2, 0.45, 110);
        }
        break;
      case 'wall':
        if (e.strength > 0.3) this.feel(e.kart, e.strength * 0.5, e.strength * 0.6, 90);
        break;
      case 'bump':
        this.feel(e.kart, 0.2 * e.strength, 0.4 * e.strength, 70);
        this.feel(e.other, 0.2 * e.strength, 0.4 * e.strength, 70);
        break;
      case 'land':
        if (e.impact > 9) this.buzz(e.kart, 25);
        if (e.impact > 9) {
          this.view.kick(e.kart, 0.25);
          this.feel(e.kart, 0.35, 0.25, 90);
        }
        break;
      case 'miniTurbo':
        this.feel(e.kart, 0.1 * e.tier, 0.25 + 0.15 * e.tier, 100 + 50 * e.tier);
        break;
      case 'boostPad':
        this.feel(e.kart, 0, 0.3, 110);
        break;
      case 'startBoost':
        if (e.good) this.feel(e.kart, 0.4, 0.4, 220);
        break;
      case 'fall':
        this.feel(e.kart, 0.5, 0.2, 220);
        break;
      case 'balloonPop':
        if (this.locals.includes(e.kart)) this.feel(e.kart, 0.6, 0.4, 200);
        break;
      default:
        break;
    }
    switch (e.type) {
      case 'go':
        break;
      case 'rank': {
        const h = hudFor(e.kart);
        if (h && this.world.raceTime > 2) h.positionPop(e.from, e.to);
        break;
      }
      case 'lap': {
        const h = hudFor(e.kart);
        if (h) {
          h.lapPop();
          if (e.final) h.banner('FINAL LAP!', 'final', 2.2);
          else if (this.cfg.mode === 'timeTrial') h.banner(`Lap ${formatTime(e.time)}`, 'info', 2);
        }
        if (e.final && this.locals.includes(e.kart) && !this.finalLapAnnounced.has(e.kart)) {
          this.finalLapAnnounced.add(e.kart);
          this.ctx.audio.setFinalLap(true);
        }
        break;
      }
      case 'finish': {
        const h = hudFor(e.kart);
        if (h) {
          h.banner(e.rank === 1 ? 'YOU WIN!' : 'FINISH!', e.rank === 1 ? 'gold' : 'big', 6);
          this.ai?.takeOver(this.world.karts[e.kart]);
        }
        break;
      }
      case 'startBoost': {
        const h = hudFor(e.kart);
        if (h && e.good) h.banner('ROCKET START!', 'gold', 1.2);
        break;
      }
      case 'lesson': {
        // Driving School: say what happened in words too (gates also change colour and sound)
        const h = this.huds[0];
        if (h && e.kind === 'miss') h.banner('✗ Missed a gate (+2 s)', 'warn', 1.4);
        else if (h && e.kind === 'gate') h.banner('✓ Gate!', 'info', 0.7);
        break;
      }
      case 'miniTurbo': {
        const h = hudFor(e.kart);
        if (h && e.tier === 3) h.banner('SUPER TURBO!', 'info', 0.8);
        break;
      }
      case 'trick': {
        const h = hudFor(e.kart);
        if (h) h.banner('TRICK!', 'info', 0.7);
        break;
      }
      case 'dodge': {
        const h = hudFor(e.kart);
        if (h) h.banner('NICE DODGE!', 'gold', 1.2);
        break;
      }
      case 'balloonPop': {
        const v = hudFor(e.kart);
        if (v) v.banner(e.left > 0 ? 'POP!' : 'Out of balloons — refilling!', 'warn', 1.2);
        const a = e.by >= 0 ? hudFor(e.by) : null;
        if (a && e.by !== e.kart) a.banner('+1 POP!', 'gold', 1);
        break;
      }
      case 'shortcut': {
        const h = hudFor(e.kart);
        if (h) h.banner('SHORTCUT!', 'info', 0.9);
        break;
      }
      case 'coinDrop': {
        const h = hudFor(e.kart);
        if (h) h.banner(`Dropped ${e.count} coin${e.count > 1 ? 's' : ''}!`, 'warn', 1);
        break;
      }
      case 'coinPickup': {
        const h = hudFor(e.kart);
        if (h) h.coinPop();
        break;
      }
      default:
        break;
    }
  };

  private checkDone(): void {
    if (this.done) return;
    const w = this.world;
    if (this.lessonSim) {
      if (this.lessonSim.done) {
        if (this.finishedAt < 0) {
          this.finishedAt = this.time;
          const m = this.lessonSim.medal;
          this.huds[0]?.banner(m ? `${m.toUpperCase()}!` : 'Lesson over', m === 'gold' ? 'gold' : 'big', 3);
        }
        if (this.time - this.finishedAt > 1.6) this.complete();
      }
      return;
    }
    const allLocalsFinished = this.locals.every((i) => w.karts[i].finished);
    if (w.phase === 'done' || allLocalsFinished) {
      if (this.finishedAt < 0) this.finishedAt = this.time;
      // let the celebration breathe, then end (projecting AI finishes)
      if (this.time - this.finishedAt > (this.cfg.mode === 'battle' ? 3 : 3.5)) {
        if (this.race && w.phase !== 'done') this.race.finishRemaining();
        this.complete();
      }
    }
    if (this.battle && w.phase === 'done' && this.finishedAt === this.time) {
      for (let i = 0; i < this.locals.length; i++) {
        const k = w.karts[this.locals[i]];
        this.huds[i].banner(k.rank === 1 ? 'YOU WIN!' : `${k.rank}${k.rank === 2 ? 'nd' : k.rank === 3 ? 'rd' : 'th'} place`, k.rank === 1 ? 'gold' : 'big', 4);
      }
    }
  }

  private complete(): void {
    this.done = true;
    const w = this.world;
    const results: RacerResult[] = w.karts
      .map((k) => ({
        index: k.index,
        racerId: k.racerId,
        name: k.name,
        player: k.player,
        rank: k.rank,
        finishTime: k.finishTime,
        bestLap: k.bestLap,
        lapTimes: [...k.lapTimes],
        projected: k.projected,
        score: k.score,
        stats: k.raceStats,
      }))
      .sort((a, b) => a.rank - b.rank);
    const out: SessionResult = { config: this.cfg, results };
    if (this.lessonSim) out.lesson = { id: this.lessonSim.lesson.id, score: this.lessonSim.score, medal: this.lessonSim.medal };
    if (this.recorder && w.karts[0].finished && !w.karts[0].projected) out.ghost = this.recorder.encode();
    this.ctx.audio.setFinalLap(false);
    this.hudLayer.style.display = 'none';
    this.ctx.input.touch.show(false);
    this.ctx.input.inRace = false;
    this.onComplete?.(out);
  }

  /** Watch the race again (after the results). `follow` = kart index to follow first. */
  startReplay(follow = this.locals[0]): ReplayPlayer | null {
    if (!this.replayRec || this.replayRec.frames < 2) return null;
    this.replay = new ReplayPlayer(this.replayRec, this.track, follow);
    this.replay.seek(0);
    this.view.soloView = true;
    this.hideHud();
    for (const g of this.ghostVisuals) g.visual.root.visible = false;
    return this.replay;
  }

  stopReplay(): void {
    this.replay = null;
    this.view.soloView = false;
    this.view.targets[0] = this.locals[0];
  }

  render(alpha: number, dt: number): void {
    const w = this.world;
    const rp = this.replay;
    if (rp) {
      rp.advance(dt, this.replayEvents);
      this.replayRec!.apply(rp.t, w, this.items);
      this.view.targets[0] = rp.follow;
      for (const e of this.replayEvents) {
        this.view.onEvent(e);
        this.ctx.audio.onSimEvent(e, w, [rp.follow]);
      }
      this.view.update(1, dt, [false]);
      if (rp.placeCamera(this.view.cams[0].camera, w, dt)) this.view.cams[0].snap();
      this.ctx.audio.update(w, [rp.follow], dt);
      this.ctx.gr.motionBlur = 0;
      this.view.render();
      return;
    }
    const lookBack = this.locals.map((i) => w.karts[i].input.lookBack && w.phase !== 'intro');
    this.view.update(alpha, dt, lookBack);
    if (w.phase === 'intro') {
      // fly around the grid while the racers line up
      this.introAngle += dt * 0.55;
      const k = w.karts[this.locals[0]];
      const t = Math.max(0, Math.min(1, (w.phaseTime + 3.2) / 3.2));
      for (const c of this.view.cams) c.orbit(k.x, k.y, k.z, 26 - t * 14, 9 - t * 5, k.yaw + Math.PI * 0.8 - t * Math.PI * 0.8 + this.introAngle * 0.1);
    }
    for (const g of this.ghostVisuals) g.update(Math.max(0, w.phase === 'race' ? w.raceTime : 0), dt, this.time);
    for (let i = 0; i < this.huds.length; i++) {
      const k = w.karts[this.locals[i]];
      this.huds[i].update(dt, {
        world: w,
        kart: k,
        race: this.race ?? undefined,
        laps: this.cfg.laps,
        timeLeft: this.battle?.timeLeft,
        ghostDelta: null,
        screenShake: this.ctx.settings.screenShake,
        showSpeedLines: this.ctx.gr.quality.profile.speedLines,
        reduceEffects: this.ctx.settings.reduceEffects,
      });
    }
    this.ctx.audio.update(w, this.locals, dt);
    this.ctx.input.touch.setCountdown(w.phase === 'countdown' || w.phase === 'intro');
    // drift tier up → a tiny tick on touch phones (the same moment the sparks change colour)
    for (const i of this.locals) {
      const k = w.karts[i];
      const tier = k.drifting ? k.driftTier : 0;
      if (tier > (this.lastTier[i] ?? 0)) this.buzz(i, 18);
      this.lastTier[i] = tier;
    }
    if (this.ctx.input.touch.shown) {
      // drift tier on the stick ring + the held item inside the ITEM glass (dirty-checked inside)
      const k = w.karts[this.locals[0]];
      this.ctx.input.touch.setRaceState(k.drifting ? k.driftTier : 0, k.item, k.rouletteTime > 0);
    }
    // speed blur (High tier only, one player, not with Reduce effects)
    let blur = 0;
    if (this.locals.length === 1 && !this.ctx.settings.reduceEffects && w.phase === 'race') {
      const k = w.karts[this.locals[0]];
      const f = k.speed / Math.max(1, k.params.topSpeed);
      blur = Math.min(1, Math.max(0, (f - 1.0) * 3) + (k.boosting ? 0.45 : 0) + (k.rocketTime > 0 ? 0.3 : 0));
    }
    this.blurLevel += (blur - this.blurLevel) * Math.min(1, dt * 6);
    this.ctx.gr.motionBlur = this.blurLevel;
    if (this.lessonSim && this.lessonEl) {
      const t = this.lessonSim.status;
      if (this.lessonEl.textContent !== t) this.lessonEl.textContent = t;
    }
    this.view.render();
  }

  /** True while the race is running (pause is allowed). */
  get active(): boolean {
    return !this.done;
  }

  get hidden(): boolean {
    return this.world.karts.some((k) => k.respawnState === RespawnState.Falling);
  }

  dispose(): void {
    this.ctx.gr.motionBlur = 0;
    this.ctx.input.inRace = false;
    this.ctx.input.touch.show(false);
    this.ctx.input.players = [{ kind: 'any' }];
    for (const h of this.huds) h.destroy();
    this.hudLayer.remove();
    this.view.dispose();
    this.ctx.gr.quality.setSplitScreen(false);
    this.ctx.gr.quality.adaptive = false;
  }
}
