// Render every composition with HyperFrames 0.8.133 (60 fps), then make the deliverables in out/:
// masters with the mastered sound, web encodes under 8 MB (H.264 and AV1), a poster, a thumbnail
// and captions. Usage: npm run render [-- <cut>-<16x9|9x16> ...] [--encode-only]
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import ffprobe from '@ffprobe-installer/ffprobe';
import sharp from 'sharp';
import { at, CUTS, FORMATS, type Format, sizzle } from '../reel.config';
import { captions } from './captions';
import { ffmpeg, ffmpegPath, mediaDir } from './media';
import { idle } from '../guard';

const out = join(sizzle, 'out'), renders = join(sizzle, 'build/renders');
const args = process.argv.slice(2), only = args.filter(a => !a.startsWith('--')), encodeOnly = args.includes('--encode-only');
const MB = 1_000_000, WEB_LIMIT = 7.8 * MB;
mkdirSync(out, { recursive: true }); mkdirSync(renders, { recursive: true });

const size = (file: string) => statSync(file).size;
const probe = (file: string) => JSON.parse(execFileSync(ffprobe.path, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_name,width,height,r_frame_rate', '-of', 'json', file], { encoding: 'utf8' }));

/** HyperFrames render of one project (needs at least 1 GB free; it checks). */
function render(project: string, file: string) {
  const env = { ...process.env, DO_NOT_TRACK: '1', HYPERFRAMES_FFMPEG_PATH: ffmpegPath, HYPERFRAMES_FFPROBE_PATH: ffprobe.path, HYPERFRAMES_EXTRACT_CACHE_DIR: join(sizzle, 'build/.frames') };
  const started = Date.now();
  const r = spawnSync('npx', ['--yes', 'hyperframes@0.8.133', 'render', project, '-o', file, '--fps', '60', '--quality', 'high', '--format', 'mp4', '--quiet'], { env, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`HyperFrames render failed for ${project}`);
  console.log(`  rendered ${file} in ${((Date.now() - started) / 1000).toFixed(0)} s`);
}

/** Two-pass x264 at the bitrate that fits `limit` (sound included). */
function h264Web(src: string, dst: string, height: number, fps: number, limit: number, mix: string, seconds: number) {
  const audio = 96_000, video = Math.floor((limit * 8) / seconds - audio - 20_000);
  const log = join(renders, 'x264-pass');
  const vf = `scale=-2:${height}:flags=lanczos,fps=${fps},format=yuv420p`;
  ffmpeg(['-i', src, '-an', '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-b:v', String(video), '-pass', '1', '-passlogfile', log, '-f', 'null', '/dev/null']);
  ffmpeg(['-i', src, '-i', mix, '-map', '0:v', '-map', '1:a', '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-b:v', String(video), '-maxrate', String(video * 2), '-bufsize', String(video * 4), '-pass', '2', '-passlogfile', log, '-profile:v', 'high', '-c:a', 'aac_at', '-b:a', String(audio), '-movflags', '+faststart', '-t', seconds.toFixed(3), dst]);
}

/** AV1 in WebM (SVT-AV1, one pass at the bitrate that fits `limit`). */
function av1Web(src: string, dst: string, height: number, fps: number, limit: number, mix: string, seconds: number) {
  const video = Math.floor((limit * 8) / seconds - 96_000 - 30_000);
  ffmpeg(['-i', src, '-i', mix, '-map', '0:v', '-map', '1:a', '-vf', `scale=-2:${height}:flags=lanczos,fps=${fps},format=yuv420p`, '-c:v', 'libsvtav1', '-preset', '10', '-b:v', String(video), '-g', String(fps * 4), '-c:a', 'libopus', '-b:a', '96k', '-t', seconds.toFixed(3), dst]);
  if (size(dst) > limit) throw new Error(`${dst} is ${(size(dst) / MB).toFixed(2)} MB, over ${limit / MB} MB`);
  return Math.round(video / 1000);
}

// 1. Every render and its master (with the mastered sound), then 2. the site's web files.
let web: { master: string; mix: string; seconds: number } | null = null;
for (const cut of CUTS) {
  for (const format of Object.keys(FORMATS) as Format[]) {
    const name = `${cut.id}-${FORMATS[format].id}`;
    if (only.length && !only.includes(name)) continue;
    const project = join(sizzle, 'build', name), raw = join(renders, `${name}.mp4`), mix = join(mediaDir, `${cut.id}-mix.wav`), seconds = at(cut.beats);
    if (!existsSync(join(project, 'index.html'))) throw new Error(`Missing ${project}: run npm run compose`);
    console.log(`${name}:`);
    idle('render');
    if (!encodeOnly) render(project, raw);
    // Master: the render's picture with the mastered sound (Apple AAC, 256 kb/s).
    const master = join(out, `ai-kids-games-${name}.mp4`);
    ffmpeg(['-i', raw, '-i', mix, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac_at', '-b:a', '256k', '-movflags', '+faststart', '-t', seconds.toFixed(3), master]);
    const p = probe(master);
    console.log(`  master ${(size(master) / MB).toFixed(1)} MB, ${p.streams.find((s: any) => s.width)?.width}×${p.streams.find((s: any) => s.width)?.height}, ${Number(p.format.duration).toFixed(2)} s`);
    writeFileSync(join(out, `ai-kids-games-${cut.id}.en.vtt`), captions(cut));
    if (cut.id === 'reel' && format === 'landscape') web = { master, mix, seconds };
  }
}

// Web encodes for the site (the full 16:9 reel): each under 8 MB, 30 fps for quality at that size.
if (web) {
  const { master, mix, seconds } = web;
  for (const height of [1080, 720]) {
    const mp4 = join(out, `trailer-${height}.mp4`), webm = join(out, `trailer-${height}.webm`);
    h264Web(master, mp4, height, 30, WEB_LIMIT, mix, seconds);
    const kbps = av1Web(master, webm, height, 30, WEB_LIMIT, mix, seconds);
    console.log(`web ${height}: H.264 ${(size(mp4) / MB).toFixed(2)} MB, AV1 ${(size(webm) / MB).toFixed(2)} MB (${kbps} kb/s)`);
  }
  // Poster: the logo sting over the cold open; thumbnail: the same with a play button.
  const posterAt = at(7) + 0.2, frame = join(renders, 'poster.png');
  ffmpeg(['-ss', posterAt.toFixed(3), '-i', master, '-frames:v', '1', frame]);
  await sharp(frame).jpeg({ quality: 82, mozjpeg: true }).toFile(join(out, 'trailer-poster.jpg'));
  await sharp(frame).webp({ quality: 80 }).toFile(join(out, 'trailer-poster.webp'));
  const play = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><circle cx="640" cy="560" r="78" fill="#fff" fill-opacity=".96"/><path d="M618 518v84l70-42z" fill="#0B7A50"/></svg>`);
  await sharp(frame).resize(1280, 720).composite([{ input: play }]).jpeg({ quality: 86, mozjpeg: true }).toFile(join(out, 'trailer-thumbnail.jpg'));
  console.log('poster and thumbnail written');
}
