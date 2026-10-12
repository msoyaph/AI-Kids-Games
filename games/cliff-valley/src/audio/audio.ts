/**
 * Web Audio engine: everything is synthesized (no audio files). The context starts on the
 * first user gesture; if Web Audio is missing or blocked, the game stays silent.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  musicBus: GainNode | null = null;
  sfxBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  musicVol = 0.6;
  sfxVol = 0.8;
  private started = false;
  private hidden = false;
  private onStart: (() => void)[] = [];

  constructor() {
    const start = () => this.start();
    window.addEventListener('pointerdown', start, { passive: true });
    window.addEventListener('keydown', start);
    document.addEventListener('visibilitychange', () => {
      this.hidden = document.visibilityState === 'hidden';
      this.applyVolumes();
    });
  }

  whenStarted(f: () => void): void {
    if (this.started) f();
    else this.onStart.push(f);
  }

  start(): void {
    if (this.started) {
      if (this.ctx?.state === 'suspended') void this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      // white noise for drums and effects
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.started = true;
      this.applyVolumes();
      for (const f of this.onStart) f();
      this.onStart = [];
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
    if (!this.ctx || !this.musicBus || !this.sfxBus || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.hidden ? 0 : 1, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.musicVol * 0.35, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(this.sfxVol * 0.5, t, 0.05);
  }

  get now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  /** One enveloped oscillator note. */
  tone(o: { freq: number; dur: number; type?: OscillatorType; vol?: number; at?: number; slide?: number; attack?: number; bus?: 'music' | 'sfx'; detune?: number }): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const bus = o.bus === 'music' ? this.musicBus : this.sfxBus;
    if (!bus) return;
    const t = o.at ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type ?? 'square';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.freq * o.slide), t + o.dur);
    if (o.detune) osc.detune.setValueAtTime(o.detune, t);
    const v = o.vol ?? 0.2;
    const a = o.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.01, o.dur));
    osc.connect(g);
    g.connect(bus);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  /** Filtered noise burst (drums, splashes, rustles). */
  hiss(o: { dur: number; vol?: number; at?: number; freq?: number; q?: number; type?: BiquadFilterType; bus?: 'music' | 'sfx'; sweep?: number }): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const bus = o.bus === 'music' ? this.musicBus : this.sfxBus;
    if (!bus) return;
    const t = o.at ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? 'bandpass';
    f.frequency.setValueAtTime(o.freq ?? 2000, t);
    if (o.sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, (o.freq ?? 2000) * o.sweep), t + o.dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol ?? 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + o.dur + 0.05);
  }
}

export const note = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);
