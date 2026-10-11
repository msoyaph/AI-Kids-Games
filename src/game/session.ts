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

export type GameMode = 'grandPrix' | 'timeTrial' | 'versus' | 'battle';

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
  readonly battle: BattleRules | null;
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
      k.assist = ctx.settings.steeringAssist;
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
      this.ai = new AiController(this.world, this.track, { skillBonus: bonus, noRubberBand: cfg.mode === 'timeTrial' });
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
        : cfg.mode === 'timeTrial'
          ? []
          : undefined;
      this.items = new ItemSystem(this.world, ground, this.track, { set: cfg.itemSet, battle: isBattle, boxes });
      this.ai?.attachItems(this.items);
    } else this.items = null;
    if (cfg.mode === 'timeTrial' && this.items) for (const i of this.locals) this.items.give(this.world.karts[i], 'turbo3');
    this.hazards = this.track && (this.track.data.hazards?.length ?? 0) > 0 ? new HazardSystem(this.world, this.track, this.items?.hazards ?? this.ai?.hazards) : null;
    if (isBattle && this.arena && this.items) {
      const rules = new BattleRules(this.world, this.arena, this.items, cfg.battleTime ?? 150);
      rules.placeStart();
      (this as { battle: BattleRules | null }).battle = rules;
      new BattleAi(this.world, this.arena, this.items);
    }
    this.recorder = cfg.mode === 'timeTrial' ? new GhostRecorder() : null;

    // --- presentation
    ctx.gr.quality.setSplitScreen(this.locals.length > 1);
    ctx.gr.applyQuality();
    this.view = new RaceView(ctx.gr, this.world, { track: this.track ?? undefined, arena: this.arena ?? undefined }, this.locals);
    this.view.split = ctx.settings.splitMode as SplitMode;
    for (const c of this.view.cams) c.distanceSetting = ctx.settings.cameraDistance;
    if (this.items) this.view.attachItems(this.items);
    if (this.hazards) this.view.attachHazards(this.hazards);
    if (isBattle) this.view.enableBalloons();
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
    const hudMode = isBattle ? 'battle' : cfg.mode === 'timeTrial' ? 'timeTrial' : 'race';
    const touchHud = ctx.gr.isTouch && this.locals.length === 1;
    for (let i = 0; i < this.locals.length; i++) {
      const h = new Hud(this.hudLayer, hudMode, i, { track: this.track ?? undefined, arena: this.arena ?? undefined }, cfg.mirror, this.locals.length > 1, touchHud);
      h.setRect(this.view.rectFor(i, this.locals.length));
      this.huds.push(h);
    }
    // input routing
    ctx.input.players = cfg.players.map((p) => p.source);
    ctx.input.inRace = true;
    const touchUsed = cfg.players.some((p) => p.source.kind === 'touch' || (p.source.kind === 'any' && ctx.gr.isTouch));
    ctx.input.touch.setMode(ctx.settings.touchSteer);
    ctx.input.touch.setAutoAccel(ctx.settings.autoAccel || ctx.gr.isTouch);
    ctx.input.touch.show(touchUsed && this.locals.length === 1);
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
    this.checkSkip();
    // player input
    for (let i = 0; i < this.locals.length; i++) {
      const k = w.karts[this.locals[i]];
      if (k.finished && this.cfg.mode !== 'battle') continue; // AI autopilot drives after the finish
      this.ctx.input.fillKartInput(i, k.input, k.autoAccel, w.phase === 'race');
    }
    w.step(dt);
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

  private onEvent = (e: SimEvent): void => {
    this.view.onEvent(e);
    this.ctx.audio.onSimEvent(e, this.world, this.locals);
    const hudFor = (kart: number): Hud | null => {
      const i = this.locals.indexOf(kart);
      return i >= 0 ? this.huds[i] : null;
    };
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
          if (e.final) h.banner('FINAL LAP!', 'big', 2);
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
      default:
        break;
    }
  };

  private checkDone(): void {
    if (this.done) return;
    const w = this.world;
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
    if (this.recorder && w.karts[0].finished && !w.karts[0].projected) out.ghost = this.recorder.encode();
    this.ctx.audio.setFinalLap(false);
    this.hudLayer.style.display = 'none';
    this.ctx.input.touch.show(false);
    this.ctx.input.inRace = false;
    this.onComplete?.(out);
  }

  render(alpha: number, dt: number): void {
    const w = this.world;
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
      });
    }
    this.ctx.audio.update(w, this.locals, dt);
    this.ctx.input.touch.setCountdown(w.phase === 'countdown' || w.phase === 'intro');
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
