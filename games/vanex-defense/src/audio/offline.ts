import { MIX } from './mix';
import { renderTrackOffline, TRACKS } from './music';
import { MIN_GAP, SFX, STINGERS, type SfxName, type StingerName } from './sfx';
import { makeNoise, masterChain, Synth } from './synth';

/**
 * Offline level metering for the mixing pass (`scripts/audio-levels.mjs`).
 * Renders through the same synth code the game uses, in an
 * OfflineAudioContext, and measures sample peak plus BS.1770-style loudness
 * (K-weighting approximated with a high shelf + high-pass biquad).
 * Never imported by the game itself.
 */
export interface Level {
  /** Sample peak, dBFS. */
  peakDb: number;
  /** Gated integrated loudness, LUFS. */
  lufs: number;
  /** Loudest 400 ms window, LUFS. */
  momentary: number;
  /** Loudest 100 ms window, LUFS (fairer for short sound effects). */
  punch: number;
}

const RATE = 44100;
const db = (x: number): number => (x > 0 ? 20 * Math.log10(x) : -120);
const lu = (ms: number): number => (ms > 0 ? -0.691 + 10 * Math.log10(ms) : -120);

export const ITEMS = {
  tracks: Object.keys(TRACKS),
  sfx: Object.keys(SFX) as SfxName[],
  stingers: Object.keys(STINGERS) as StingerName[],
};

async function measure(seconds: number, build: (syn: Synth, out: AudioNode, ctx: OfflineAudioContext) => void): Promise<Level> {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * RATE), RATE);
  const syn = new Synth(ctx, makeNoise(ctx));
  const merger = ctx.createChannelMerger(2);
  merger.connect(ctx.destination);
  const sum = ctx.createGain();
  // channel 0: the signal; channel 1: K-weighted copy for loudness
  sum.connect(merger, 0, 0);
  const shelf = ctx.createBiquadFilter();
  shelf.type = 'highshelf';
  shelf.frequency.value = 1681;
  shelf.gain.value = 4;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 38;
  hp.Q.value = 0.5;
  sum.connect(shelf).connect(hp).connect(merger, 0, 1);
  build(syn, sum, ctx);
  const buf = await ctx.startRendering();
  const raw = buf.getChannelData(0);
  const k = buf.getChannelData(1);
  let peak = 0;
  for (let i = 0; i < raw.length; i++) peak = Math.max(peak, Math.abs(raw[i]!));
  // 400 ms blocks, 75 % overlap
  const win = Math.round(0.4 * RATE);
  const hop = Math.round(0.1 * RATE);
  const blocks: number[] = [];
  for (let s = 0; s + win <= k.length; s += hop) {
    let acc = 0;
    for (let i = s; i < s + win; i++) acc += k[i]! * k[i]!;
    blocks.push(acc / win);
  }
  const momentary = blocks.length ? lu(Math.max(...blocks)) : -120;
  const short = Math.round(0.1 * RATE);
  let punchMs = 0;
  for (let s = 0; s + short <= k.length; s += Math.round(0.025 * RATE)) {
    let acc = 0;
    for (let i = s; i < s + short; i++) acc += k[i]! * k[i]!;
    punchMs = Math.max(punchMs, acc / short);
  }
  const abs = blocks.filter((b) => lu(b) > -70);
  const absMean = abs.reduce((a, b) => a + b, 0) / Math.max(1, abs.length);
  const rel = abs.filter((b) => lu(b) > lu(absMean) - 10);
  const lufs = rel.length ? lu(rel.reduce((a, b) => a + b, 0) / rel.length) : -120;
  return { peakDb: db(peak), lufs, momentary, punch: lu(punchMs) };
}

/** A track at a fixed intensity; `raw` ignores its mix gain. */
export function measureTrack(id: string, intensity: number, seconds = 16, raw = true): Promise<Level> {
  return measure(seconds, (syn, out) => renderTrackOffline(syn, out, id, intensity, seconds - 1, raw ? 1 : (MIX.tracks[id] ?? 1)));
}

export function measureSfx(name: SfxName, raw = true): Promise<Level> {
  return measure(1.6, (syn, out) => SFX[name](syn, out, 0.02, raw ? 1 : (MIX.sfx[name] ?? 1)));
}

export function measureStinger(name: StingerName, raw = true): Promise<Level> {
  return measure(3.5, (syn, out) => STINGERS[name](syn, out, 0.02, 62, raw ? 1 : (MIX.stingers[name] ?? 1)));
}

/**
 * Worst case through the real master chain: a boss theme at full intensity
 * plus a barrage of every combat sound (rate-limited like the game), with
 * the same bus gains the engine uses at the given volume settings.
 */
export function measureBusy(musicVol: number, sfxVol: number, seconds = 10): Promise<Level> {
  return measure(seconds, (syn, out, ctx) => {
    const master = masterChain(ctx, undefined, out);
    const music = ctx.createGain();
    music.gain.value = Math.pow(musicVol, 1.6) * 0.6;
    music.connect(master);
    const sfx = ctx.createGain();
    sfx.gain.value = Math.pow(sfxVol, 1.4) * 0.8;
    sfx.connect(master);
    renderTrackOffline(new Synth(ctx, syn.noise), music, 'boss.grumbleking', 1, seconds - 0.5);
    const combat: SfxName[] = ['arrow', 'cannon', 'fire', 'water', 'nature', 'light', 'shadow', 'earth', 'poof', 'coin', 'splash', 'crit', 'shield', 'herofire'];
    const last = new Map<SfxName, number>();
    for (let t = 0.05; t < seconds - 0.6; t += 0.02) {
      for (const name of combat) {
        const gap = MIN_GAP[name] ?? 0.03;
        if (t - (last.get(name) ?? -1) < gap) continue;
        last.set(name, t);
        SFX[name](syn, sfx, t, MIX.sfx[name] ?? 1);
      }
      if (Math.abs((t % 2.5) - 1) < 0.01) SFX.meteor(syn, sfx, t, MIX.sfx.meteor ?? 1);
    }
  });
}
