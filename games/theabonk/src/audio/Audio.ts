import { SFX_NAMES } from '../config/sfx';
import { LIMIT_CEILING_DB, mixGain } from './mix';
import { Music } from './Music';

type Wave = OscillatorType;

/**
 * Everything you hear is synthesized here with the Web Audio API — no audio files.
 * The AudioContext is only created inside a user gesture (avoids autoplay warnings).
 */
export class AudioEngine {
  ctx: BaseAudioContext | null = null;
  /** Rendering offline (audio report): no autoplay state, no voice limits. */
  offline = false;
  /** Current sound's gain trim from the mix table (set by each named sound). */
  private g = 1;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private voices = 0;
  private lastPlay = new Map<string, number>();
  readonly music = new Music();
  volumes = { master: 0.8, music: 0.55, sfx: 0.8 };
  private gemStreak = 0;
  private lastGem = 0;
  private duck = 1;

  constructor(listen = true) {
    if (!listen) return;
    const unlock = (): void => this.unlock();
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
  }

  /** Create / resume the context. Must run inside a user gesture handler. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.build(new Ctor());
      }
      const ctx = this.ctx as AudioContext | null;
      if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    } catch {
      this.ctx = null;
    }
  }

  /**
   * Build the graph on a context (live, or offline for the audio report):
   * sfx + music buses → master → glue compressor → limiter → soft clip at the ceiling.
   */
  build(ctx: BaseAudioContext, dest: AudioNode = ctx.destination): void {
    this.ctx = ctx;
    // glue: gentle compression of the whole mix
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    // limiter: fast and hard just under the ceiling…
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = LIMIT_CEILING_DB - 3;
    lim.knee.value = 0;
    lim.ratio.value = 20;
    lim.attack.value = 0.001;
    lim.release.value = 0.08;
    // …and a soft clip that guarantees nothing ever passes the ceiling
    const clip = ctx.createWaveShaper();
    clip.curve = ceilingCurve(LIMIT_CEILING_DB);
    clip.oversample = '2x';
    comp.connect(lim);
    lim.connect(clip);
    clip.connect(dest);
    this.master = ctx.createGain();
    this.master.connect(comp);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.connect(this.master);
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.music.attach(ctx, this.musicBus, this.noise);
    this.applyVolumes();
  }

  /** The sfx bus (the audio report measures sounds here, before the master chain). */
  get sfxOut(): AudioNode | null {
    return this.sfxBus;
  }

  setVolumes(master: number, music: number, sfx: number): void {
    this.volumes = { master, music, sfx };
    this.applyVolumes();
  }

  /** Lower everything while paused. */
  setDuck(amount: number): void {
    this.duck = amount;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.master || !this.sfxBus || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master * 0.9, t, 0.03);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx * this.duck, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.volumes.music * 0.5 * (0.35 + 0.65 * this.duck), t, 0.15);
  }

  // ───────────────────────────── primitives ─────────────────────────────

  private canPlay(key: string, minGap: number): boolean {
    if (!this.ctx || !this.sfxBus || (!this.offline && this.ctx.state !== 'running')) return false;
    if (this.voices > 40 && !this.offline) return false;
    const now = this.ctx.currentTime;
    const last = this.lastPlay.get(key) ?? -1;
    if (now - last < minGap) return false;
    this.lastPlay.set(key, now);
    // every sound plays at its mix-table trim
    this.g = mixGain(key);
    return true;
  }

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number): void {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private track(node: AudioScheduledSourceNode): void {
    this.voices++;
    node.onended = () => {
      this.voices--;
    };
  }

  tone(type: Wave, f0: number, f1: number, dur: number, vol: number, delay = 0, attack = 0.005, dest?: AudioNode): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    this.env(g, t, vol * this.g, attack, dur);
    o.connect(g);
    g.connect(dest ?? this.sfxBus!);
    o.start(t);
    o.stop(t + attack + dur + 0.05);
    this.track(o);
  }

  noiseHit(dur: number, vol: number, filter: BiquadFilterType, f0: number, f1: number, delay = 0, q = 1): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const bf = ctx.createBiquadFilter();
    bf.type = filter;
    bf.Q.value = q;
    bf.frequency.setValueAtTime(f0, t);
    bf.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain();
    this.env(g, t, vol * this.g, 0.004, dur);
    src.connect(bf);
    bf.connect(g);
    g.connect(this.sfxBus!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
    this.track(src);
  }

  private arp(notes: number[], step: number, type: Wave, vol: number, dur = 0.18): void {
    notes.forEach((f, i) => this.tone(type, f, f, dur, vol, i * step));
  }

  // ───────────────────────────── named sounds ─────────────────────────────

  /** Weapon / world SFX by id (from sim Sfx events). vol is 0..1 positional. */
  sfx(id: number, vol = 1): void {
    const name = SFX_NAMES[id];
    if (!name || !this.canPlay(name, name === 'dart' || name === 'bee' ? 0.07 : 0.05)) return;
    const v = Math.max(0.05, Math.min(1, vol));
    const r = 0.94 + Math.random() * 0.12;
    switch (name) {
      case 'thump':
        this.tone('sine', 150 * r, 48, 0.16, 0.5 * v);
        this.noiseHit(0.05, 0.18 * v, 'lowpass', 1200, 300);
        break;
      case 'dart':
        this.tone('triangle', 1100 * r, 650, 0.06, 0.12 * v);
        break;
      case 'lantern':
        this.tone('sine', 660 * r, 660, 0.35, 0.12 * v, 0, 0.02);
        this.tone('sine', 990 * r, 990, 0.3, 0.07 * v, 0.03, 0.02);
        break;
      case 'drum':
        this.tone('sine', 160 * r, 40, 0.3, 0.6 * v);
        this.noiseHit(0.12, 0.25 * v, 'lowpass', 2500, 200);
        break;
      case 'zap':
        this.tone('sawtooth', 1400 * r, 380, 0.14, 0.14 * v);
        this.noiseHit(0.1, 0.12 * v, 'bandpass', 4000, 1500, 0, 4);
        break;
      case 'disc':
        this.noiseHit(0.25, 0.16 * v, 'bandpass', 500, 2400, 0, 3);
        break;
      case 'seed':
        this.tone('sine', 520 * r, 220, 0.09, 0.2 * v);
        break;
      case 'bee':
        this.tone('sawtooth', 240 * r, 300, 0.12, 0.06 * v);
        break;
      case 'frost':
        this.tone('triangle', 1900 * r, 1250, 0.16, 0.1 * v);
        this.tone('sine', 2600 * r, 2400, 0.12, 0.05 * v, 0.02);
        break;
      case 'explode':
        this.noiseHit(0.6, 0.5 * v, 'lowpass', 2600, 120);
        this.tone('sine', 90, 28, 0.5, 0.6 * v);
        break;
      case 'shrine':
        this.tone('sine', 880 * r, 880, 0.5, 0.18 * v, 0, 0.005);
        this.tone('sine', 1320 * r, 1320, 0.6, 0.1 * v, 0.01, 0.005);
        this.noiseHit(0.06, 0.15 * v, 'highpass', 3000, 3000);
        break;
      case 'enemyShoot':
        this.tone('square', 320 * r, 520, 0.08, 0.05 * v);
        break;
      case 'slam':
        this.tone('sine', 70, 30, 0.45, 0.7 * v);
        this.noiseHit(0.35, 0.35 * v, 'lowpass', 900, 100);
        break;
      case 'roar':
        this.tone('sawtooth', 95, 55, 1.2, 0.25 * v, 0, 0.15);
        this.tone('sawtooth', 101, 58, 1.2, 0.2 * v, 0, 0.15);
        this.noiseHit(1.0, 0.18 * v, 'lowpass', 800, 200);
        break;
      case 'spores':
        this.noiseHit(0.25, 0.2 * v, 'highpass', 1500, 4000);
        break;
      case 'icicle':
        // a high crack and a glassy tinkle
        this.noiseHit(0.08, 0.3 * v, 'highpass', 5000, 3000);
        this.tone('triangle', 2600 * r, 1900, 0.18, 0.1 * v, 0.01);
        this.tone('sine', 3400 * r, 3100, 0.25, 0.06 * v, 0.04);
        break;
      case 'gust':
        // a long rising-falling whoosh
        this.noiseHit(1.6, 0.22 * v, 'bandpass', 300, 1400, 0, 0.8);
        this.noiseHit(1.2, 0.12 * v, 'bandpass', 900, 2600, 0.3, 1.2);
        break;
      case 'shatter':
        this.noiseHit(0.2, 0.3 * v, 'highpass', 3500, 6000);
        this.tone('triangle', 1800 * r, 900, 0.15, 0.1 * v);
        break;
      case 'bonk':
        // Thea's landing bonk: a woody thock with a little boom
        this.tone('sine', 220 * r, 70, 0.18, 0.45 * v);
        this.noiseHit(0.06, 0.25 * v, 'bandpass', 1400, 600, 0, 2);
        break;
    }
  }

  hit(crit: boolean): void {
    if (!this.canPlay(crit ? 'crit' : 'hit', 0.03)) return;
    this.noiseHit(0.035, crit ? 0.12 : 0.06, 'highpass', 3000, 2000);
    if (crit) this.tone('square', 1400, 900, 0.05, 0.04);
  }

  kill(boss = false): void {
    if (boss) {
      this.sfx(SFX_NAMES.indexOf('explode'), 1);
      if (!this.canPlay('bossKill', 0.5)) return;
      this.arp([523, 659, 784, 1047, 1319], 0.09, 'triangle', 0.18, 0.3);
      return;
    }
    if (!this.canPlay('kill', 0.035)) return;
    const f = 280 + Math.random() * 160;
    this.tone('sine', f, f * 2.2, 0.07, 0.16);
  }

  gem(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.gemStreak = now - this.lastGem < 0.45 ? Math.min(24, this.gemStreak + 1) : 0;
    this.lastGem = now;
    if (!this.canPlay('gem', 0.03)) return;
    // a rising chime up a pentatonic scale while the pickups keep coming
    const k = this.gemStreak;
    const f = 880 * Math.pow(2, (PENTA[k % 5] + 12 * Math.floor(k / 5)) / 12);
    this.tone('sine', f, f, 0.08, 0.07);
    this.tone('sine', f * 2, f * 2, 0.05, 0.02, 0.01);
  }

  coin(): void {
    if (!this.canPlay('coin', 0.05)) return;
    this.tone('square', 1300, 1300, 0.05, 0.05);
    this.tone('square', 1750, 1750, 0.12, 0.05, 0.05);
  }

  levelUp(): void {
    if (!this.canPlay('levelup', 0.2)) return;
    this.arp([523, 659, 784, 1047], 0.07, 'triangle', 0.2, 0.25);
    this.arp([1047, 1319], 0.07, 'sine', 0.08, 0.4);
  }

  hurt(): void {
    if (!this.canPlay('hurt', 0.12)) return;
    this.tone('square', 220, 90, 0.18, 0.16);
    this.noiseHit(0.1, 0.2, 'lowpass', 1600, 400);
  }

  heal(): void {
    if (!this.canPlay('heal', 0.2)) return;
    this.tone('sine', 440, 880, 0.3, 0.12, 0, 0.03);
  }

  jump(): void {
    if (!this.canPlay('jump', 0.08)) return;
    this.tone('sine', 280, 520, 0.09, 0.1);
  }

  land(impact: number): void {
    if (!this.canPlay('land', 0.1)) return;
    this.tone('sine', 120, 50, 0.12, Math.min(0.4, impact * 0.02));
  }

  slide(): void {
    if (!this.canPlay('slide', 0.2)) return;
    this.noiseHit(0.3, 0.12, 'bandpass', 900, 300, 0, 1.5);
  }

  chest(): void {
    if (!this.canPlay('chest', 0.3)) return;
    this.arp([392, 523, 659, 784, 1047, 1319], 0.06, 'triangle', 0.16, 0.3);
    this.noiseHit(0.5, 0.06, 'highpass', 6000, 8000, 0.3);
  }

  evolve(): void {
    if (!this.canPlay('evolve', 0.5)) return;
    this.tone('sawtooth', 220, 1760, 0.8, 0.08, 0, 0.1);
    this.arp([523, 784, 1047, 1568, 2093], 0.1, 'sine', 0.14, 0.5);
  }

  banner(boss: boolean): void {
    if (!this.canPlay(boss ? 'bossBanner' : 'banner', 0.5)) return;
    if (boss) {
      this.tone('sawtooth', 110, 104, 1.4, 0.18, 0, 0.05);
      this.tone('sawtooth', 165, 156, 1.4, 0.12, 0, 0.05);
    } else this.tone('sine', 330, 330, 0.8, 0.1, 0, 0.02);
  }

  achievement(): void {
    if (!this.canPlay('achievement', 0.5)) return;
    this.arp([659, 784, 988, 1319], 0.08, 'square', 0.06, 0.3);
  }

  /** Play any sound by its mix-table name (the audio report renders each one this way). */
  play(name: string): void {
    const id = (SFX_NAMES as readonly string[]).indexOf(name);
    if (id >= 0) {
      this.sfx(id, 1);
      return;
    }
    switch (name) {
      case 'hit':
      case 'crit':
        return this.hit(name === 'crit');
      case 'kill':
      case 'bossKill':
        return this.kill(name === 'bossKill');
      case 'gem':
        return this.gem();
      case 'coin':
        return this.coin();
      case 'levelUp':
        return this.levelUp();
      case 'hurt':
        return this.hurt();
      case 'heal':
        return this.heal();
      case 'jump':
        return this.jump();
      case 'land':
        return this.land(14);
      case 'slide':
        return this.slide();
      case 'chest':
        return this.chest();
      case 'evolve':
        return this.evolve();
      case 'banner':
      case 'bossBanner':
        return this.banner(name === 'bossBanner');
      case 'achievement':
        return this.achievement();
      case 'heartbeat':
        return this.heartbeat();
      case 'stingerWin':
      case 'stingerLose':
        return this.stinger(name === 'stingerWin');
      default:
        if (name.startsWith('ui-')) this.ui(name.slice(3) as 'click' | 'buy' | 'error' | 'back' | 'open');
    }
  }

  ui(kind: 'click' | 'buy' | 'error' | 'back' | 'open'): void {
    if (!this.canPlay(`ui-${kind}`, 0.04)) return;
    switch (kind) {
      case 'click':
        this.tone('triangle', 900, 700, 0.04, 0.08);
        break;
      case 'back':
        this.tone('triangle', 600, 420, 0.05, 0.08);
        break;
      case 'buy':
        this.tone('square', 1047, 1047, 0.06, 0.06);
        this.tone('square', 1568, 1568, 0.14, 0.06, 0.06);
        break;
      case 'error':
        this.tone('square', 160, 120, 0.15, 0.08);
        break;
      case 'open':
        this.arp([523, 784, 1047], 0.05, 'triangle', 0.12, 0.2);
        break;
    }
  }

  heartbeat(): void {
    if (!this.canPlay('heartbeat', 0.9)) return;
    this.tone('sine', 70, 45, 0.12, 0.35);
    this.tone('sine', 65, 40, 0.14, 0.28, 0.2);
  }

  stinger(win: boolean): void {
    if (!this.canPlay(win ? 'stingerWin' : 'stingerLose', 1)) return;
    if (win) this.arp([523, 659, 784, 1047, 784, 1047, 1319], 0.13, 'triangle', 0.2, 0.5);
    else this.arp([392, 330, 262, 196], 0.18, 'triangle', 0.18, 0.5);
  }
}

/** Pentatonic steps (semitones) for the gem chimes. */
const PENTA = [0, 2, 4, 7, 9];

/** Soft clip: linear well below the ceiling, rounding off into it, never beyond it. */
export function ceilingCurve(ceilingDb: number): Float32Array<ArrayBuffer> {
  const n = 4096;
  const out = new Float32Array(new ArrayBuffer(n * 4));
  const c = Math.pow(10, ceilingDb / 20);
  const knee = c * 0.8;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const a = Math.abs(x);
    const y = a <= knee ? a : knee + (c - knee) * Math.tanh((a - knee) / (c - knee));
    out[i] = Math.sign(x) * Math.min(c, y);
  }
  return out;
}
