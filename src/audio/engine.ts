import type { SimEvent } from '../sim/events';
import type { World } from '../sim/world';
import { RespawnState, type Kart } from '../sim/kart';
import { findSong } from '../data/songs';
import type { ItemId } from '../data/types';
import type { GameAudio, UiSound } from './types';
import { Synth, midiToFreq } from './synth';
import { MusicPlayer } from './music';

interface EngineVoice {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  drift: GainNode;
  driftFilter: BiquadFilterNode;
  wind: GainNode;
}

/**
 * All game audio, synthesised live with the Web Audio API (no audio files):
 * music sequencer, one-shot effects for sim events, engines/drift/wind loops for local players.
 */
export class AudioEngine implements GameAudio {
  private ctx: AudioContext | null = null;
  private synth!: Synth;
  private master!: GainNode;
  private musicGain!: GainNode;
  private sfx!: GainNode;
  private music!: MusicPlayer;
  private voices: EngineVoice[] = [];
  private pack: EngineVoice | null = null;
  private vol = { master: 0.8, music: 0.6, sfx: 0.8 };
  private pendingSong: string | null = null;
  private finalLap = false;
  private lastUi = 0;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC({ latencyHint: 'interactive' });
    } catch {
      this.ctx = null;
      return;
    }
    const ctx = this.ctx;
    this.synth = new Synth(ctx);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.connect(comp);
    this.musicGain = ctx.createGain();
    this.musicGain.connect(this.master);
    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);
    this.music = new MusicPlayer(ctx, this.synth, this.musicGain);
    this.applyVolumes();
    if (ctx.state === 'suspended') void ctx.resume();
    if (this.pendingSong) {
      this.playMusic(this.pendingSong);
      this.pendingSong = null;
    }
  }

  setVolumes(master: number, music: number, sfx: number): void {
    this.vol = { master, music, sfx };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.02);
    this.musicGain.gain.setTargetAtTime(this.vol.music * 0.7, t, 0.02);
    this.sfx.gain.setTargetAtTime(this.vol.sfx, t, 0.02);
  }

  playMusic(songId: string): void {
    if (!this.ctx) {
      this.pendingSong = songId;
      return;
    }
    this.music.play(findSong(songId));
  }

  stopMusic(fade = 0.5): void {
    this.music?.stop(fade);
  }

  setFinalLap(on: boolean): void {
    if (this.finalLap === on) return;
    this.finalLap = on;
    this.music?.setTempo(on ? 1.12 : 1);
    if (on) this.fanfare([0, 4, 7, 12], 0.09, 'square', 0.08);
  }

  suspend(on: boolean): void {
    if (!this.ctx) return;
    this.music.suspend(on);
    if (on) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  // ---------------------------------------------------------------------------
  // building blocks
  // ---------------------------------------------------------------------------
  private get t(): number {
    return this.ctx!.currentTime + 0.005;
  }

  private tone(freq: number, dur: number, wave: OscillatorType | 'bell' | 'pluck' | 'organ', gain: number, delay = 0, glide?: number, vib = 0): void {
    if (!this.ctx) return;
    this.synth.note(this.sfx, this.t + delay, freq, dur, wave === 'sawtooth' ? 'saw' : (wave as never), gain, { glide, vibrato: vib });
  }

  private noise(dur: number, gain: number, type: BiquadFilterType, freq: number, sweepTo?: number, delay = 0, q = 1): void {
    if (!this.ctx) return;
    this.synth.noiseHit(this.sfx, this.t + delay, dur, gain, type, freq, q, sweepTo);
  }

  private fanfare(steps: number[], spacing: number, wave: OscillatorType | 'bell', gain: number, root = 72): void {
    steps.forEach((s, i) => this.tone(midiToFreq(root + s), spacing * 1.6, wave, gain, i * spacing));
  }

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  ui(sound: UiSound): void {
    if (!this.ctx) return;
    const now = performance.now();
    if (sound === 'move' && now - this.lastUi < 40) return;
    this.lastUi = now;
    switch (sound) {
      case 'move':
        this.tone(1320, 0.03, 'square', 0.03);
        break;
      case 'select':
        this.tone(880, 0.05, 'square', 0.05);
        this.tone(1320, 0.07, 'square', 0.05, 0.05);
        break;
      case 'back':
        this.tone(660, 0.05, 'square', 0.045);
        this.tone(440, 0.07, 'square', 0.045, 0.05);
        break;
      case 'error':
        this.tone(180, 0.12, 'square', 0.06);
        this.tone(150, 0.14, 'square', 0.06, 0.1);
        break;
      case 'coin':
        this.tone(1568, 0.05, 'square', 0.04);
        this.tone(2093, 0.12, 'square', 0.04, 0.05);
        break;
      case 'start':
        this.noise(0.5, 0.12, 'bandpass', 400, 3000);
        this.fanfare([0, 4, 7, 12, 16], 0.07, 'bell', 0.1, 72);
        break;
      case 'unlock':
        this.fanfare([0, 4, 7, 12, 16, 19, 24], 0.06, 'bell', 0.12, 76);
        this.noise(0.6, 0.05, 'highpass', 6000);
        break;
      case 'fanfare':
        this.fanfare([0, 0, 0, 4, 7, 4, 7, 12], 0.12, 'square', 0.08, 67);
        this.fanfare([12, 12, 12, 16, 19, 16, 19, 24], 0.12, 'bell', 0.06, 67);
        break;
      case 'cheer':
        this.noise(1.4, 0.08, 'bandpass', 900, 1400, 0, 0.5);
        this.tone(1200, 0.5, 'sine', 0.03, 0.2, 1.6, 0.02);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // sim events
  // ---------------------------------------------------------------------------
  /** 0..1 loudness for an event at kart k, based on distance to the nearest local kart. */
  private near(world: World, k: Kart, locals: number[]): number {
    if (locals.includes(k.index)) return 1;
    let best = Infinity;
    for (const i of locals) {
      const l = world.karts[i];
      best = Math.min(best, Math.hypot(l.x - k.x, l.z - k.z));
    }
    return best > 70 ? 0 : 1 - best / 70;
  }

  private nearPos(world: World, x: number, z: number, locals: number[]): number {
    let best = Infinity;
    for (const i of locals) {
      const l = world.karts[i];
      best = Math.min(best, Math.hypot(l.x - x, l.z - z));
    }
    return best > 70 ? 0 : 1 - best / 70;
  }

  onSimEvent(e: SimEvent, world: World, locals: number[]): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ks = world.karts;
    const isLocal = (i: number): boolean => locals.includes(i);
    switch (e.type) {
      case 'countdown':
        this.tone(660, 0.18, 'square', 0.08);
        break;
      case 'go':
        this.tone(1320, 0.45, 'square', 0.09);
        this.tone(990, 0.45, 'square', 0.05);
        break;
      case 'startBoost':
        if (!isLocal(e.kart)) break;
        if (e.good) this.noise(0.6, 0.18, 'bandpass', 300, 2500);
        else for (let i = 0; i < 3; i++) this.noise(0.06, 0.12, 'lowpass', 300, undefined, i * 0.12);
        break;
      case 'hop':
        if (isLocal(e.kart)) this.tone(300, 0.06, 'square', 0.025, 0, 1.4);
        break;
      case 'driftTier':
        if (isLocal(e.kart)) this.tone([0, 880, 1175, 1568][e.tier], 0.12, 'bell', 0.08);
        break;
      case 'miniTurbo': {
        const v = this.near(world, ks[e.kart], locals);
        if (v <= 0) break;
        this.noise(0.45 + e.tier * 0.12, 0.16 * v, 'bandpass', 500, 3000 + e.tier * 800);
        if (isLocal(e.kart)) this.tone(220 + e.tier * 80, 0.35, 'sawtooth', 0.04, 0, 2);
        break;
      }
      case 'boostPad': {
        const v = this.near(world, ks[e.kart], locals);
        if (v > 0) this.noise(0.5, 0.14 * v, 'bandpass', 600, 3500);
        if (isLocal(e.kart)) this.tone(440, 0.3, 'square', 0.03, 0, 2);
        break;
      }
      case 'launch':
        if (isLocal(e.kart)) this.noise(e.glider ? 0.9 : 0.4, 0.1, 'bandpass', 400, e.glider ? 1800 : 1200);
        break;
      case 'trick':
        if (isLocal(e.kart)) this.fanfare([0, 7, 12], 0.05, 'bell', 0.07, 84);
        break;
      case 'land': {
        const v = this.near(world, ks[e.kart], locals);
        if (v <= 0) break;
        this.noise(0.18, Math.min(0.25, 0.03 * e.impact) * v, 'lowpass', 400);
        this.tone(90, 0.12, 'sine', 0.12 * v, 0, 0.6);
        if (e.trick && isLocal(e.kart)) this.tone(1568, 0.25, 'bell', 0.08, 0.02);
        break;
      }
      case 'wall': {
        const v = this.near(world, ks[e.kart], locals);
        if (v > 0) this.noise(0.15, (0.08 + e.strength * 0.15) * v, 'lowpass', 600);
        break;
      }
      case 'bump': {
        const v = Math.max(this.near(world, ks[e.kart], locals), this.near(world, ks[e.other], locals));
        if (v > 0) this.tone(180, 0.12, 'triangle', (0.06 + e.strength * 0.1) * v, 0, 0.6);
        break;
      }
      case 'fall':
        if (isLocal(e.kart)) this.tone(900, 0.7, 'sine', 0.08, 0, 0.22);
        break;
      case 'respawn':
        if (isLocal(e.kart)) {
          this.tone(880, 0.08, 'square', 0.05);
          this.tone(1175, 0.12, 'square', 0.05, 0.1);
        }
        break;
      case 'lap':
        if (isLocal(e.kart) && !e.final) {
          this.tone(1047, 0.1, 'bell', 0.09);
          this.tone(1319, 0.2, 'bell', 0.09, 0.1);
        }
        break;
      case 'finish':
        if (isLocal(e.kart)) {
          if (e.rank <= 3) this.fanfare([0, 4, 7, 12, 7, 12, 16], 0.1, 'square', 0.08, 67);
          else this.fanfare([0, 4, 7, 5, 9, 12], 0.12, 'triangle', 0.08, 67);
        }
        break;
      case 'rank':
        if (isLocal(e.kart)) this.tone(e.to < e.from ? 990 : 440, 0.07, 'square', 0.035, 0, e.to < e.from ? 1.3 : 0.75);
        break;
      case 'wrongWay':
        if (isLocal(e.kart) && e.on) {
          this.tone(200, 0.15, 'square', 0.06);
          this.tone(200, 0.15, 'square', 0.06, 0.22);
        }
        break;
      case 'boxBreak': {
        const v = this.nearPos(world, e.x, e.z, locals);
        if (v > 0.3) {
          this.fanfare([0, 7, 12], 0.035, 'bell', 0.06 * v, 88);
          this.noise(0.1, 0.05 * v, 'highpass', 5000);
        }
        break;
      }
      case 'itemRoll':
        if (isLocal(e.kart)) for (let i = 0; i < 12; i++) this.tone(700 + i * 60, 0.03, 'square', 0.025, i * 0.075);
        break;
      case 'itemGet':
        if (isLocal(e.kart)) this.fanfare([0, 12], 0.06, 'bell', 0.09, 79);
        break;
      case 'itemUse': {
        const v = this.near(world, ks[e.kart], locals);
        if (v > 0) this.itemUseSound(e.item, v, isLocal(e.kart));
        break;
      }
      case 'itemHit': {
        const v = this.near(world, ks[e.kart], locals);
        if (v <= 0) break;
        if (e.effect === 'spin' || e.effect === 'tumble') {
          this.tone(1200, 0.55, 'sine', 0.08 * v, 0, 0.3, 0.03);
          this.tone(130, 0.12, 'triangle', 0.14 * v, 0, 0.6);
        } else if (e.effect === 'goo') {
          this.noise(0.3, 0.14 * v, 'lowpass', 900, 200);
          this.tone(160, 0.3, 'sine', 0.1 * v, 0, 0.5);
        } else if (e.effect === 'bounce') {
          this.tone(200, 0.4, 'sine', 0.12 * v, 0, 3.2, 0.04);
        } else if (e.effect === 'cloud') {
          this.noise(0.6, 0.1 * v, 'lowpass', 1200, 300);
        }
        break;
      }
      case 'blocked':
      case 'shieldPop': {
        const v = this.near(world, ks[e.kart], locals);
        if (v > 0) {
          this.tone(600, 0.12, 'sine', 0.1 * v, 0, 2.5);
          this.noise(0.08, 0.06 * v, 'highpass', 4000);
        }
        break;
      }
      case 'dodge':
        if (isLocal(e.kart)) {
          this.noise(0.4, 0.1, 'bandpass', 2500, 600);
          this.fanfare([0, 4, 7, 12], 0.05, 'bell', 0.08, 84);
        }
        break;
      case 'explode': {
        const v = this.nearPos(world, e.x, e.z, locals);
        if (v <= 0) break;
        if (e.item === 'popper') {
          this.noise(0.12, 0.25 * v, 'bandpass', 1500);
          for (let i = 0; i < 6; i++) this.tone(1500 + i * 220, 0.06, 'bell', 0.04 * v, 0.05 + i * 0.04);
        } else this.noise(0.15, 0.12 * v, 'lowpass', 1200);
        break;
      }
      case 'incoming':
        break;
      case 'balloonPop': {
        const v = this.near(world, ks[e.kart], locals);
        if (v > 0) {
          this.noise(0.06, 0.25 * v, 'bandpass', 2000);
          this.tone(900, 0.2, 'sine', 0.06 * v, 0.03, 0.4);
        }
        if (e.by >= 0 && isLocal(e.by)) this.ui('coin');
        break;
      }
      case 'shortcut':
        if (isLocal(e.kart)) this.fanfare([0, 4, 7], 0.04, 'bell', 0.05, 88);
        break;
      case 'hazard': {
        const v = this.near(world, ks[e.kart], locals);
        if (v <= 0) break;
        if (e.kind === 'bumper') this.tone(520, 0.3, 'sine', 0.14 * v, 0, 1.6, 0.05);
        else if (e.kind === 'geyser') this.noise(0.8, 0.16 * v, 'bandpass', 300, 2000);
        else this.tone(150, 0.15, 'triangle', 0.12 * v, 0, 0.6);
        break;
      }
      default:
        break;
    }
  }

  private itemUseSound(item: ItemId, v: number, local: boolean): void {
    switch (item) {
      case 'bumperBall':
        this.tone(380, 0.22, 'sine', 0.12 * v, 0, 0.4);
        break;
      case 'paperPlane':
        this.noise(0.5, 0.1 * v, 'bandpass', 800, 3000);
        break;
      case 'gooPuddle':
        this.noise(0.25, 0.12 * v, 'lowpass', 700, 200);
        this.tone(220, 0.2, 'sine', 0.08 * v, 0, 0.5);
        break;
      case 'turbo':
      case 'turbo3':
        this.noise(0.25, 0.1 * v, 'highpass', 3000);
        this.noise(0.6, 0.16 * v, 'bandpass', 400, 2800, 0.05);
        break;
      case 'magnet':
        this.tone(300, 0.7, 'sine', 0.1 * v, 0, 1.5, 0.08);
        break;
      case 'shield':
        this.fanfare([0, 7, 12, 19], 0.04, 'bell', 0.07 * v, 84);
        break;
      case 'cloud':
        this.noise(0.7, 0.1 * v, 'lowpass', 900, 300);
        break;
      case 'tornado':
        this.noise(1.2, 0.12 * v, 'bandpass', 300, 1600, 0, 2);
        break;
      case 'rocketDash':
        this.noise(1.6, 0.22 * v, 'bandpass', 200, 2400);
        if (local) this.tone(110, 1.4, 'sawtooth', 0.05, 0, 3);
        break;
      case 'springTrap':
        this.tone(250, 0.3, 'sine', 0.1 * v, 0, 2.2, 0.06);
        break;
      case 'popper':
        this.noise(0.08, 0.14 * v, 'bandpass', 1200);
        this.tone(500, 0.3, 'sine', 0.05 * v, 0, 1.8);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // continuous engine / drift / wind loops for local players (+ one "pack" voice for nearby AI)
  // ---------------------------------------------------------------------------
  private makeVoice(gainScale: number): EngineVoice {
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    const g2 = ctx.createGain();
    g2.gain.value = 0.5;
    osc1.connect(filter);
    osc2.connect(g2).connect(filter);
    filter.connect(gain).connect(this.sfx);
    osc1.start();
    osc2.start();
    const noise = ctx.createBufferSource();
    noise.buffer = this.synth.noise;
    noise.loop = true;
    const driftFilter = ctx.createBiquadFilter();
    driftFilter.type = 'bandpass';
    driftFilter.frequency.value = 2600;
    driftFilter.Q.value = 3;
    const drift = ctx.createGain();
    drift.gain.value = 0;
    noise.connect(driftFilter).connect(drift).connect(this.sfx);
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 500;
    const wind = ctx.createGain();
    wind.gain.value = 0;
    noise.connect(windFilter).connect(wind).connect(this.sfx);
    noise.start();
    void gainScale;
    return { osc1, osc2, filter, gain, drift, driftFilter, wind };
  }

  private disposeVoice(v: EngineVoice): void {
    try {
      v.osc1.stop();
      v.osc2.stop();
    } catch {
      /* already stopped */
    }
    v.gain.disconnect();
    v.drift.disconnect();
    v.wind.disconnect();
  }

  update(world: World | null, locals: number[], dt: number): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    void dt;
    const want = world ? locals.length : 0;
    while (this.voices.length < want) this.voices.push(this.makeVoice(1));
    while (this.voices.length > want) this.disposeVoice(this.voices.pop()!);
    if (world && !this.pack) this.pack = this.makeVoice(0.5);
    if (!world && this.pack) {
      this.disposeVoice(this.pack);
      this.pack = null;
    }
    if (!world) return;
    const t = this.ctx.currentTime;
    const split = locals.length > 1 ? 0.7 : 1;
    for (let i = 0; i < want; i++) {
      const k = world.karts[locals[i]];
      const v = this.voices[i];
      this.driveVoice(v, k, t, 0.055 * split, world);
    }
    // nearest AI kart drives the "pack" voice
    let nearest: Kart | null = null;
    let nd = Infinity;
    for (const k of world.karts) {
      if (locals.includes(k.index)) continue;
      for (const li of locals) {
        const l = world.karts[li];
        const d = Math.hypot(l.x - k.x, l.z - k.z);
        if (d < nd) {
          nd = d;
          nearest = k;
        }
      }
    }
    if (this.pack) {
      if (nearest && nd < 30) this.driveVoice(this.pack, nearest, t, 0.03 * (1 - nd / 30), world);
      else this.pack.gain.gain.setTargetAtTime(0, t, 0.1);
    }
  }

  private driveVoice(v: EngineVoice, k: Kart, t: number, vol: number, world: World): void {
    const running = world.phase === 'race' || world.phase === 'countdown' || world.phase === 'done';
    const speed = Math.max(0, Math.abs(k.speed));
    const rev = k.input.throttle > 0.1 && world.phase === 'countdown' ? 18 : 0;
    const base = 52 + (speed + rev) * 4.4 * (k.boosting ? 1.18 : 1);
    v.osc1.frequency.setTargetAtTime(base, t, 0.05);
    v.osc2.frequency.setTargetAtTime(base * 0.5 + 3, t, 0.05);
    v.filter.frequency.setTargetAtTime(500 + speed * 40 + (k.boosting ? 800 : 0), t, 0.05);
    const alive = running && k.respawnState === RespawnState.None;
    v.gain.gain.setTargetAtTime(alive ? vol * (0.6 + Math.min(1, speed / 25) * 0.4) : 0, t, 0.08);
    const sliding = k.grounded && (k.drifting || Math.abs(k.slip) > 4) && !k.offroad;
    v.drift.gain.setTargetAtTime(alive && sliding ? 0.035 * (vol / 0.055) : 0, t, 0.05);
    v.driftFilter.frequency.setTargetAtTime(k.drifting ? 2200 + k.driftTier * 500 : 2600, t, 0.05);
    v.wind.gain.setTargetAtTime(alive && (k.gliding || (!k.grounded && k.airTime > 0.3)) ? 0.08 * (vol / 0.055) : k.offroad && speed > 5 ? 0.05 * (vol / 0.055) : 0, t, 0.1);
  }
}
