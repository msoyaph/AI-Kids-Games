/**
 * The audio engine: one AudioContext, unlocked by the first tap or key (with iOS's silent-buffer
 * trick), suspended while the game is hidden. Two buses (sound effects and music) feed the master
 * chain: a glue compressor, a limiter and a soft clip (the pattern from Vanex Defense's synth), so
 * a big streak never gets harsh or loud. It also works with OfflineAudioContext for the tests.
 */
export interface Buses { ctx: BaseAudioContext; sfx: GainNode; music: GainNode; master: GainNode; noise: AudioBuffer }

/** Compressor → limiter → soft clip, ending at the context's destination. Returns its input. */
export function masterChain(ctx: BaseAudioContext): GainNode {
  const input = ctx.createGain();
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -18; glue.knee.value = 8; glue.ratio.value = 3; glue.attack.value = 0.006; glue.release.value = 0.2;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -4; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.08;
  const trim = ctx.createGain(); trim.gain.value = 0.7;
  const clip = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) { const x = (i / (curve.length - 1)) * 2 - 1; curve[i] = Math.tanh(x * 1.3) / Math.tanh(1.3); }
  clip.curve = curve;
  input.connect(glue).connect(limiter).connect(trim).connect(clip).connect(ctx.destination);
  return input;
}

/** Deterministic white noise (xorshift), for clicks, shakers and swishes. */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0);
  let s = 0x9e3779b9;
  for (let i = 0; i < d.length; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; d[i] = ((s >>> 0) / 4294967296) * 2 - 1; }
  return b;
}

export function buses(ctx: BaseAudioContext): Buses {
  const master = masterChain(ctx);
  const sfx = ctx.createGain(), music = ctx.createGain();
  sfx.connect(master); music.connect(master);
  return { ctx, sfx, music, master, noise: noiseBuffer(ctx) };
}

let live: (Buses & { ctx: AudioContext }) | null = null;
let failed = false;

/** The running engine, created on the first gesture. Null until then, or when audio isn't available. */
export function engine() { return live; }

export function unlockAudio(): (Buses & { ctx: AudioContext }) | null {
  if (failed) return null;
  try {
    if (!live) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) { failed = true; return null; }
      const ctx = new Ctx({ latencyHint: 'interactive' });
      live = { ...buses(ctx), ctx };
    }
    const ctx = live.ctx;
    if (ctx.state !== 'running') {
      // iOS: a silent one-sample buffer started inside the gesture unlocks output
      const b = ctx.createBufferSource(); b.buffer = ctx.createBuffer(1, 1, 22050); b.connect(ctx.destination); b.start(0);
      void ctx.resume().catch(() => {});
    }
    return live;
  } catch { failed = true; return null; }
}

export function setHidden(hidden: boolean) {
  const ctx = live?.ctx;
  if (!ctx) return;
  void (hidden ? ctx.suspend() : ctx.resume()).catch(() => {});
}

/** Perceptual volume: the slider feels even from quiet to loud. */
export const curve = (v: number) => Math.pow(Math.min(1, Math.max(0, v)), 1.6);
