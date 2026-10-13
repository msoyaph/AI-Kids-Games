// Render every composition with HyperFrames 0.8.133 (60 fps), then make the deliverables in out/:
// masters with the mastered sound, web encodes under 8 MB (H.264 and AV1), a poster, a thumbnail
// and captions. Usage: npm run render [-- <cut>-<16x9|9x16> or a prefix such as game- ...]
// [--encode-only] [--thumbnail]
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import ffprobe from '@ffprobe-installer/ffprobe';
import sharp from 'sharp';
import { at, CUTS, FORMATS, type Format, ORDER, root, sizzle } from '../reel.config';
import { captions } from './captions';
import { ffmpeg, ffmpegPath, mediaDir, segments, trim } from './media';
import { idle } from '../guard';

const out = join(sizzle, 'out'), renders = join(sizzle, 'build/renders');
const args = process.argv.slice(2), only = args.filter(a => !a.startsWith('--')), encodeOnly = args.includes('--encode-only');
const MB = 1_000_000, WEB_LIMIT = 7.8 * MB, GAME_WEB_LIMIT = 3 * MB;
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

/**
 * The 1280×720 thumbnail: real gameplay from all six games in a grid, the brand lockup and a play
 * button, laid out as a page (the site's Nunito font) and screenshotted.
 */
async function thumbnail(file: string) {
  const dir = join(renders, 'thumbnail'); mkdirSync(dir, { recursive: true });
  const frames = ORDER.map(slug => {
    const seg = segments(CUTS[0].blocks.find(b => b.kind === 'game' && b.slug === slug)!)[0], png = join(dir, `${slug}.jpg`);
    ffmpeg(['-ss', (seg.duration / 2).toFixed(3), '-i', trim(seg), '-frames:v', '1', '-vf', 'scale=640:-1', png]);
    return `${slug}.jpg`;
  });
  copyFileSync(join(root, 'apps/site/src/assets/fonts/nunito-latin-wght.woff2'), join(dir, 'nunito.woff2'));
  writeFileSync(join(dir, 'index.html'), `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: Nunito; src: url(nunito.woff2) format("woff2"); font-weight: 200 1000; }
* { margin: 0; box-sizing: border-box; } body { width: 1280px; height: 720px; overflow: hidden; font-family: Nunito; background: #0F1115; }
.grid { position: absolute; inset: 0; display: grid; grid-template: repeat(2, 1fr) / repeat(3, 1fr); gap: 6px; }
.grid img { width: 100%; height: 100%; object-fit: cover; }
.shade { position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgb(15 17 21 / .55), rgb(15 17 21 / .15) 70%); }
.card { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 18px; padding: 34px 54px 30px; border-radius: 32px; background: rgb(245 246 248 / .97); box-shadow: 0 24px 60px rgb(0 0 0 / .4); }
.lockup { display: flex; align-items: center; gap: 20px; font-weight: 800; font-size: 60px; letter-spacing: -0.01em; white-space: nowrap; color: ${'#16191F'}; }
.lockup svg { width: 84px; height: 84px; }
.row { display: flex; align-items: center; gap: 16px; font-weight: 800; font-size: 30px; color: #0B7A50; }
.play { width: 58px; height: 58px; border-radius: 50%; background: #0B7A50; display: grid; place-items: center; }
</style><div class="grid">${frames.map(f => `<img src="${f}">`).join('')}</div><div class="shade"></div>
<div class="card"><div class="lockup"><svg viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="#0B7A50"/><path d="M13.5 14h13a6 6 0 0 1 5.9 7.1l-.8 4.1a2.8 2.8 0 0 1-4.7 1.4L24 24h-8l-2.9 2.6a2.8 2.8 0 0 1-4.7-1.4l-.8-4.1A6 6 0 0 1 13.5 14Z" fill="#fff"/><path d="M13 17.5v4.5M10.8 19.8h4.4" stroke="#0B7A50" stroke-width="2.2" stroke-linecap="round"/><circle cx="25" cy="18.6" r="1.6" fill="#0B7A50"/><circle cx="28.2" cy="21.6" r="1.6" fill="#0B7A50"/></svg>Ai Kids Games</div>
<div class="row"><span class="play"><svg width="26" height="26" viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" fill="#fff"/></svg></span>Watch the 60-second trailer</div></div>`);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(pathToFileURL(join(dir, 'index.html')).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
  await browser.close();
}

if (args.includes('--thumbnail')) { await thumbnail(join(out, 'trailer-thumbnail.jpg')); process.exit(0); }

// 1. Every render and its master (with the mastered sound), then 2. the site's web files.
let web: { master: string; mix: string; seconds: number } | null = null;
const gameWeb: { slug: string; master: string; mix: string; seconds: number; vtt: string }[] = [];
for (const cut of CUTS) {
  for (const format of Object.keys(FORMATS) as Format[]) {
    const name = `${cut.id}-${FORMATS[format].id}`;
    if (only.length && !only.some(o => name === o || name.startsWith(o))) continue;
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
    if (cut.id.startsWith('game-') && format === 'landscape') gameWeb.push({ slug: cut.id.slice('game-'.length), master, mix, seconds, vtt: captions(cut) });
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
  // Poster: the logo sting over the cold open.
  const posterAt = at(7) + 0.2, frame = join(renders, 'poster.png');
  ffmpeg(['-ss', posterAt.toFixed(3), '-i', master, '-frames:v', '1', frame]);
  await sharp(frame).jpeg({ quality: 82, mozjpeg: true }).toFile(join(out, 'trailer-poster.jpg'));
  await sharp(frame).webp({ quality: 80 }).toFile(join(out, 'trailer-poster.webp'));
  await thumbnail(join(out, 'trailer-thumbnail.jpg'));
  console.log('poster and thumbnail written');
}

// Each game's own trailer for its page on the site (out/trailers/<slug>/): 720p at 30 fps in H.264
// and AV1, each under 3 MB, a poster on the game card and captions.
for (const t of gameWeb) {
  const dir = join(out, 'trailers', t.slug); mkdirSync(dir, { recursive: true });
  const mp4 = join(dir, 'trailer-720.mp4'), webm = join(dir, 'trailer-720.webm');
  h264Web(t.master, mp4, 720, 30, GAME_WEB_LIMIT, t.mix, t.seconds);
  if (size(mp4) > GAME_WEB_LIMIT) throw new Error(`${mp4} is ${(size(mp4) / MB).toFixed(2)} MB, over ${GAME_WEB_LIMIT / MB} MB`);
  const kbps = av1Web(t.master, webm, 720, 30, GAME_WEB_LIMIT, t.mix, t.seconds);
  const frame = join(renders, `${t.slug}-poster.png`);
  ffmpeg(['-ss', at(10).toFixed(3), '-i', t.master, '-frames:v', '1', frame]);
  await sharp(frame).resize(1280, 720).jpeg({ quality: 82, mozjpeg: true }).toFile(join(dir, 'poster.jpg'));
  await sharp(frame).resize(1280, 720).webp({ quality: 80 }).toFile(join(dir, 'poster.webp'));
  writeFileSync(join(dir, 'trailer.en.vtt'), t.vtt);
  console.log(`${t.slug} web 720: H.264 ${(size(mp4) / MB).toFixed(2)} MB, AV1 ${(size(webm) / MB).toFixed(2)} MB (${kbps} kb/s), poster and captions`);
}
