import { ENEMIES } from '../data/enemies';
import { TOWERS, type TowerId } from '../data/towers';
import { Ev, type GameEvent } from '../sim/events';
import { musicIntensity, type IntensityInput } from './intensity';
import { MIX } from './mix';
import { MusicPlayer, THEME_TRACK, TRACKS } from './music';
import { MIN_GAP, SFX, STINGER_DUCK, STINGERS, type SfxName, type StingerName } from './sfx';
import { makeNoise, masterChain, Synth } from './synth';

type UiSound = 'click' | 'back' | 'deny' | 'pick' | 'star';

const MAX_VOICES = 24;
/** Music ducks to this level under long stingers. */
const DUCK = 0.35;

/**
 * Everything audible is synthesised here with the Web Audio API — no sound
 * files. Safe to call before unlock (calls are ignored until a gesture).
 *
 * Graph: sfx bus ─┐
 *        music bus → duck ─┼→ master → glue compressor → limiter → speakers
 *        stinger bus ──────┘ (stingers follow the music volume)
 */
export class AudioEngine {
  musicVolume = 0.5;
  sfxVolume = 0.8;
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private duck: GainNode | null = null;
  private stingerGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private sfxSyn: Synth | null = null;
  private musicSyn: Synth | null = null;
  private music: MusicPlayer | null = null;
  private wantedTrack: string | null = null;
  private baseTrack: string | null = null;
  private last = new Map<SfxName, number>();
  private bossAlive = 0;
  private totalWaves = Infinity;
  private wantedIntensity = 0.45;

  /** Must be called from a user gesture (iOS/Safari autoplay rules). */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        const ctx = new Ctor({ latencyHint: 'interactive' });
        this.ctx = ctx;
        const master = masterChain(ctx);
        this.musicGain = ctx.createGain();
        this.duck = ctx.createGain();
        this.stingerGain = ctx.createGain();
        this.sfxGain = ctx.createGain();
        this.duck.connect(this.musicGain);
        this.stingerGain.connect(this.musicGain);
        this.musicGain.connect(master);
        this.sfxGain.connect(master);
        const noise = makeNoise(ctx);
        // separate voice counts: busy music never starves sound effects
        this.sfxSyn = new Synth(ctx, noise);
        this.musicSyn = new Synth(ctx, noise);
        this.music = new MusicPlayer(this.musicSyn, this.duck);
        this.music.setIntensity(this.wantedIntensity);
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
    this.musicGain?.gain.setTargetAtTime(Math.pow(this.musicVolume, 1.6) * 0.6, t, 0.05);
    this.sfxGain?.gain.setTargetAtTime(Math.pow(this.sfxVolume, 1.4) * 0.8, t, 0.05);
  }

  /** Menu music (title theme at a gentle intensity). */
  playMusic(track: string): void {
    this.baseTrack = track;
    this.bossAlive = 0;
    this.setIntensity(0.45);
    this.switchTrack(track);
  }

  /** Match music: the map's world track, adaptive from here on. */
  beginRun(theme: string, totalWaves: number): void {
    this.totalWaves = totalWaves;
    this.baseTrack = THEME_TRACK[theme] ?? 'reach';
    this.bossAlive = 0;
    this.setIntensity(0.12);
    this.switchTrack(this.baseTrack);
  }

  /** Called a few times a second by the game screen. */
  updateMatch(s: Omit<IntensityInput, 'bossAlive' | 'totalWaves'>): void {
    this.setIntensity(musicIntensity({ ...s, totalWaves: this.totalWaves, bossAlive: this.bossAlive > 0 }));
  }

  private setIntensity(x: number): void {
    this.wantedIntensity = x;
    this.music?.setIntensity(x);
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
        else this.play(def.elements[0] as SfxName);
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
      case Ev.Crit:
        this.play('crit');
        break;
      case Ev.ShieldBlock:
        this.play('shield');
        break;
      case Ev.BarrierBreak:
        this.play('barrier');
        break;
      case Ev.Kill: {
        const boss = ENEMIES[e.kind as keyof typeof ENEMIES]?.boss;
        this.play(boss ? 'bigpoof' : 'poof');
        if (e.value >= 3 || boss) this.play('coin');
        if (boss) this.bossGone();
        break;
      }
      case Ev.Leak:
        this.play('leak');
        if (ENEMIES[e.kind as keyof typeof ENEMIES]?.boss) this.bossGone();
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
        // boss waves get the boss stinger when the boss itself appears
        if (e.kind) break;
        this.sting(e.value >= this.totalWaves ? 'final' : 'wave');
        break;
      case Ev.WaveClear:
        this.play('clear');
        break;
      case Ev.Crystal:
      case Ev.ElementPicked:
        this.sting('core');
        break;
      case Ev.BossSpawn: {
        this.sting('boss');
        this.bossAlive++;
        const theme = `boss.${e.kind}`;
        this.switchTrack(TRACKS[theme] ? theme : 'boss.grumbleking');
        break;
      }
      case Ev.BossPhase:
        this.sting('phase');
        break;
      case Ev.Warn:
        this.play('warn');
        break;
      case Ev.Disable:
        this.play('disable');
        break;
      case Ev.Burrow:
        if (e.value === 1) this.play('burrow');
        break;
      case Ev.Teleport:
        this.play('teleport');
        break;
      case Ev.HeroFire:
        this.play('herofire');
        break;
      case Ev.HeroSpecial:
        this.play('herospecial');
        break;
      case Ev.HeroDown:
        this.play('herodown');
        break;
      case Ev.HeroRespawn:
        this.play('herorespawn');
        break;
      case Ev.HeroLevel:
        this.sting('level');
        break;
      case Ev.Ability:
        this.play('ability');
        break;
      case Ev.Meteor:
        this.play('meteor');
        break;
      case Ev.Mutator:
      case Ev.Terrain:
        this.sting('alert');
        break;
      case Ev.Victory:
        this.music?.stop(0.4);
        this.wantedTrack = null;
        this.sting('victory');
        break;
      case Ev.Defeat:
        this.music?.stop(0.4);
        this.wantedTrack = null;
        this.sting('defeat');
        break;
      case Ev.Stun:
        this.play('stun');
        break;
      case Ev.Heal:
        if (e.kind === 'heal') this.play('heal');
        break;
    }
  }

  /** A boss was destroyed or got through: back to the world track once none are left. */
  private bossGone(): void {
    if (--this.bossAlive > 0) return;
    this.bossAlive = 0;
    if (this.baseTrack && this.wantedTrack) this.switchTrack(this.baseTrack);
  }

  // ---------------------------------------------------------------- playback

  private play(name: SfxName): void {
    const c = this.ctx;
    const syn = this.sfxSyn;
    if (!c || !syn || c.state !== 'running' || this.sfxVolume <= 0.001) return;
    const now = c.currentTime;
    const gap = MIN_GAP[name] ?? 0.03;
    if (now - (this.last.get(name) ?? -1) < gap) return;
    if (syn.voices >= MAX_VOICES) return;
    this.last.set(name, now);
    SFX[name](syn, this.sfxGain!, now + 0.005, MIX.sfx[name] ?? 1);
  }

  /** A musical phrase in the current key; long ones duck the music under them. */
  private sting(name: StingerName): void {
    const c = this.ctx;
    const syn = this.musicSyn;
    if (!c || !syn || c.state !== 'running' || this.musicVolume <= 0.001) return;
    const t = c.currentTime + 0.01;
    STINGERS[name](syn, this.stingerGain!, t, this.music?.root ?? 62, MIX.stingers[name] ?? 1);
    const hold = STINGER_DUCK[name];
    if (hold && this.duck) {
      const g = this.duck.gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(DUCK, t, 0.05);
      g.setTargetAtTime(1, t + hold, 0.4);
    }
  }
}
