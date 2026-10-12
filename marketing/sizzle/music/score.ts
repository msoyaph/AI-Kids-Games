// The soundtrack, composed from the edit itself: each block of a cut (reel.config.ts) gets its
// music, so every section change lands exactly on the cut. 124 BPM, F major, I–V–vi–IV.
import { at, BEAT, type Block, type Cut, type Slug } from '../reel.config';
import { bass, clap, glock, kick, marimba, Mix, pad, shaker, snare, stab, sweep, uke, whistle, type Voice } from './synth';

type Chord = 'F' | 'C' | 'Dm' | 'Bb';
const CHORDS: Record<Chord, { pad: number[]; root: number; tones: number[] }> = {
  F: { pad: [57, 60, 65], root: 41, tones: [65, 69, 72] },
  C: { pad: [55, 60, 64], root: 36, tones: [60, 64, 67] },
  Dm: { pad: [57, 62, 65], root: 38, tones: [62, 65, 69] },
  Bb: { pad: [58, 62, 65], root: 34, tones: [58, 62, 65] }
};
/** The hook: one bar per chord, [beat in bar, MIDI note, length in beats]. */
const HOOK: Record<Chord, [number, number, number][]> = {
  F: [[0, 72, 0.5], [0.5, 69, 0.5], [1, 72, 0.5], [1.5, 77, 1], [2.5, 76, 0.5], [3, 77, 0.5], [3.5, 79, 0.5]],
  C: [[0, 76, 1], [1, 72, 0.5], [1.5, 74, 0.5], [2, 76, 0.5], [2.5, 79, 1.5]],
  Dm: [[0, 77, 0.5], [0.5, 76, 0.5], [1, 74, 0.5], [1.5, 69, 1], [2.5, 74, 0.5], [3, 77, 0.5], [3.5, 81, 0.5]],
  Bb: [[0, 79, 1], [1, 77, 0.5], [1.5, 74, 0.5], [2, 72, 1], [3, 69, 0.5], [3.5, 72, 0.5]]
};
const TURN: [number, number, number][] = [[0, 77, 0.5], [0.5, 76, 0.5], [1, 74, 1], [2, 74, 0.5], [2.5, 72, 0.5], [3, 69, 1]];

/** Chords for a block, as [start beat, chord, length] covering the whole block. */
function chordsFor(block: Block): [number, Chord, number][] {
  const len = block.end - block.start, plan: [Chord, number][] =
    block.kind === 'clip' ? [['F', 4], ['C', 4]] :
    block.kind === 'logo' ? [['F', 8]] :
    block.kind === 'tagline' ? [['F', 4], ['C', 4], ['Dm', 4], ['Bb', 4]] :
    block.kind === 'game' || block.kind === 'montage' ? [['F', 4], ['C', 4], ['Dm', 2], ['Bb', 2]] :
    block.kind === 'promise' ? [['Bb', 4], ['F', 4]] :
    block.kind === 'devices' ? [['Bb', 4], ['C', 4]] :
    block.kind === 'open' ? [['F', 4], ['Dm', 4]] :
    len >= 8 ? [['F', 2], ['C', 2], ['Bb', 2], ['F', 2]] : [['F', 4]];
  const out: [number, Chord, number][] = [];
  for (let t = 0, i = 0; t < len; i++) { const [c, n] = plan[i % plan.length]; const l = Math.min(n, len - t); out.push([block.start + t, c, l]); t += l; }
  return out;
}

export interface Score { mix: Mix; events: number }

export function compose(cut: Cut, seconds = at(cut.beats)): Score {
  const mix = new Mix(seconds + 0.01);
  let events = 0, level = 1;
  const put = (v: Voice, beat: number, gain: number, pan = 0) => { mix.add(v, at(beat), gain * level, pan); events++; };
  /** Section levels: the tagline breakdown breathes, the half-time sections sit a little lower. */
  const LEVEL: Partial<Record<Block['kind'], number>> = { logo: 0.8, tagline: 0.55, promise: 0.75, devices: 0.75, open: 0.82 };
  const s = (beats: number) => beats * BEAT;

  const drums = (from: number, to: number, o: { kick?: 'four' | 'half' | 'one-three'; clap?: boolean; shaker?: number; punch?: boolean }) => {
    for (let b = from; b < to; b += 0.25) {
      const inBar = ((b % 4) + 4) % 4, onBeat = Number.isInteger(b);
      if (onBeat && (o.kick === 'four' || (o.kick === 'one-three' && inBar % 2 === 0) || (o.kick === 'half' && inBar === 0))) put(kick(1, o.punch ? 1.3 : 1), b, 0.95);
      if (onBeat && o.clap && (o.kick === 'half' ? inBar === 2 : inBar % 2 === 1)) { put(clap(1, b | 0), b, 0.5); if (o.punch) put(snare(1, b | 0), b, 0.42); }
      if (o.punch && inBar === 3.5) put(kick(0.75, 1.2), b, 0.7);
      if (o.shaker) put(shaker(Number.isInteger(b * 2) ? 1 : 0.55, (b * 4) | 0), b, 0.22 * o.shaker, 0.3);
    }
  };
  const bassline = (start: number, chord: Chord, len: number, busy = true) => {
    const r = CHORDS[chord].root, steps: [number, number, number][] = busy ? [[0, r, 1], [1.5, r, 0.5], [2, r, 1], [3, r + 12, 0.5], [3.5, r, 0.5]] : [[0, r, Math.min(len, 4) - 0.1]];
    for (let o = 0; o < len; o += 4) for (const [b, m, l] of steps) if (o + b < len) put(bass(m, s(Math.min(l, len - o - b))), start + o + b, 0.5);
  };
  const melody = (start: number, notes: [number, number, number][], len: number, voice: 'marimba' | 'whistle' | 'soft', shift = 0) => {
    for (const [b, m, l] of notes) if (b < len) {
      if (voice === 'whistle') put(whistle(m + shift, s(l) * 0.9), start + b, 0.5, -0.05);
      else put(marimba(m + shift, voice === 'soft' ? 0.55 : 1), start + b, 0.5, -0.1);
    }
  };

  cut.blocks.forEach(block => {
    const chords = chordsFor(block);
    level = LEVEL[block.kind] ?? 1;
    for (const [b, c, l] of chords) put(pad(CHORDS[c].pad, s(l), 1, block.kind === 'game' && block.slug === 'space-sky' ? 1.6 : 1), b, 0.32);

    switch (block.kind) {
      case 'clip':
      case 'montage': {
        drums(block.start, block.end, { kick: 'four', clap: true, shaker: 1 });
        for (const [b, c, l] of chords) { bassline(b, c, l); melody(b, HOOK[c], l, 'marimba'); }
        if (block.kind === 'montage') put(sweep(0.6, 500, 6000, 0.8, block.start), block.start - 1.1, 0.25);
        break;
      }
      case 'logo': {
        // The sting: drums drop out; a glockenspiel sparkle over one bass note.
        put(bass(CHORDS.F.root, s(1.8)), block.start, 0.55);
        [77, 81, 84, 89].forEach((m, i) => put(glock(m, 1 - i * 0.12), block.start + i * 0.25, 0.4, 0.25));
        break;
      }
      case 'tagline': {
        drums(block.start, block.end, { kick: 'one-three' });
        for (const [b, c, l] of chords) { bassline(b, c, l, false); melody(b, CHORDS[c].tones.map((m, i) => [i * 1.5, m + 12, 1] as [number, number, number]), l, 'soft'); }
        const rise = Math.min(4, block.end - block.start);
        put(sweep(s(rise), 300, 7000, 0.9, 11, 'rise'), block.end - rise, 0.3);
        break;
      }
      case 'game': {
        const slug: Slug = block.slug, punch = slug === 'theabonk';
        drums(block.start, block.end, { kick: 'four', clap: true, shaker: 1, punch });
        put(sweep(0.6, 500, 6000, 1, block.start), block.start - 1.1, 0.28);
        for (const [b, c, l] of chords) {
          bassline(b, c, l);
          const notes = l === 2 ? (c === 'Dm' ? TURN.slice(0, 3) : TURN.slice(3).map(([x, m, d]) => [x - 2, m, d] as [number, number, number])) : HOOK[c];
          melody(b, notes, l, slug === 'cliff-valley' ? 'whistle' : 'marimba');
          const tones = CHORDS[c].tones;
          for (let o = 0; o < l; o += 0.5) {
            const x = b + o, offBeat = !Number.isInteger(o);
            if (slug === 'calex-cart' && offBeat) put(stab(tones.map(m => m + 12)), x, 0.32, o % 2 ? 0.15 : -0.15);
            if (slug === 'vanex-defense') for (const q of [0, 0.25]) put(marimba(tones[((o + q) * 4) % 3] + 12, 0.45), x + q, 0.32, 0.2);
            if (slug === 'space-sky') put(glock(tones[(o * 2) % 3] + 24, 0.5), x, 0.2, 0.3);
            if (slug === 'light-crossing' && offBeat) tones.forEach((m, k) => put(uke(m, 0.8), x + k * 0.03, 0.34, -0.25));
          }
        }
        break;
      }
      case 'promise':
      case 'devices': {
        drums(block.start, block.end, { kick: 'half', clap: true, shaker: 0.6 });
        for (const [b, c, l] of chords) bassline(b, c, l, false);
        for (const line of block.lines) { put(clap(0.9, line.at * 8), line.at, 0.45); put(bass(CHORDS.F.root + 12, s(0.45)), line.at, 0.45); }
        if (block.kind === 'devices') for (const [b, c, l] of chords) for (let o = 0; o < l; o += 0.5) put(glock(CHORDS[c].tones[(o * 2) % 3] + 12, 0.5), b + o, 0.2, 0.25);
        break;
      }
      case 'open': {
        // The riser back into the hook: a growing groove and a snare roll in the last bar.
        const len = block.end - block.start;
        for (let b = block.start; b < block.end; b++) put(kick(0.6 + 0.4 * (b - block.start) / len), b, 0.85);
        for (let b = block.end - 4; b < block.end; b += 0.25) put(snare(0.3 + 0.7 * (b - block.end + 4) / 4, b * 4), b, 0.4);
        for (const [b, c, l] of chords) bassline(b, c, l, false);
        put(sweep(s(len), 250, 9000, 1, 21, 'rise'), block.start, 0.32);
        break;
      }
      case 'end': {
        // The final hook, then everything lands on F with a sparkle and rings out.
        const hit = block.end - block.start >= 8 ? block.end - 2 : block.start;
        if (hit > block.start) {
          drums(block.start, hit, { kick: 'four', clap: true, shaker: 1 });
          for (const [b, c, l] of chords) if (b < hit) { bassline(b, c, Math.min(l, hit - b)); melody(b, HOOK[c].filter(([x]) => x < 2), Math.min(l, hit - b), 'marimba'); }
        }
        put(kick(1, 1.2), hit, 1); put(clap(1, 99), hit, 0.5);
        put(bass(CHORDS.F.root, s(block.end - hit) - 0.1), hit, 0.6);
        put(pad([53, 57, 60, 65, 69], s(block.end - hit) - 0.25, 1, 1.3), hit, 0.5);
        put(marimba(77), hit, 0.55);
        [77, 81, 84, 89, 93].forEach((m, i) => put(glock(m, 1 - i * 0.1), hit + i * 0.25, 0.4, 0.25));
        break;
      }
    }
  });

  // Silence at the very end (the last ring-out fades over 0.25 s).
  const end = Math.round(seconds * 48_000), fade = Math.round(0.25 * 48_000);
  for (let i = Math.max(0, end - fade); i < mix.L.length; i++) { const g = Math.max(0, (end - i) / fade); mix.L[i] *= g; mix.R[i] *= g; }
  mix.master();
  for (let i = Math.max(0, end - fade); i < mix.L.length; i++) { const g = Math.max(0, (end - i) / fade); mix.L[i] *= g; mix.R[i] *= g; }
  return { mix, events };
}
