// Game: owns the state, the world runtime and the event bus, and steps the systems.
import { EventBus } from '../core/events';
import { advanceClock } from './clock';
import type { GameEvents } from './events';
import { frontTile, newMotion, stepPlayer, tileOf, type Motion, type MoveIntent } from './player';
import type { GameState, Structure, TileObj } from './state';
import { equippedTool, type EquippedTool } from './tools';
import { World } from './world';

export type GameMode = 'play' | 'menu' | 'dialogue' | 'minigame' | 'cutscene' | 'placement' | 'editor' | 'busy';

export interface PlayInput {
  move: MoveIntent;
  /** action button currently held (net sneaking, reel) */
  actionHeld?: boolean;
}

/** A timed player action (tool swing, pickup...) so animations and effects line up. */
export interface PlayerAction {
  kind: string;
  t: number;
  dur: number;
  hitAt: number;
  hit: boolean;
  effect?: () => void;
  after?: () => void;
}

export interface InteractCtx {
  here: number;
  front: number;
  hereObj?: TileObj;
  frontObj?: TileObj;
  frontStruct?: Structure;
  tool: EquippedTool | null;
}

export interface Interaction {
  label: string;
  priority: number;
  run: () => void;
  /** optional: shown greyed out, can't run */
  disabled?: boolean;
}

export type Resolver = (g: Game, ctx: InteractCtx) => Interaction | null;

export class Game {
  readonly bus = new EventBus<GameEvents>();
  world: World;
  motion: Motion = newMotion();
  mode: GameMode = 'play';
  action: PlayerAction | null = null;
  private dayHooks: ((g: Game) => void)[] = [];
  private updateHooks: ((g: Game, dt: number) => void)[] = [];
  private resolvers: Resolver[] = [];
  /** Runtime-only systems state (not saved): fish shadows, bugs, villager positions... */
  runtime: Record<string, unknown> = {};
  /** action button held this frame */
  held = false;
  /** analog move magnitude this frame */
  moveMag = 0;
  /** player is sneaking (net raised) */
  sneaking = false;
  /** last movement intent (interiors use it) */
  moveIntent = { x: 0, z: 0, run: false };
  /** interaction resolver used while inside a building */
  interiorResolver: ((g: Game) => Interaction | null) | null = null;
  private pressHandlers: ((g: Game) => boolean)[] = [];
  /** UI hook: request a confirmation/dialog from the presentation layer */
  ui: {
    confirm: (text: string, yes: () => void, no?: () => void) => void;
    open: (panel: string, arg?: unknown) => void;
    say: (speaker: string, lines: string[], done?: () => void) => void;
  } = {
    confirm: (_t, yes) => yes(),
    open: () => {},
    say: (_s, _l, done) => done?.(),
  };

  constructor(public state: GameState) {
    this.world = new World(state);
  }

  onDay(h: (g: Game) => void): void {
    this.dayHooks.push(h);
  }

  onUpdate(h: (g: Game, dt: number) => void): void {
    this.updateHooks.push(h);
  }

  addResolver(r: Resolver): void {
    this.resolvers.push(r);
  }

  /** Handlers that may consume the action button before normal interactions (fishing, events...). */
  onPress(h: (g: Game) => boolean): void {
    this.pressHandlers.push(h);
  }

  emit<K extends keyof GameEvents>(k: K, p: GameEvents[K]): void {
    this.bus.emit(k, p);
  }

  toast(text: string, kind: GameEvents['toast']['kind'] = 'info', item?: string): void {
    this.bus.emit('toast', { text, kind, item });
  }

  get clockRunning(): boolean {
    return this.mode === 'play' || this.mode === 'minigame' || this.mode === 'placement' || this.mode === 'busy';
  }

  /** Run the daily rollover (spawns, weather, shop, requests...). */
  startDay(): void {
    for (const h of this.dayHooks) h(this);
    this.bus.emit('dayStarted', { day: this.state.clock.day });
  }

  /** Make sure today's daily roll has happened (new game / loaded save). */
  ensureDayRolled(): void {
    if (this.state.world.rolledDay !== this.state.clock.day) this.startDay();
  }

  startAction(kind: string, dur: number, hitAt: number, effect?: () => void, after?: () => void): void {
    this.action = { kind, t: 0, dur, hitAt, hit: false, effect, after };
  }

  interactCtx(): InteractCtx {
    const p = this.state.player;
    const here = tileOf(this.world, p.x, p.z);
    const front = frontTile(this.world, p);
    return {
      here,
      front,
      hereObj: this.world.obj(here),
      frontObj: this.world.obj(front),
      frontStruct: this.world.structure(front),
      tool: equippedTool(this),
    };
  }

  /** Best available interaction right now (for the HUD prompt and the action button). */
  resolve(): Interaction | null {
    if (this.state.player.location !== 'island') return this.interiorResolver?.(this) ?? null;
    const ctx = this.interactCtx();
    let best: Interaction | null = null;
    for (const r of this.resolvers) {
      const i = r(this, ctx);
      if (i && (!best || i.priority > best.priority)) best = i;
    }
    return best;
  }

  /** Action button pressed in free play. */
  act(): boolean {
    for (const h of this.pressHandlers) if (h(this)) return true;
    if (this.mode !== 'play' || this.action) return false;
    const i = this.resolve();
    if (i && !i.disabled) {
      i.run();
      return true;
    }
    return false;
  }

  update(dt: number, input: PlayInput | null): void {
    this.state.playSeconds += dt;
    if (this.clockRunning) {
      const crossed = advanceClock(this.state.clock, dt);
      for (let k = 0; k < crossed; k++) this.startDay();
    }
    if (this.action) {
      const a = this.action;
      a.t += dt;
      if (!a.hit && a.t >= a.hitAt) {
        a.hit = true;
        a.effect?.();
      }
      if (a.t >= a.dur) {
        this.action = null;
        a.after?.();
      }
    }
    this.held = !!input?.actionHeld;
    this.moveMag = input ? Math.hypot(input.move.x, input.move.z) : 0;
    this.moveIntent = input ? { x: input.move.x, z: input.move.z, run: input.move.run } : { x: 0, z: 0, run: false };
    const canMove = this.mode === 'play' && !this.action && input && this.state.player.location === 'island';
    if (canMove) {
      stepPlayer(this.world, this.state.player, this.motion, { ...input.move, sneak: this.sneaking, run: input.move.run && !this.sneaking }, dt);
    } else {
      this.motion.speed = 0;
      this.motion.vx = 0;
      this.motion.vz = 0;
    }
    for (const h of this.updateHooks) h(this, dt);
  }
}
