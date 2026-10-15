// Sound, all made with the Web Audio API (no audio files): a limiter on the master output, music
// and effects buses with their own volumes, and synthesized effects for every moment of play,
// rate-limited so a busy wave stays pleasant. Browsers only allow sound after the first tap, click
// or key press, so the context starts on that gesture (unlock()).

let ctx: AudioContext | null = null;
let master: GainNode, musicBus: GainNode, sfxBus: GainNode, noise: AudioBuffer;
const last = new Map<string, number>();
let volumes = { music: 0.6, sfx: 0.8 };

export function unlock() {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10; limiter.knee.value = 6; limiter.ratio.value = 12; limiter.attack.value = 0.003; limiter.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = 0.9;
      musicBus = ctx.createGain(); sfxBus = ctx.createGain();
      musicBus.connect(master); sfxBus.connect(master); master.connect(limiter).connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      setVolumes(volumes.music, volumes.sfx);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { ctx = null; }
}

export const audioState = () => ctx?.state ?? 'none';
export const audioContext = () => (ctx && ctx.state === 'running' ? ctx : null);
export const musicOut = () => musicBus;

export function setVolumes(music: number, sfx: number) {
  volumes = { music, sfx };
  if (!ctx) return;
  musicBus.gain.setTargetAtTime(music * 0.5, ctx.currentTime, 0.05);
  sfxBus.gain.setTargetAtTime(sfx * 0.8, ctx.currentTime, 0.05);
}

/** A note: an oscillator through a gain envelope (attack, decay to silence). */
export function tone(dest: AudioNode, at: number, freq: number, len: number, type: OscillatorType, peak: number, attack = 0.01, slideTo?: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + len);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(gain).connect(dest);
  osc.start(at);
  osc.stop(at + len + 0.05);
}

/** A burst of filtered noise (whooshes, poofs, crunches). */
function hiss(at: number, len: number, peak: number, from: number, to: number, q = 1) {
  if (!ctx) return;
  const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  src.buffer = noise;
  filter.type = 'bandpass'; filter.Q.value = q;
  filter.frequency.setValueAtTime(from, at);
  filter.frequency.exponentialRampToValueAtTime(to, at + len);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(filter).connect(gain).connect(sfxBus);
  src.start(at, Math.random() * 0.5);
  src.stop(at + len + 0.05);
}

export type Sfx = 'plant' | 'flick' | 'pod' | 'lob' | 'chime' | 'seeds' | 'hit' | 'tink' | 'shoo' | 'wilt' | 'produce' | 'pickup' | 'collect' | 'umbrella' | 'snack' | 'wave' | 'bigwave' | 'won' | 'lost' | 'click' | 'dig' | 'molehill' | 'swap' | 'push' | 'boss' | 'pinecone' | 'nope';

/** How often each sound may play (seconds), so twenty berries don't make twenty clicks. */
const GAP: Partial<Record<Sfx, number>> = { flick: 0.06, hit: 0.05, pod: 0.08, lob: 0.08, seeds: 0.1, chime: 0.1, pickup: 0.15, collect: 0.04, tink: 0.08, push: 0.1 };

export function sfx(name: Sfx, pitch = 1) {
  if (!ctx || ctx.state !== 'running' || volumes.sfx <= 0) return;
  const now = ctx.currentTime;
  const gap = GAP[name] ?? 0.03;
  if ((last.get(name) ?? -1) + gap > now) return;
  last.set(name, now);
  const at = now + 0.005, out = sfxBus;
  const j = 1 + (Math.random() - 0.5) * 0.06;
  switch (name) {
    case 'plant': tone(out, at, 220 * j, 0.18, 'sine', 0.5, 0.005, 110); tone(out, at, 660 * j, 0.12, 'triangle', 0.2, 0.005, 880); hiss(at, 0.12, 0.15, 800, 300); break;
    case 'flick': tone(out, at, 520 * pitch * j, 0.08, 'triangle', 0.18, 0.003, 880 * pitch); break;
    case 'pod': tone(out, at, 340 * j, 0.1, 'square', 0.08, 0.003, 600); hiss(at, 0.06, 0.1, 2000, 1200, 2); break;
    case 'lob': tone(out, at, 300 * j, 0.25, 'sine', 0.15, 0.01, 700); break;
    case 'chime': for (const [m, a] of [[1, 0.2], [2.76, 0.08], [5.4, 0.04]] as const) tone(out, at, 880 * m * j, 0.7, 'sine', a, 0.005); break;
    case 'seeds': hiss(at, 0.15, 0.2, 3000, 1500, 3); tone(out, at, 700 * j, 0.06, 'triangle', 0.1); break;
    case 'hit': tone(out, at, 260 * pitch * j, 0.09, 'sine', 0.22, 0.003, 180); break;
    case 'tink': tone(out, at, 1400 * j, 0.15, 'triangle', 0.12, 0.002); break;
    case 'shoo': hiss(at, 0.35, 0.3, 600, 3000, 1.5); tone(out, at + 0.05, 500 * j, 0.25, 'sine', 0.2, 0.01, 1100); break;
    case 'wilt': tone(out, at, 400 * j, 0.4, 'sine', 0.15, 0.02, 180); break;
    case 'produce': tone(out, at, 440 * j, 0.12, 'sine', 0.15, 0.005, 660); tone(out, at + 0.08, 660 * j, 0.12, 'sine', 0.12, 0.005, 990); break;
    case 'pickup': tone(out, at, 990 * j, 0.15, 'sine', 0.08, 0.005); break;
    case 'collect': tone(out, at, 784 * pitch, 0.12, 'triangle', 0.18, 0.003); tone(out, at + 0.05, 1175 * pitch, 0.16, 'triangle', 0.14, 0.003); break;
    case 'umbrella': hiss(at, 0.3, 0.45, 300, 1200, 0.8); tone(out, at, 120, 0.3, 'sine', 0.5, 0.005, 70); tone(out, at + 0.12, 660, 0.3, 'triangle', 0.15, 0.01, 990); break;
    case 'snack': tone(out, at, 523, 0.25, 'triangle', 0.25, 0.01); tone(out, at + 0.22, 392, 0.4, 'triangle', 0.25, 0.01); break;
    case 'wave': for (const [i, f] of [523, 659].entries()) tone(out, at + i * 0.12, f, 0.25, 'square', 0.08, 0.01); break;
    case 'bigwave': for (const [i, f] of [392, 523, 659, 784].entries()) tone(out, at + i * 0.1, f, 0.3, 'square', 0.09, 0.01); break;
    case 'won': for (const [i, f] of [523, 659, 784, 1047, 1319].entries()) tone(out, at + i * 0.11, f, 0.5, 'triangle', 0.22, 0.01); break;
    case 'lost': for (const [i, f] of [523, 466, 392, 349].entries()) tone(out, at + i * 0.18, f, 0.45, 'triangle', 0.18, 0.02); break;
    case 'click': tone(out, at, 1200, 0.05, 'triangle', 0.1, 0.002); break;
    case 'dig': hiss(at, 0.2, 0.3, 500, 200, 1); break;
    case 'molehill': hiss(at, 0.4, 0.2, 200, 120, 0.7); break;
    case 'swap': tone(out, at, 700, 0.1, 'triangle', 0.15); tone(out, at + 0.1, 500, 0.15, 'triangle', 0.15); break;
    case 'push': hiss(at, 0.25, 0.2, 1500, 400, 1); break;
    case 'boss': tone(out, at, 98, 0.6, 'sawtooth', 0.12, 0.05, 82); tone(out, at, 147, 0.6, 'triangle', 0.15, 0.05); break;
    case 'pinecone': hiss(at, 0.4, 0.2, 300, 200, 0.6); tone(out, at, 160, 0.3, 'sine', 0.2); break;
    case 'nope': tone(out, at, 300, 0.12, 'triangle', 0.15, 0.005, 240); break;
  }
}
