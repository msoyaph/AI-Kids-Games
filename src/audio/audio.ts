import { MusicPlayer } from './music';
import { setSfxPlayer } from './sfx';

/**
 * Web Audio engine: every sound is synthesized (no audio files). The context is created on
 * the first tap/click/key press (browsers require a user gesture) and suspended when the tab
 * is hidden. Every call is wrapped so audio problems never break the game.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  musicBus: GainNode | null = null;
  sfxBus: GainNode | null = null;
  noise: AudioBuffer | null = null;
  music: MusicPlayer | null = null;
  private musicVol = 0.6;
  private sfxVol = 0.8;
  private last = new Map<string, number>();
  private wantTrack: string | null = null;
  private hidden = false;

  constructor() {
    const unlock = () => this.unlock();
    for (const ev of ['pointerdown', 'touchend', 'keydown', 'mousedown']) window.addEventListener(ev, unlock, { capture: true, passive: true });
    setSfxPlayer((name, opts) => this.play(name, opts));
  }

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        const ctx = new AC({ latencyHint: 'interactive' });
        this.ctx = ctx;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.knee.value = 12;
        comp.ratio.value = 4;
        this.master = ctx.createGain();
        this.master.gain.value = 0.9;
        this.musicBus = ctx.createGain();
        this.sfxBus = ctx.createGain();
        this.musicBus.connect(this.master);
        this.sfxBus.connect(this.master);
        this.master.connect(comp);
        comp.connect(ctx.destination);
        // Shared white noise for drums, whooshes and bumps.
        const len = ctx.sampleRate;
        this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        this.music = new MusicPlayer(this);
        this.applyVolumes();
        if (this.wantTrack) this.music.play(this.wantTrack);
      }
      if (this.ctx.state === 'suspended' && !this.hidden) void this.ctx.resume().catch(() => {});
    } catch {
      this.ctx = null;
    }
  }

  setVolumes(music: number, sfx: number): void {
    this.musicVol = music;
    this.sfxVol = sfx;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.musicBus || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.musicVol * this.musicVol * 0.55, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.sfxVol * this.sfxVol * 0.9, t, 0.05);
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    try {
      if (!this.ctx) return;
      if (hidden) void this.ctx.suspend().catch(() => {});
      else void this.ctx.resume().catch(() => {});
    } catch {
      /* ignore */
    }
  }

  playMusic(track: string | null): void {
    this.wantTrack = track;
    try {
      this.music?.play(track);
    } catch {
      /* ignore */
    }
  }

  /** Play a sound effect by name. */
  play(name: string, opts?: { pitch?: number; volume?: number }): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.sfxBus || this.sfxVol <= 0) return;
    const now = performance.now();
    const gap = MIN_GAP[name] ?? 30;
    if (now - (this.last.get(name) ?? 0) < gap) return;
    this.last.set(name, now);
    const recipe = SFX[name];
    if (!recipe) return;
    try {
      recipe(this, ctx.currentTime + 0.005, opts?.pitch ?? 1, opts?.volume ?? 1);
    } catch {
      /* ignore */
    }
  }

  // ------------------------------------------------------------------ building blocks

  /** One oscillator note with an attack/decay envelope. */
  tone(type: OscillatorType, freq: number, t: number, dur: number, vol: number, opts: { to?: number; attack?: number; dest?: AudioNode; detune?: number; release?: number } = {}): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t + dur);
    if (opts.detune) o.detune.value = opts.detune;
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + (opts.release ?? 0));
    o.connect(g);
    g.connect(opts.dest ?? this.sfxBus!);
    o.start(t);
    o.stop(t + dur + (opts.release ?? 0) + 0.05);
  }

  /** Filtered noise burst (whooshes, drums, bumps). */
  noiseHit(t: number, dur: number, vol: number, filter: BiquadFilterType, freq: number, opts: { to?: number; q?: number; dest?: AudioNode } = {}): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(opts.dest ?? this.sfxBus!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }
}

type Recipe = (a: AudioEngine, t: number, pitch: number, vol: number) => void;

const N = (semi: number) => 440 * Math.pow(2, (semi - 9) / 12); // semitones from C4
const C5 = N(12);
const E5 = N(16);
const G5 = N(19);
const C6 = N(24);
const E6 = N(28);
const G6 = N(31);

const arp = (a: AudioEngine, t: number, notes: number[], step: number, type: OscillatorType, vol: number, dur = 0.18) => {
  notes.forEach((f, i) => a.tone(type, f, t + i * step, dur, vol));
};

const MIN_GAP: Record<string, number> = { coin: 35, blip: 55, scanTick: 90, push: 180, bump: 120, jump: 60, boing: 80, firework: 120 };

export const SFX: Record<string, Recipe> = {
  click: (a, t, _p, v) => a.tone('square', 740, t, 0.05, 0.08 * v, { to: 980 }),
  tab: (a, t, _p, v) => a.tone('triangle', 560, t, 0.07, 0.15 * v, { to: 700 }),
  select: (a, t, _p, v) => {
    a.tone('triangle', 660, t, 0.06, 0.14 * v);
    a.tone('triangle', 990, t + 0.05, 0.08, 0.12 * v);
  },
  locked: (a, t, _p, v) => {
    a.tone('triangle', 330, t, 0.1, 0.14 * v);
    a.tone('triangle', 247, t + 0.1, 0.16, 0.14 * v);
  },
  coin: (a, t, p, v) => {
    a.tone('square', 988 * p, t, 0.06, 0.07 * v);
    a.tone('square', 1319 * p, t + 0.055, 0.12, 0.07 * v);
  },
  fuel: (a, t, _p, v) => arp(a, t, [C5, E5, G5, C6], 0.05, 'triangle', 0.16 * v),
  bump: (a, t, _p, v) => {
    a.tone('sine', 160, t, 0.22, 0.4 * v, { to: 55 });
    a.noiseHit(t, 0.18, 0.18 * v, 'lowpass', 900);
    a.tone('triangle', 300, t + 0.05, 0.25, 0.08 * v, { to: 180 });
  },
  boost: (a, t, _p, v) => {
    a.noiseHit(t, 0.55, 0.22 * v, 'bandpass', 400, { to: 2600, q: 1.5 });
    a.tone('sawtooth', 90, t, 0.45, 0.07 * v, { to: 180 });
  },
  whoosh: (a, t, _p, v) => a.noiseHit(t, 0.5, 0.16 * v, 'bandpass', 600, { to: 2400, q: 2 }),
  launch: (a, t, _p, v) => {
    a.noiseHit(t, 0.9, 0.22 * v, 'lowpass', 300, { to: 2200 });
    a.tone('sawtooth', 70, t, 0.8, 0.08 * v, { to: 260 });
  },
  launchUi: (a, t, _p, v) => {
    a.noiseHit(t, 0.5, 0.12 * v, 'bandpass', 500, { to: 3000, q: 2 });
    arp(a, t + 0.05, [G5, C6, E6], 0.06, 'triangle', 0.12 * v);
  },
  slingshot: (a, t, _p, v) => {
    a.tone('sawtooth', 250, t, 0.4, 0.08 * v, { to: 1300 });
    arp(a, t + 0.3, [E6, G6, N(36)], 0.05, 'sine', 0.12 * v, 0.2);
  },
  gate: (a, t, _p, v) => {
    a.tone('sine', 1047, t, 0.5, 0.16 * v);
    a.tone('sine', 1568, t, 0.4, 0.07 * v);
  },
  collect: (a, t, _p, v) => arp(a, t, [E6, G6, N(35)], 0.045, 'sine', 0.15 * v, 0.22),
  sticker: (a, t, _p, v) => {
    arp(a, t, [C5, E5, G5, C6, E6], 0.06, 'triangle', 0.15 * v, 0.22);
    a.noiseHit(t + 0.2, 0.3, 0.05 * v, 'highpass', 6000);
  },
  sparkle: (a, t, _p, v) => arp(a, t, [N(31), N(36), N(40)], 0.05, 'sine', 0.08 * v, 0.25),
  scanTick: (a, t, _p, v) => a.tone('sine', 1200, t, 0.04, 0.06 * v),
  scanDone: (a, t, _p, v) => {
    a.tone('sine', 880, t, 0.15, 0.14 * v);
    a.tone('sine', 1320, t + 0.12, 0.3, 0.14 * v);
  },
  tuggy: (a, t, _p, v) => arp(a, t, [880, 1175, 988, 1319], 0.09, 'square', 0.06 * v, 0.08),
  repair: (a, t, _p, v) => {
    for (let i = 0; i < 4; i++) a.noiseHit(t + i * 0.07, 0.04, 0.1 * v, 'highpass', 3000);
    arp(a, t + 0.3, [G5, C6], 0.08, 'triangle', 0.14 * v);
  },
  arrive: (a, t, _p, v) => {
    for (const f of [N(0), N(4), N(7), N(12)]) a.tone('triangle', f, t, 1.2, 0.07 * v, { attack: 0.25 });
  },
  jump: (a, t, _p, v) => a.tone('square', 280, t, 0.12, 0.06 * v, { to: 620 }),
  land: (a, t, _p, v) => a.noiseHit(t, 0.08, 0.08 * v, 'lowpass', 500),
  boing: (a, t, _p, v) => a.tone('sine', 220, t, 0.3, 0.2 * v, { to: 520 }),
  push: (a, t, _p, v) => a.noiseHit(t, 0.15, 0.06 * v, 'lowpass', 300),
  door: (a, t, _p, v) => {
    a.noiseHit(t, 0.6, 0.12 * v, 'bandpass', 300, { to: 1200, q: 1 });
    a.tone('triangle', 196, t + 0.5, 0.2, 0.12 * v);
  },
  solve: (a, t, _p, v) => arp(a, t, [C5, E5, G5, C6], 0.09, 'square', 0.08 * v, 0.2),
  power: (a, t, _p, v) => {
    a.tone('sawtooth', 120, t, 0.35, 0.08 * v, { to: 900 });
    a.tone('sine', 440, t + 0.3, 0.3, 0.1 * v);
  },
  crystal: (a, t, p, v) => {
    a.tone('sine', 1320 * p, t, 0.5, 0.14 * v);
    a.tone('sine', 1980 * p, t, 0.3, 0.05 * v);
  },
  pickup: (a, t, _p, v) => a.tone('sine', 500, t, 0.12, 0.15 * v, { to: 900 }),
  drop: (a, t, _p, v) => a.tone('sine', 700, t, 0.12, 0.15 * v, { to: 350 }),
  teleport: (a, t, _p, v) => a.tone('sine', 300, t, 0.4, 0.12 * v, { to: 1600 }),
  landed: (a, t, _p, v) => {
    a.noiseHit(t, 0.15, 0.12 * v, 'lowpass', 600);
    arp(a, t + 0.1, [G5, C6], 0.1, 'triangle', 0.15 * v);
  },
  perfect: (a, t, _p, v) => {
    a.noiseHit(t, 0.15, 0.12 * v, 'lowpass', 600);
    arp(a, t + 0.1, [C5, E5, G5, C6, E6, G6], 0.06, 'triangle', 0.14 * v, 0.22);
  },
  objective: (a, t, _p, v) => {
    a.tone('triangle', G5, t, 0.12, 0.14 * v);
    a.tone('triangle', C6, t + 0.1, 0.25, 0.14 * v);
  },
  missionDone: (a, t, _p, v) => {
    arp(a, t, [C5, E5, G5], 0.1, 'square', 0.07 * v, 0.15);
    for (const f of [C5, E5, G5, C6]) a.tone('triangle', f, t + 0.32, 0.8, 0.07 * v);
  },
  fanfare: (a, t, _p, v) => {
    const seq = [G5, G5, G5, C6, E6, C6, G6];
    const dt = [0, 0.12, 0.24, 0.36, 0.6, 0.78, 0.96];
    seq.forEach((f, i) => a.tone('square', f, t + dt[i], i === seq.length - 1 ? 0.7 : 0.14, 0.07 * v));
    for (const f of [C5, E5, G5]) a.tone('triangle', f, t + 0.96, 0.9, 0.06 * v, { attack: 0.05 });
  },
  badge: (a, t, _p, v) => {
    arp(a, t, [E5, G5, C6, E6], 0.07, 'triangle', 0.14 * v);
    a.noiseHit(t + 0.3, 0.4, 0.04 * v, 'highpass', 7000);
  },
  buy: (a, t, _p, v) => {
    for (let i = 0; i < 4; i++) a.tone('square', 988 + i * 160, t + i * 0.06, 0.08, 0.06 * v);
  },
  equip: (a, t, _p, v) => {
    a.noiseHit(t, 0.06, 0.1 * v, 'highpass', 2500);
    a.tone('triangle', 784, t + 0.06, 0.2, 0.14 * v);
  },
  fact: (a, t, _p, v) => {
    a.tone('sine', 988, t, 0.3, 0.1 * v);
    a.tone('sine', 784, t + 0.2, 0.4, 0.1 * v);
  },
  blip: (a, t, p, v) => a.tone('triangle', 520 * p, t, 0.04, 0.04 * v),
  firework: (a, t, _p, v) => {
    a.noiseHit(t, 0.4, 0.12 * v, 'lowpass', 2000, { to: 200 });
    for (let i = 0; i < 5; i++) a.noiseHit(t + 0.1 + i * 0.06, 0.03, 0.05 * v, 'highpass', 5000);
  },
  goal: (a, t, _p, v) => arp(a, t, [G5, C6, E6, G6], 0.08, 'triangle', 0.13 * v, 0.25),
};
