import type { ItemId } from '../data/types';

/**
 * Sim → presentation events (audio, particles, HUD pop-ups, challenge tracking).
 * Events are rare compared to the step rate, so a plain array that is drained each frame is fine.
 */
export type SimEvent =
  | { type: 'countdown'; n: number }
  | { type: 'go' }
  | { type: 'startBoost'; kart: number; good: boolean }
  | { type: 'hop'; kart: number }
  | { type: 'driftTier'; kart: number; tier: number }
  | { type: 'miniTurbo'; kart: number; tier: number }
  | { type: 'boostPad'; kart: number }
  | { type: 'launch'; kart: number; glider: boolean }
  | { type: 'trick'; kart: number }
  | { type: 'land'; kart: number; impact: number; trick: boolean }
  | { type: 'wall'; kart: number; strength: number }
  | { type: 'bump'; kart: number; other: number; strength: number }
  | { type: 'fall'; kart: number }
  | { type: 'respawn'; kart: number }
  | { type: 'lap'; kart: number; lap: number; time: number; final: boolean }
  | { type: 'finish'; kart: number; rank: number; time: number }
  | { type: 'rank'; kart: number; from: number; to: number }
  | { type: 'wrongWay'; kart: number; on: boolean }
  | { type: 'itemGet'; kart: number; item: ItemId }
  | { type: 'itemRoll'; kart: number }
  | { type: 'itemUse'; kart: number; item: ItemId; back: boolean }
  | { type: 'itemHit'; kart: number; by: number; item: ItemId; effect: 'spin' | 'tumble' | 'goo' | 'cloud' | 'bounce' }
  | { type: 'blocked'; kart: number; by: number; item: ItemId }
  | { type: 'dodge'; kart: number; item: ItemId }
  | { type: 'incoming'; kart: number; item: ItemId; on: boolean }
  | { type: 'shieldPop'; kart: number }
  | { type: 'boxBreak'; x: number; y: number; z: number }
  | { type: 'explode'; x: number; y: number; z: number; item: ItemId }
  | { type: 'balloonPop'; kart: number; by: number; left: number }
  | { type: 'coinPickup'; kart: number; x: number; y: number; z: number }
  | { type: 'coinDrop'; kart: number; count: number }
  /** Driving School: a gate passed or missed, a ring flown through, a target popped. */
  | { type: 'lesson'; kind: 'gate' | 'miss' | 'ring' | 'target'; x: number; y: number; z: number }
  | { type: 'shortcut'; kart: number }
  | { type: 'hazard'; kart: number; kind: string };

export class EventQueue {
  readonly list: SimEvent[] = [];
  /** When false (headless sims), events are dropped to avoid any garbage. */
  enabled = true;

  push(e: SimEvent): void {
    if (this.enabled) this.list.push(e);
  }

  drain(fn: (e: SimEvent) => void): void {
    for (let i = 0; i < this.list.length; i++) fn(this.list[i]);
    this.list.length = 0;
  }

  clear(): void {
    this.list.length = 0;
  }
}
