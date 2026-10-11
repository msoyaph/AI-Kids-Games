import type { SimEvent } from '../sim/events';
import type { World } from '../sim/world';

export type UiSound = 'move' | 'select' | 'back' | 'unlock' | 'error' | 'start' | 'coin' | 'fanfare' | 'cheer';

/** What the game needs from the audio system (implemented in audio/engine.ts with Web Audio). */
export interface GameAudio {
  /** Must be called from a user gesture before sound can play. */
  unlock(): void;
  setVolumes(master: number, music: number, sfx: number): void;
  playMusic(songId: string): void;
  stopMusic(fade?: number): void;
  setFinalLap(on: boolean): void;
  ui(sound: UiSound): void;
  /** Sim events → sound effects. `locals` are local-player kart indices (louder / always audible). */
  onSimEvent(e: SimEvent, world: World, locals: number[]): void;
  /** Continuous sounds (engines, drifting) each frame. */
  update(world: World | null, locals: number[], dt: number): void;
  /** Pause/resume all sound (tab hidden, pause menu). */
  suspend(on: boolean): void;
}

export class NullAudio implements GameAudio {
  unlock(): void {}
  setVolumes(): void {}
  playMusic(): void {}
  stopMusic(): void {}
  setFinalLap(): void {}
  ui(): void {}
  onSimEvent(): void {}
  update(): void {}
  suspend(): void {}
}
