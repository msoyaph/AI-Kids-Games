// Media for the compositions: each shot trimmed from its raw take (constant 60 fps, a short
// handle for the card transition), and each cut's final audio: the soundtrack with the games'
// own sound effects mixed well under it, normalized to −14 LUFS with true peak ≤ −1 dBTP.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import { at, type Block, type Cut, FPS, sizzle, type Shot } from '../reel.config';

export const ffmpegPath = ffmpegStatic as unknown as string;
export const ffmpeg = (args: string[]) => execFileSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
export const mediaDir = join(sizzle, 'build/media');
/** Extra seconds after each shot, so the outgoing shot is still there while the next card grows. */
export const HANDLE = 0.2;

export interface Take { file: string; cut: number; duration: number; fps: number }
export function take(shot: Shot): Take {
  const json = join(sizzle, 'captures', shot.slug, `${shot.take}.json`);
  if (!existsSync(json)) throw new Error(`Missing take ${shot.slug}/${shot.take}: run npm run capture -- ${shot.slug} in marketing/sizzle`);
  return JSON.parse(readFileSync(json, 'utf8'));
}

/** A placed shot: which take, from where, for how long (seconds). */
export interface Segment { shot: Shot; start: number; duration: number; key: string }
const segment = (shot: Shot, start: number, duration: number): Segment =>
  ({ shot, start, duration, key: `${shot.slug}-${shot.take}-${Math.round((shot.from ?? 0) * 1000)}-${Math.round(duration * 1000)}` });

/** Every shot a block shows, with its time on the cut's timeline. */
export function segments(block: Block): Segment[] {
  const start = at(block.start), len = at(block.end) - start;
  switch (block.kind) {
    case 'clip': return [segment(block.shot, start, len)];
    case 'logo': return block.over ? [segment(block.over, start, len)] : [];
    case 'tagline': return block.bg.map((shot, i) => segment(shot, start + len * i / block.bg.length, len / block.bg.length + (i < block.bg.length - 1 ? 0.6 : 0)));
    case 'game':
    case 'montage': { const step = len / block.shots.length; return block.shots.map((shot, i) => segment(shot, start + step * i, step)); }
    case 'devices': return [segment(block.phone, start, len), segment(block.tablet, start, len)];
    default: return [];
  }
}

/** Trim one segment to build/media/<key>.mp4 (video only; the sound goes through the mix). */
export function trim(seg: Segment): string {
  const out = join(mediaDir, `${seg.key}.mp4`);
  if (existsSync(out) && statSync(out).size > 0) return out;
  const t = take(seg.shot), from = t.cut + (seg.shot.from ?? 0), duration = seg.duration + HANDLE;
  if (from + duration > t.duration + 0.05) throw new Error(`${seg.shot.slug}/${seg.shot.take}: needs ${(from + duration).toFixed(2)} s but the take is ${t.duration.toFixed(2)} s long`);
  mkdirSync(mediaDir, { recursive: true });
  ffmpeg(['-ss', from.toFixed(3), '-i', t.file, '-t', duration.toFixed(3), '-an', '-vf', `fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-g', String(FPS / 2), '-movflags', '+faststart', out]);
  return out;
}

/** Integrated loudness of a stretch of a take's sound (LUFS; -70 when silent). */
function loudness(file: string, from: number, duration: number): number {
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-ss', from.toFixed(3), '-t', duration.toFixed(3), '-i', file, '-vn', '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = [...r.stderr.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1);
  return m ? Number(m[1]) : -70;
}

/**
 * The cut's final sound: the soundtrack plus each shot's game sound (`shot.sfx` sets how loud,
 * relative to −24 LUFS, about 10 LU under the music), a peak limiter, then a two-pass linear
 * loudness normalization.
 */
export function mixAudio(cut: Cut): string {
  const music = join(sizzle, 'build/music', `${cut.id}.wav`), out = join(mediaDir, `${cut.id}-mix.wav`);
  if (!existsSync(music)) throw new Error(`Missing ${music}: run npm run music`);
  mkdirSync(mediaDir, { recursive: true });
  const inputs = ['-i', music], chains: string[] = [], labels: string[] = [];
  for (const seg of cut.blocks.flatMap(segments)) {
    const sfx = seg.shot.sfx ?? 0;
    if (sfx <= 0) continue;
    const t = take(seg.shot), from = t.cut + (seg.shot.from ?? 0), level = loudness(t.file, from, seg.duration);
    if (level < -60) { console.log(`  (no game sound in ${seg.key})`); continue; }
    // A quiet take is lifted at most 12 dB, so its noise floor stays down.
    const gain = Math.min(4, 10 ** ((-24 + 20 * Math.log10(sfx / 0.5) - level) / 20)), n = labels.length + 1, d = seg.duration;
    inputs.push('-ss', from.toFixed(3), '-t', d.toFixed(3), '-i', t.file);
    chains.push(`[${n}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${gain.toFixed(4)},afade=t=in:d=0.05,afade=t=out:st=${(d - 0.12).toFixed(3)}:d=0.12,adelay=${Math.round(seg.start * 1000)}:all=1[s${n}]`);
    labels.push(`[s${n}]`);
  }
  const graph = chains.length ? `${chains.join(';')};[0:a]${labels.join('')}amix=inputs=${labels.length + 1}:normalize=0:duration=first,alimiter=limit=0.7:level=false[m]` : '[0:a]alimiter=limit=0.7:level=false[m]';
  const seconds = at(cut.beats).toFixed(3);
  const measure = spawnSync(ffmpegPath, ['-hide_banner', ...inputs, '-filter_complex', `${graph};[m]loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json[o]`, '-map', '[o]', '-t', seconds, '-f', 'null', '-'], { encoding: 'utf8' });
  const json = JSON.parse(measure.stderr.slice(measure.stderr.lastIndexOf('{')));
  const norm = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${json.input_i}:measured_TP=${json.input_tp}:measured_LRA=${json.input_lra}:measured_thresh=${json.input_thresh}:offset=${json.target_offset}:linear=true`;
  ffmpeg([...inputs, '-filter_complex', `${graph};[m]${norm},aresample=48000[o]`, '-map', '[o]', '-t', seconds, '-c:a', 'pcm_s24le', out]);
  console.log(`  ${cut.id} mix: ${labels.length} game sounds; music in at ${Number(json.input_i).toFixed(1)} LUFS, normalized to -14`);
  return out;
}
