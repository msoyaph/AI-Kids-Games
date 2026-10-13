/**
 * Sound made with the Web Audio API (no audio files). Browsers only allow sound after the
 * player's first tap, click or key press, so the context starts on that gesture.
 */
let ctx: AudioContext | null = null;

export function unlock() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { ctx = null; }
}

/** A short, soft "ting", a little higher for every star in a row. */
export function ting(combo: number, enabled: boolean) {
  if (!ctx || !enabled || ctx.state !== 'running') return;
  const osc = ctx.createOscillator(), gain = ctx.createGain(), at = ctx.currentTime;
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(660 * 2 ** (Math.min(combo, 8) / 12), at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.18, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.3);
}

/** A soft, low "puff" when the comet bumps a sleepy cloud: nothing scary, just a little yawn. */
export function puff(enabled: boolean) {
  if (!ctx || !enabled || ctx.state !== 'running') return;
  const osc = ctx.createOscillator(), gain = ctx.createGain(), at = ctx.currentTime;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(330, at);
  osc.frequency.exponentialRampToValueAtTime(196, at + 0.35);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.12, at + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.4);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.45);
}

export const audioState = () => ctx?.state ?? 'none';
