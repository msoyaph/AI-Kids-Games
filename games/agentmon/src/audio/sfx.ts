/**
 * Sound effects and Agentmon cries, all synthesized. Effects are short and soft (no harsh noises).
 * Every Agentmon has its own cry: the pitch comes from its size (later stages are lower), the tone
 * from its element (Flare crackles, Tide bubbles, Volt buzzes...), and a little tune from its
 * number, so each one sounds different but stays friendly.
 */
import type { Element } from '../core/types';
import { note, type AudioEngine } from './audio';

export type Sfx =
  | 'click' | 'back' | 'step' | 'bump' | 'super' | 'weak' | 'rest' | 'item' | 'coin' | 'ability' | 'door'
  | 'spark-hit' | 'spark-near' | 'spark-miss' | 'heart' | 'friend' | 'level' | 'grow' | 'beacon' | 'solved'
  | 'push' | 'shield' | 'boost' | 'status' | 'nap' | 'quest' | 'toast';

export function playSfx(a: AudioEngine, id: Sfx | string): void {
  if (!a.ready) return;
  const t = a.now;
  const tone = (freq: number, dur: number, type: OscillatorType = 'square', vol = 0.12, at = 0, slide?: number) => a.tone({ freq, dur, type, vol, at: t + at, slide });
  switch (id) {
    case 'click': tone(880, 0.05, 'triangle', 0.08); break;
    case 'back': tone(520, 0.06, 'triangle', 0.08, 0, 0.7); break;
    case 'step': a.hiss({ dur: 0.04, vol: 0.03, freq: 900, q: 0.7, at: t }); break;
    case 'door': a.hiss({ dur: 0.18, vol: 0.06, freq: 600, q: 1, at: t, sweep: 0.5 }); tone(330, 0.1, 'triangle', 0.06, 0.05); break;
    case 'bump': tone(220, 0.12, 'square', 0.1, 0, 0.5); a.hiss({ dur: 0.08, vol: 0.06, freq: 1200, at: t }); break;
    case 'super': tone(330, 0.08, 'square', 0.1); tone(495, 0.08, 'square', 0.1, 0.07); tone(660, 0.16, 'square', 0.1, 0.14); a.hiss({ dur: 0.12, vol: 0.06, freq: 2500, at: t }); break;
    case 'weak': tone(300, 0.14, 'triangle', 0.08, 0, 0.8); break;
    case 'rest': for (const [i, n] of [72, 76, 79, 84].entries()) tone(note(n), 0.25, 'sine', 0.08, i * 0.09); break;
    case 'item': tone(note(79), 0.08, 'square', 0.07); tone(note(84), 0.14, 'square', 0.07, 0.08); break;
    case 'coin': tone(note(88), 0.06, 'square', 0.06); tone(note(93), 0.14, 'square', 0.06, 0.06); break;
    case 'ability': a.hiss({ dur: 0.35, vol: 0.07, freq: 3000, q: 2, at: t, sweep: 0.3 }); tone(note(76), 0.3, 'triangle', 0.07, 0.05, 1.5); break;
    case 'spark-hit': tone(note(84), 0.1, 'triangle', 0.1); tone(note(91), 0.18, 'triangle', 0.1, 0.06); break;
    case 'spark-near': tone(note(79), 0.14, 'triangle', 0.08); break;
    case 'spark-miss': tone(note(67), 0.16, 'sine', 0.06, 0, 0.9); break;
    case 'heart': tone(note(72), 0.12, 'sine', 0.08); tone(note(76), 0.2, 'sine', 0.08, 0.1); break;
    case 'friend': for (const [i, n] of [72, 76, 79, 84, 88].entries()) tone(note(n), 0.22, 'triangle', 0.08, i * 0.08); break;
    case 'level': for (const [i, n] of [72, 79, 84].entries()) tone(note(n), 0.16, 'square', 0.06, i * 0.09); break;
    case 'grow': for (let i = 0; i < 8; i++) tone(note(60 + i * 3), 0.18, 'triangle', 0.06, i * 0.07); break;
    case 'beacon': for (const [i, n] of [64, 71, 76, 83, 88].entries()) tone(note(n), 0.8, 'sine', 0.07, i * 0.12); break;
    case 'solved': for (const [i, n] of [76, 79, 84].entries()) tone(note(n), 0.2, 'triangle', 0.08, i * 0.1); break;
    case 'push': a.hiss({ dur: 0.12, vol: 0.05, freq: 400, q: 0.8, at: t }); break;
    case 'shield': tone(note(81), 0.25, 'sine', 0.07, 0, 1.2); break;
    case 'boost': tone(note(72), 0.12, 'square', 0.06, 0, 1.5); tone(note(79), 0.12, 'square', 0.06, 0.1, 1.5); break;
    case 'status': tone(note(70), 0.2, 'triangle', 0.06, 0, 0.8); break;
    case 'nap': tone(note(67), 0.3, 'sine', 0.06, 0, 0.7); tone(note(60), 0.4, 'sine', 0.05, 0.25, 0.8); break;
    case 'quest': tone(note(79), 0.1, 'triangle', 0.07); tone(note(84), 0.1, 'triangle', 0.07, 0.1); tone(note(91), 0.2, 'triangle', 0.07, 0.2); break;
    case 'toast': tone(note(84), 0.06, 'sine', 0.05); break;
  }
}

const TIMBRE: Record<Element | 'plain', OscillatorType> = { flare: 'sawtooth', tide: 'sine', leaf: 'triangle', stone: 'square', gust: 'triangle', frost: 'sine', volt: 'square', glow: 'sine', plain: 'triangle' };

/** An Agentmon's cry (on the voice bus). Stage 1 is high and quick; stage 3 is lower and longer. */
export function playCry(a: AudioEngine, c: { num: number; element: Element; stage: number; guardian?: boolean }, happy = true): void {
  if (!a.ready) return;
  const t = a.now;
  const base = (c.guardian ? 52 : 76 - (c.stage - 1) * 7) + (c.num % 5) - 2;
  const tune = [[0, 4, 7], [0, 7, 4], [0, 3, 7], [7, 4, 0], [0, 5, 9], [4, 0, 7]][c.num % 6]!;
  const len = c.guardian ? 0.32 : 0.1 + c.stage * 0.04;
  tune.forEach((iv, i) => a.tone({ freq: note(base + iv + (happy ? 0 : -2)), dur: len, type: TIMBRE[c.element], vol: 0.09, at: t + i * len * 0.8, bus: 'voice', vibrato: c.element === 'tide' || c.element === 'glow' ? 6 : 0, slide: c.element === 'gust' ? 1.08 : undefined }));
  if (c.element === 'flare') a.hiss({ dur: 0.15, vol: 0.04, freq: 3000, at: t, bus: 'voice' });
  if (c.element === 'volt') a.hiss({ dur: 0.1, vol: 0.03, freq: 5000, q: 4, at: t + 0.05, bus: 'voice' });
}
