/**
 * Sound effects, all synthesized: a soft pick-up, a chunky wooden place, a chime for clears whose
 * pitch climbs with the streak (and gets more notes for more lines), a sparkly board clear, a
 * gentle "no", and a little fanfare for a new best. Plus the settings and the music switch.
 */
import { curve, engine, setHidden as hide, unlockAudio, type Buses } from './engine';
import { startMusic, stopMusic, type MusicStyle } from './music';
import { bell, hz, mallet, noise, tone } from './voices';

export type Sfx = 'pick' | 'place' | 'clear' | 'boardClear' | 'no' | 'tap' | 'best' | 'over' | 'helper' | 'star' | 'win';
export interface SoundSettings { sound: boolean; music: boolean; volume: number }

let settings: SoundSettings = { sound: true, music: true, volume: 0.8 };
let style: MusicStyle | null = null;
let musicOn = false;

export function unlock() { const e = unlockAudio(); if (e) { apply(e); syncMusic(); } }
export const audioState = () => engine()?.ctx.state ?? 'none';

export function configure(next: SoundSettings) { settings = next; const e = engine(); if (e) apply(e); syncMusic(); }
function apply(e: Buses) {
  const t = e.ctx.currentTime;
  e.sfx.gain.setTargetAtTime(settings.sound ? curve(settings.volume) : 0, t, 0.02);
  e.music.gain.setTargetAtTime(settings.music ? curve(settings.volume) * 0.55 : 0, t, 0.08);
}

/** Which music plays (null: none). The style changes with the theme, and Relax plays a calmer version. */
export function music(next: MusicStyle | null) { style = next; syncMusic(); }
function syncMusic() {
  const e = engine();
  if (!e || e.ctx.state !== 'running') return;
  const want = !!style && settings.music;
  if (want) { startMusic(e, style!); musicOn = true; } else if (musicOn) { stopMusic(); musicOn = false; }
}

export function setHidden(hidden: boolean) { hide(hidden); if (!hidden) syncMusic(); }

/** Plays a sound effect. `level` raises clears by semitones (the streak); `lines` adds notes. */
export function play(name: Sfx, level = 0, lines = 1) {
  const e = engine();
  if (!e || e.ctx.state !== 'running' || !settings.sound) return;
  const t = e.ctx.currentTime + 0.005, out = e.sfx;
  switch (name) {
    case 'pick': tone(e, out, t, { freq: 520, to: 780, glide: 0.06, dur: 0.09, gain: 0.16 }); break;
    case 'place':
      tone(e, out, t, { freq: 190, to: 140, glide: 0.08, dur: 0.12, gain: 0.32, type: 'triangle' });
      noise(e, out, t, { dur: 0.03, gain: 0.22, freq: 1900, q: 1.4 });
      break;
    case 'clear': {
      // a pentatonic run, a step higher for each streak level, longer for more lines
      const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
      const base = 72 + Math.min(level, 12);
      const n = Math.min(6, 2 + lines);
      for (let i = 0; i < n; i++) bell(e, out, t + i * 0.055, hz(base + scale[i]!), 0.16 - i * 0.012, 0.6);
      noise(e, out, t, { dur: 0.35, gain: 0.05, freq: 6000, to: 9000, type: 'highpass' });
      break;
    }
    case 'boardClear': {
      for (let i = 0; i < 10; i++) bell(e, out, t + i * 0.045, hz(76 + [0, 4, 7, 12, 16, 19, 24, 28, 31, 36][i]!), 0.12, 0.8);
      for (const n of [60, 64, 67, 72]) tone(e, out, t + 0.45, { freq: hz(n), type: 'triangle', dur: 1.2, gain: 0.07, attack: 0.05 });
      break;
    }
    case 'no': tone(e, out, t, { freq: 240, to: 170, glide: 0.12, dur: 0.16, gain: 0.14, type: 'sine' }); break;
    case 'tap': mallet(e, out, t, 880, 0.08, 0.12); break;
    case 'helper':
      noise(e, out, t, { dur: 0.35, gain: 0.08, freq: 800, to: 5000, q: 2 });
      bell(e, out, t + 0.18, hz(84), 0.12, 0.7);
      break;
    case 'star': bell(e, out, t, hz(88 + level), 0.16, 0.9); break;
    case 'best': case 'win': {
      const notes = name === 'best' ? [72, 76, 79, 84] : [67, 72, 76, 79];
      notes.forEach((n, i) => mallet(e, out, t + i * 0.11, hz(n), 0.2, 0.4));
      for (const n of [notes[0]! - 12, notes[0]!, notes[2]!]) tone(e, out, t + 0.45, { freq: hz(n), type: 'triangle', dur: 1.1, gain: 0.08, attack: 0.03 });
      break;
    }
    case 'over': mallet(e, out, t, hz(67), 0.16, 0.5); mallet(e, out, t + 0.18, hz(60), 0.16, 0.8); break;
  }
}
