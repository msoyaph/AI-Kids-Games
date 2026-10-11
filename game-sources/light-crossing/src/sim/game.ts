// Game: owns the state, the world runtime and the event bus, and steps the systems.
import { EventBus } from '../core/events';
import { advanceClock } from './clock';
import type { GameEvents } from './events';
import { newMotion, stepPlayer, type Motion, type MoveIntent } from './player';
import type { GameState } from './state';
import { World } from './world';

export type GameMode = 'play' | 'menu' | 'dialogue' | 'minigame' | 'cutscene' | 'placement' | 'editor' | 'busy';

export interface PlayInput {
  move: MoveIntent;
}

export class Game {
  readonly bus = new EventBus<GameEvents>();
  world: World;
  motion: Motion = newMotion();
  mode: GameMode = 'play';
  /** seconds of real time the clock has been running this session */
  sessionTime = 0;
  /** systems hook into the day rollover / per-frame update */
  private dayHooks: ((g: Game) => void)[] = [];
  private updateHooks: ((g: Game, dt: number) => void)[] = [];

  constructor(public state: GameState) {
    this.world = new World(state);
  }

  onDay(h: (g: Game) => void): void {
    this.dayHooks.push(h);
  }

  onUpdate(h: (g: Game, dt: number) => void): void {
    this.updateHooks.push(h);
  }

  emit<K extends keyof GameEvents>(k: K, p: GameEvents[K]): void {
    this.bus.emit(k, p);
  }

  toast(text: string, kind: GameEvents['toast']['kind'] = 'info', item?: string): void {
    this.bus.emit('toast', { text, kind, item });
  }

  get clockRunning(): boolean {
    return this.mode === 'play' || this.mode === 'minigame' || this.mode === 'placement';
  }

  /** Run the daily rollover for every day boundary crossed. */
  startDay(): void {
    for (const h of this.dayHooks) h(this);
    this.bus.emit('dayStarted', { day: this.state.clock.day });
  }

  update(dt: number, input: PlayInput | null): void {
    this.state.playSeconds += dt;
    if (this.clockRunning) {
      const crossed = advanceClock(this.state.clock, dt);
      for (let k = 0; k < crossed; k++) this.startDay();
    }
    if (this.mode === 'play' && input && this.state.player.location === 'island') {
      stepPlayer(this.world, this.state.player, this.motion, input.move, dt);
    } else {
      this.motion.speed = 0;
      this.motion.vx = 0;
      this.motion.vz = 0;
    }
    for (const h of this.updateHooks) h(this, dt);
  }
}
