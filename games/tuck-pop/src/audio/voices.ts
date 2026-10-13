/** Little synth voices shared by the sound effects and the music. Every one schedules itself and stops. */
import type { Buses } from './engine';

export const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** A pitched tone with an attack/decay envelope. */
export function tone(b: Buses, out: AudioNode, t: number, o: { freq: number; to?: number; type?: OscillatorType; dur: number; gain: number; attack?: number; glide?: number; detune?: number; filter?: number }) {
  const ctx = b.ctx, osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = o.type ?? 'sine'; osc.frequency.setValueAtTime(o.freq, t); if (o.detune) osc.detune.value = o.detune;
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide ?? o.dur));
  const a = o.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  let node: AudioNode = osc;
  if (o.filter) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.filter; f.Q.value = 0.7; osc.connect(f); node = f; }
  node.connect(g).connect(out);
  osc.start(t); osc.stop(t + o.dur + 0.02);
}

/** A bell: a sine plus a soft inharmonic partial, long decay. */
export function bell(b: Buses, out: AudioNode, t: number, freq: number, gain: number, dur = 0.9) {
  tone(b, out, t, { freq, dur, gain, attack: 0.003 });
  tone(b, out, t, { freq: freq * 2.76, dur: dur * 0.45, gain: gain * 0.25, attack: 0.002 });
  tone(b, out, t, { freq: freq * 4.07, dur: dur * 0.2, gain: gain * 0.1, attack: 0.002 });
}

/** A wooden mallet (marimba-ish): fundamental plus a bright fourth partial, quick decay. */
export function mallet(b: Buses, out: AudioNode, t: number, freq: number, gain: number, dur = 0.35) {
  tone(b, out, t, { freq, dur, gain, attack: 0.002 });
  tone(b, out, t, { freq: freq * 4, dur: dur * 0.15, gain: gain * 0.3, attack: 0.001 });
}

/** Filtered noise: clicks, hats, shakers and swishes. */
export function noise(b: Buses, out: AudioNode, t: number, o: { dur: number; gain: number; freq: number; to?: number; q?: number; type?: BiquadFilterType }) {
  const ctx = b.ctx, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = b.noise; f.type = o.type ?? 'bandpass'; f.frequency.setValueAtTime(o.freq, t); f.Q.value = o.q ?? 1;
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.5); src.stop(t + o.dur + 0.02);
}

/** A soft kick: a sine dropping in pitch. */
export function kick(b: Buses, out: AudioNode, t: number, gain: number) { tone(b, out, t, { freq: 140, to: 48, glide: 0.12, dur: 0.22, gain }); }

/** A pad chord: detuned triangles through a gentle low-pass, slow attack. */
export function pad(b: Buses, out: AudioNode, t: number, notes: number[], dur: number, gain: number, cutoff = 1400) {
  for (const n of notes) for (const d of [-6, 6]) tone(b, out, t, { freq: hz(n), type: 'triangle', dur, gain: gain / notes.length, attack: Math.min(0.4, dur * 0.3), detune: d, filter: cutoff });
}
