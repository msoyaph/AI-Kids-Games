import type { GameEvent } from '../sim/events';

/** Placeholder — the synth engine arrives in Phase 8. Same public API. */
export class AudioEngine {
  musicVolume = 0.5;
  sfxVolume = 0.8;
  unlock(): void {}
  setVolumes(music: number, sfx: number): void {
    this.musicVolume = music;
    this.sfxVolume = sfx;
  }
  playMusic(_track: string): void {}
  stopMusic(): void {}
  suspend(): void {}
  resume(): void {}
  ui(_name: 'click' | 'back' | 'deny' | 'pick' | 'star'): void {}
  onGameEvent(_e: GameEvent): void {}
}
