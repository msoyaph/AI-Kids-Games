// WebVTT captions for a cut. The reel has no speech, so the captions describe what you hear:
// the music in each section and the games' own sound effects (all on-screen text is visible).
import { at, type Block, type Cut } from '../reel.config';
import { segments } from './media';

const stamp = (s: number) => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3_600_000), m = Math.floor(ms / 60_000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`; };

const MUSIC: Record<Block['kind'], string> = {
  clip: '♪ Bouncy, upbeat music ♪',
  logo: '[Sparkly chime]',
  tagline: '♪ Soft, dreamy music ♪',
  game: '♪ Upbeat music ♪',
  montage: '♪ Upbeat music ♪',
  promise: '♪ Music with claps ♪',
  devices: '♪ Music with claps ♪',
  open: '♪ The music builds up ♪',
  end: '♪ The music ends with a sparkle ♪'
};

export function captions(cut: Cut): string {
  const cues: [number, number, string][] = [];
  let last = '';
  for (const block of cut.blocks) {
    const start = at(block.start), end = at(block.end), music = MUSIC[block.kind];
    // Repeat a music cue only when the music changes.
    if (music !== last) cues.push([start, Math.min(end, start + 2.5), music]);
    last = music;
    for (const seg of segments(block)) if ((seg.shot.sfx ?? 0) > 0 && seg.shot.sound) cues.push([seg.start + 0.1, seg.start + seg.duration, `[Game sound: ${seg.shot.sound}]`]);
  }
  cues.sort((a, b) => a[0] - b[0]);
  return `WEBVTT\n\n${cues.map(([a, b, t], i) => `${i + 1}\n${stamp(a)} --> ${stamp(b)}\n${t}`).join('\n\n')}\n`;
}
