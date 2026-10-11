import { ENEMIES } from '../data/enemies';
import { TOWERS, type TowerId } from '../data/towers';
import { Ev, type GameEvent } from '../sim/events';
import { mtof, MusicPlayer } from './music';

type UiSound = 'click' | 'back' | 'deny' | 'pick' | 'star';

type Sfx =
  | 'arrow'
  | 'cannon'
  | 'fire'
  | 'water'
  | 'nature'
  | 'light'
  | 'shadow'
  | 'earth'
  | 'poof'
  | 'bigpoof'
  | 'coin'
  | 'leak'
  | 'build'
  | 'upgrade'
  | 'sell'
  | 'wave'
  | 'clear'
  | 'crystal'
  | 'win'
  | 'lose'
  | 'boss'
  | 'stun'
  | 'heal'
  | 'splash'
  | UiSound;

/** Minimum seconds between two plays of the same sound (keeps big fights pleasant). */
const MIN_GAP: Partial<Record<Sfx, number>> = {
  arrow: 0.06,
  cannon: 0.09,
  fire: 0.08,
  water: 0.07,
  nature: 0.07,
  light: 0.07,
  shadow: 0.09,
  earth: 0.12,
  poof: 0.045,
  coin: 0.07,
  splash: 0.08,
  stun: 0.15,
  heal: 0.3,
};

const MAX_VOICES = 22;

/**
 * Everything audible is synthesised here with the Web Audio API — no sound
 * files. Safe to call before unlock (calls are ignored until a gesture).
 */
export class AudioEngine {
  musicVolume = 0.5;
  sfxVolume = 0.8;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private music: MusicPlayer | null = null;
  private wantedTrack: string | null = null;
  private baseTrack: string | null = null;
  private last = new Map<Sfx, number>();
  private voices = 0;
  private bossAlive = 0;

  /** Must be called from a user gesture (iOS/Safari autoplay rules). */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        const ctx = new Ctor({ latencyHint: 'interactive' });
        this.ctx = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = 0.9;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.ratio.value = 4;
        this.master.connect(comp).connect(ctx.destination);
        this.musicGain = ctx.createGain();
        this.sfxGain = ctx.createGain();
        this.musicGain.connect(this.master);
        this.sfxGain.connect(this.master);
        const len = ctx.sampleRate;
        this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.music = new MusicPlayer(ctx, this.musicGain, this.noise);
        this.applyVolumes();
        // iOS: play one silent buffer inside the gesture
        const s = ctx.createBufferSource();
        s.buffer = ctx.createBuffer(1, 1, 22050);
        s.connect(ctx.destination);
        s.start(0);
      }
      if (this.ctx.state === 'suspended' && !document.hidden) void this.ctx.resume();
      if (this.wantedTrack && this.music?.current !== this.wantedTrack) this.music?.play(this.wantedTrack);
    } catch {
      this.ctx = null;
    }
  }

  setVolumes(music: number, sfx: number): void {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // perceptual curve
    this.musicGain?.gain.setTargetAtTime(Math.pow(this.musicVolume, 1.6) * 0.55, t, 0.05);
    this.sfxGain?.gain.setTargetAtTime(Math.pow(this.sfxVolume, 1.4) * 0.8, t, 0.05);
  }

  playMusic(track: string): void {
    this.baseTrack = track;
    this.bossAlive = 0;
    this.switchTrack(track);
  }

  private switchTrack(track: string): void {
    this.wantedTrack = track;
    if (this.ctx && this.ctx.state === 'running') this.music?.play(track);
  }

  stopMusic(): void {
    this.wantedTrack = null;
    this.music?.stop();
  }

  suspend(): void {
    void this.ctx?.suspend().catch(() => {});
  }

  resume(): void {
    if (!this.ctx) return;
    void this.ctx.resume().then(() => {
      if (this.wantedTrack && this.music?.current !== this.wantedTrack) this.music?.play(this.wantedTrack);
    });
  }

  ui(name: UiSound): void {
    this.play(name);
  }

  onGameEvent(e: GameEvent): void {
    if (!this.ctx) return;
    switch (e.type) {
      case Ev.Fire: {
        const def = TOWERS[e.kind as TowerId];
        if (!def) return;
        if (def.id === 'arrow') this.play('arrow');
        else if (def.id === 'cannon') this.play('cannon');
        else this.play(def.elements[0] as Sfx);
        break;
      }
      case Ev.Chain:
        if (e.value === 0 && e.kind !== 'poison') this.play('light');
        break;
      case Ev.Pulse:
        this.play(e.kind === 'gravity' || e.kind === 'whirlpool' ? 'shadow' : 'earth');
        break;
      case Ev.Splash:
        if (e.kind === 'flare' || e.kind === 'lava') this.play('splash');
        break;
      case Ev.Kill: {
        const boss = ENEMIES[e.kind as keyof typeof ENEMIES]?.boss;
        this.play(boss ? 'bigpoof' : 'poof');
        if (e.value >= 3 || boss) this.play('coin');
        if (boss && --this.bossAlive <= 0 && this.baseTrack) {
          this.bossAlive = 0;
          this.switchTrack(this.baseTrack);
        }
        break;
      }
      case Ev.Leak:
        this.play('leak');
        break;
      case Ev.Build:
        this.play('build');
        break;
      case Ev.Upgrade:
        this.play('upgrade');
        break;
      case Ev.Sell:
        this.play('sell');
        break;
      case Ev.WaveStart:
        this.play('wave');
        break;
      case Ev.WaveClear:
        this.play('clear');
        break;
      case Ev.Crystal:
      case Ev.ElementPicked:
        this.play('crystal');
        break;
      case Ev.BossSpawn:
        this.play('boss');
        this.bossAlive++;
        this.switchTrack('boss');
        break;
      case Ev.Victory:
        this.music?.stop();
        this.play('win');
        break;
      case Ev.Defeat:
        this.music?.stop();
        this.play('lose');
        break;
      case Ev.Stun:
        this.play('stun');
        break;
      case Ev.Heal:
        if (e.kind === 'heal') this.play('heal');
        break;
    }
  }

  // ---------------------------------------------------------------- synthesis

  private play(name: Sfx): void {
    const c = this.ctx;
    if (!c || c.state !== 'running' || this.sfxVolume <= 0.001) return;
    const now = c.currentTime;
    const gap = MIN_GAP[name] ?? 0.03;
    if (now - (this.last.get(name) ?? -1) < gap) return;
    if (this.voices >= MAX_VOICES) return;
    this.last.set(name, now);
    const t = now + 0.005;
    switch (name) {
      case 'arrow':
        this.osc('triangle', 1100, 520, t, 0.07, 0.12);
        this.burst(t, 0.03, 3000, 0.06, 'highpass');
        break;
      case 'cannon':
        this.osc('sine', 180, 55, t, 0.18, 0.35);
        this.burst(t, 0.1, 900, 0.18, 'lowpass');
        break;
      case 'fire':
        this.burst(t, 0.18, 1200, 0.16, 'bandpass', 400);
        this.osc('sawtooth', 220, 110, t, 0.12, 0.05);
        break;
      case 'water':
        this.osc('sine', 380, 900, t, 0.1, 0.2);
        break;
      case 'nature':
        this.osc('triangle', 660, 640, t, 0.09, 0.14);
        this.osc('triangle', 990, 980, t + 0.03, 0.07, 0.07);
        break;
      case 'light':
        this.osc('square', 1600, 2400, t, 0.06, 0.06);
        this.osc('sine', 2400, 1200, t, 0.08, 0.08);
        break;
      case 'shadow':
        this.osc('sine', 300, 140, t, 0.2, 0.2, 7);
        break;
      case 'earth':
        this.osc('sine', 110, 40, t, 0.22, 0.4);
        this.burst(t, 0.12, 400, 0.18, 'lowpass');
        break;
      case 'poof':
        this.osc('sine', 520, 1250, t, 0.08, 0.16);
        this.osc('triangle', 1760, 1760, t + 0.04, 0.06, 0.05);
        break;
      case 'bigpoof':
        this.burst(t, 0.4, 2500, 0.3, 'lowpass');
        this.notes([60, 64, 67, 72, 76], t, 0.08, 'triangle', 0.18);
        break;
      case 'coin':
        this.osc('square', mtof(83), mtof(83), t, 0.05, 0.06);
        this.osc('square', mtof(88), mtof(88), t + 0.05, 0.14, 0.06);
        break;
      case 'leak':
        this.osc('triangle', 520, 180, t, 0.4, 0.22);
        break;
      case 'build':
        this.osc('sine', 300, 600, t, 0.08, 0.25);
        this.osc('triangle', mtof(79), mtof(79), t + 0.07, 0.12, 0.1);
        break;
      case 'upgrade':
        this.notes([67, 71, 74, 79], t, 0.06, 'triangle', 0.16);
        break;
      case 'sell':
        this.notes([84, 79, 76], t, 0.05, 'square', 0.06);
        break;
      case 'wave':
        this.notes([60, 67], t, 0.12, 'square', 0.09);
        break;
      case 'clear':
        this.notes([72, 76, 79, 84], t, 0.07, 'triangle', 0.14);
        break;
      case 'crystal':
        this.notes([79, 83, 86, 91, 95], t, 0.06, 'sine', 0.18);
        break;
      case 'win':
        this.notes([60, 64, 67, 72, 67, 72, 76, 79, 84], t, 0.11, 'square', 0.11);
        this.notes([48, 55, 60], t, 0.33, 'triangle', 0.15);
        break;
      case 'lose':
        this.notes([67, 64, 60, 55], t, 0.22, 'triangle', 0.16);
        break;
      case 'boss':
        this.osc('sawtooth', 90, 45, t, 0.6, 0.25);
        this.burst(t, 0.5, 300, 0.25, 'lowpass');
        break;
      case 'stun':
        this.osc('sine', 1500, 1200, t, 0.1, 0.08, 18);
        break;
      case 'heal':
        this.notes([76, 81], t, 0.08, 'sine', 0.08);
        break;
      case 'splash':
        this.burst(t, 0.3, 1500, 0.22, 'lowpass');
        this.osc('sine', 200, 60, t, 0.25, 0.25);
        break;
      case 'click':
        this.osc('triangle', 900, 700, t, 0.04, 0.1);
        break;
      case 'back':
        this.osc('triangle', 600, 450, t, 0.05, 0.1);
        break;
      case 'deny':
        this.osc('square', 200, 160, t, 0.12, 0.07);
        break;
      case 'pick':
        this.notes([72, 79, 84], t, 0.07, 'triangle', 0.16);
        break;
      case 'star':
        this.notes([84, 88, 91, 96], t, 0.08, 'sine', 0.16);
        break;
    }
  }

  private track(node: AudioScheduledSourceNode): void {
    this.voices++;
    node.onended = () => {
      this.voices--;
    };
  }

  /** Oscillator with pitch sweep and a quick envelope. `wobble` adds vibrato (Hz). */
  private osc(type: OscillatorType, f0: number, f1: number, t: number, dur: number, vol: number, wobble = 0): void {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (wobble) {
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = wobble;
      lg.gain.value = f0 * 0.08;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxGain!);
    o.start(t);
    o.stop(t + dur + 0.02);
    this.track(o);
  }

  /** Filtered noise burst. */
  private burst(t: number, dur: number, freq: number, vol: number, type: BiquadFilterType, sweepTo?: number): void {
    const c = this.ctx!;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.sfxGain!);
    s.start(t, Math.random() * 0.6);
    s.stop(t + dur + 0.02);
    this.track(s);
  }

  private notes(midis: number[], t: number, step: number, type: OscillatorType, vol: number): void {
    midis.forEach((m, i) => this.osc(type, mtof(m), mtof(m), t + i * step, step * 1.6, vol));
  }
}
