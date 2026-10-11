import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';
import { captureDir, root, type TakeResult } from './lib';
import type { Scenario } from './types';

export const LOOP = { width: 960, height: 540, fps: 30, fade: 0.4, maxBytes: 800_000, targetBytes: 740_000 };
export const POSTER = { width: 1280, height: 720 };
export const SHOT = { width: 1600, height: 900, thumbWidth: 640, thumbHeight: 360 };

const ffmpeg = (args: string[]) => execFileSync(ffmpegPath as unknown as string,['-hide_banner','-loglevel','error','-y',...args],{ stdio: ['ignore','inherit','inherit'] });

/** Write AVIF, WebP and JPG versions of one image. */
async function writeImage(input: string | Buffer,base: string,width: number,height: number) {
  const image = () => sharp(input).resize(width,height,{ fit: 'cover' });
  await image().avif({ quality: 52,effort: 7 }).toFile(`${base}.avif`);
  await image().webp({ quality: 78,effort: 6 }).toFile(`${base}.webp`);
  await image().jpeg({ quality: 80,mozjpeg: true,progressive: true }).toFile(`${base}.jpg`);
}

/** Two-pass encode to a bitrate that keeps the file under the size cap, lowering it until it fits. */
function encodeCapped(master: string,out: string,codec: 'h264' | 'vp9',seconds: number,work: string) {
  let kbps = Math.floor(LOOP.targetBytes*8/seconds/1000);
  for (let attempt = 0; attempt < 6; attempt++) {
    const common = ['-i',master,'-an','-r',String(LOOP.fps)];
    const log = join(work,`pass-${codec}`);
    const video = codec === 'h264'
      ? ['-c:v','libx264','-preset','veryslow','-profile:v','high','-pix_fmt','yuv420p','-b:v',`${kbps}k`,'-maxrate',`${Math.round(kbps*1.6)}k`,'-bufsize',`${kbps*2}k`,'-g','60','-tune','animation']
      : ['-c:v','libvpx-vp9','-b:v',`${kbps}k`,'-row-mt','1','-deadline','good','-cpu-used','1','-g','60','-pix_fmt','yuv420p'];
    ffmpeg([...common,...video,'-pass','1','-passlogfile',log,'-f',codec === 'h264' ? 'mp4' : 'webm','/dev/null']);
    ffmpeg([...common,...video,'-pass','2','-passlogfile',log,...(codec === 'h264' ? ['-movflags','+faststart'] : []),out]);
    const bytes = statSync(out).size;
    if (bytes <= LOOP.maxBytes - 10_000) return { bytes,kbps };
    kbps = Math.floor(kbps*(LOOP.maxBytes-30_000)/bytes);
  }
  throw new Error(`Could not fit ${out} under ${LOOP.maxBytes} bytes`);
}

export async function encode(scenario: Scenario,results: TakeResult[],log: (m: string) => void) {
  const { slug } = scenario;
  const out = join(root,'public/media',slug); mkdirSync(out,{ recursive: true });
  const work = join(captureDir(slug),'work'); rmSync(work,{ recursive: true,force: true }); mkdirSync(work,{ recursive: true });
  const loopTakes = scenario.loopOrder
    ? scenario.loopOrder.map(id => { const found = results.find(result => result.id === id); if (!found) throw new Error(`${slug}: loopOrder names unknown take ${id}`); return found; })
    : results.filter(result => scenario.takes.find(take => take.id === result.id)?.loop !== false);
  if (loopTakes.length < 3 || loopTakes.length > 4) throw new Error(`${slug}: the loop needs 3–4 moments, found ${loopTakes.length}.`);
  // Each clip is D seconds; neighbors crossfade for T. Clip 1 repeats at the end so the wrap is seamless.
  const D = scenario.clipSeconds ?? (loopTakes.length === 4 ? 2.4 : 2.8), T = LOOP.fade, frames = Math.round(D*LOOP.fps);
  const crop = (id: string) => { const box = scenario.takes.find(take => take.id === id)?.crop; return box ? `crop=${box[2]}:${box[3]}:${box[0]}:${box[1]},` : ''; };
  const segments = loopTakes.map((take,index) => {
    const file = join(work,`seg-${index}.mp4`);
    ffmpeg(['-ss',take.cut.toFixed(3),'-i',take.file,'-t',String(D+0.5),'-an','-vf',`fps=${LOOP.fps},${crop(take.id)}scale=${LOOP.width}:${LOOP.height}:flags=lanczos,format=yuv420p,tpad=stop_mode=clone:stop_duration=1`,'-frames:v',String(frames),'-c:v','libx264','-crf','8','-preset','fast',file]);
    return file;
  });
  const inputs = [...segments,segments[0]];
  const filters: string[] = []; let last = '0:v';
  for (let i = 1; i < inputs.length; i++) { const label = `x${i}`; filters.push(`[${last}][${i}:v]xfade=transition=fade:duration=${T}:offset=${(i*(D-T)).toFixed(3)}[${label}]`); last = label; }
  const seconds = loopTakes.length*(D-T);
  filters.push(`[${last}]trim=start=${T}:duration=${seconds.toFixed(3)},setpts=PTS-STARTPTS[out]`);
  const master = join(work,'master.mp4');
  ffmpeg([...inputs.flatMap(file => ['-i',file]),'-filter_complex',filters.join(';'),'-map','[out]','-an','-c:v','libx264','-crf','6','-preset','medium','-pix_fmt','yuv420p',master]);
  const mp4 = encodeCapped(master,join(out,'loop.mp4'),'h264',seconds,work);
  const webm = encodeCapped(master,join(out,'loop.webm'),'vp9',seconds,work);
  log(`${slug}: loop ${seconds.toFixed(1)}s — MP4 ${(mp4.bytes/1000).toFixed(0)} KB (${mp4.kbps} kbps), WebM ${(webm.bytes/1000).toFixed(0)} KB (${webm.kbps} kbps)`);
  // Poster = the loop's first frame, taken from the full-resolution recording.
  const posterPng = join(work,'poster.png');
  ffmpeg(['-ss',(loopTakes[0].cut+T).toFixed(3),'-i',loopTakes[0].file,'-frames:v','1',...(crop(loopTakes[0].id) ? ['-vf',crop(loopTakes[0].id).slice(0,-1)] : []),posterPng]);
  await writeImage(posterPng,join(out,'poster'),POSTER.width,POSTER.height);
  // Gallery stills, in take order.
  // Gallery: loop moments first (strongest), then any stills-only takes.
  const ordered = [...loopTakes,...results.filter(result => !loopTakes.includes(result))];
  const stills = ordered.flatMap(result => result.stills.map(still => ({ ...still,crop: crop(result.id) }))).slice(0,6);
  if (stills.length < 4) throw new Error(`${slug}: the gallery needs 4–6 stills, found ${stills.length}.`);
  for (const [index,still] of stills.entries()) {
    if (still.crop) { const cropped = join(work,`still-${index}.png`); ffmpeg(['-i',still.file,'-vf',still.crop.slice(0,-1),cropped]); still.file = cropped; }
    await writeImage(still.file,join(out,`shot-${index+1}`),SHOT.width,SHOT.height);
    await writeImage(still.file,join(out,`shot-${index+1}-thumb`),SHOT.thumbWidth,SHOT.thumbHeight);
  }
  for (let index = stills.length+1; index <= 6; index++) for (const suffix of ['','-thumb']) for (const ext of ['avif','webp','jpg']) rmSync(join(out,`shot-${index}${suffix}.${ext}`),{ force: true });
  const manifestPath = join(root,'src/data/media.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath,'utf8')) : {};
  manifest[slug] = { loopSeconds: Number(seconds.toFixed(2)),mp4Bytes: mp4.bytes,webmBytes: webm.bytes,shots: stills.map(still => still.alt),capturedAt: new Date().toISOString().slice(0,10) };
  writeFileSync(manifestPath,JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()),null,2)+'\n');
  log(`${slug}: poster and ${stills.length} stills written to public/media/${slug}/`);
}
