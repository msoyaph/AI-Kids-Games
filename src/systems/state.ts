import type { Difficulty } from '../data/types';
import type { GameEvent } from './events';
import { tuning, type DiffTuning } from './difficulty';
import { flightParams, type FlightParams } from './rocketStats';
import { createSave, type PlayStats, type SaveData } from './save/schema';

export type Listener = (e: GameEvent, state: GameState) => void;

/**
 * The live game state for the current save slot. Pure logic: it holds data and routes
 * GameEvents to listeners (mission engine, badges, dailies, stats). No DOM, no Pixi.
 */
export class GameState {
  private listeners: Listener[] = [];
  private dirty = false;
  /** Messages for the UI (toasts, dialogue...) produced by systems. Drained by the presenter. */
  readonly outbox: UiMessage[] = [];

  constructor(public data: SaveData = createSave(0)) {}

  on(fn: Listener): () => void {
    this.listeners.push(fn);
    return () => {
      const i = this.listeners.indexOf(fn);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  emit(e: GameEvent): void {
    for (const fn of this.listeners.slice()) fn(e, this);
    this.dirty = true;
  }

  post(msg: UiMessage): void {
    this.outbox.push(msg);
  }

  markDirty(): void {
    this.dirty = true;
  }

  takeDirty(): boolean {
    const d = this.dirty;
    this.dirty = false;
    return d;
  }

  get difficulty(): Difficulty {
    return this.data.difficulty;
  }

  get tuning(): DiffTuning {
    return tuning(this.data.difficulty);
  }

  get flight(): FlightParams {
    return flightParams(this.data.loadout, this.data.difficulty);
  }

  addCoins(n: number): void {
    if (n <= 0) return;
    this.data.coins += n;
    this.data.coinsEarned += n;
    this.dirty = true;
  }

  spend(n: number): boolean {
    if (n > this.data.coins) return false;
    this.data.coins -= n;
    this.dirty = true;
    return true;
  }

  bump<K extends keyof PlayStats>(key: K, delta = 1): void {
    const v = this.data.stats[key];
    if (typeof v === 'number') (this.data.stats[key] as number) = v + delta;
  }

  addUnique(list: string[], id: string): boolean {
    if (list.includes(id)) return false;
    list.push(id);
    this.dirty = true;
    return true;
  }

  flag(name: string): boolean {
    return !!this.data.flags[name];
  }

  setFlag(name: string, on = true): void {
    if (on) this.data.flags[name] = true;
    else delete this.data.flags[name];
    this.dirty = true;
  }

  owns(id: string): boolean {
    return this.data.owned.includes(id);
  }
}

/** Things systems ask the UI to show. */
export type UiMessage =
  | { kind: 'toast'; icon: string; text: string; color?: string }
  | { kind: 'dialogue'; id: string }
  | { kind: 'badge'; id: string }
  | { kind: 'sticker'; id: string }
  | { kind: 'codex'; id: string }
  | { kind: 'missionDone'; id: string }
  | { kind: 'objective'; mission: string; step: number }
  | { kind: 'chapter'; chapter: number }
  | { kind: 'cutscene'; id: string }
  | { kind: 'daily'; id: string }
  | { kind: 'fact'; id: string };
