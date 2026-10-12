// Review every rendered file in out/: contact sheets every 0.5 s, a frame-by-frame flash audit,
// readability at phone size, loudness and true peak, and every cut checked against the beat grid.
// Writes out/review/ (sheets) and out/review/report.md; exits non-zero if a check fails.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import { at, BEAT, checkCut, CUTS, FORMATS, type Format, minSeconds, sizzle } from '../reel.config';
import { ffmpegPath } from '../render/media';

const out = join(sizzle, 'out'), dir = join(out, 'review');
mkdirSync(dir, { recursive: true });
const report: string[] = ['# Sizzle reel review', ''], failures: string[] = [];
const fail = (m: string) => { failures.push(m); report.push(`- **FAIL** ${m}`); };
const ok = (m: string) => report.push(`- ${m}`);

/** Raw grey frames at 60 fps, downscaled (for the flash audit and cut detection). */
function frames(file: string, w: number, h: number) {
  const raw = execFileSync(ffmpegPath, ['-v', 'error', '-i', file, '-vf', `scale=${w}:${h}:flags=area,format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 });
  const n = raw.length / (w * h);
  return Array.from({ length: n }, (_, i) => raw.subarray(i * w * h, (i + 1) * w * h));
}
/** Mean relative luminance (sRGB-ish) of a region of a grey frame. */
function lum(f: Uint8Array, w: number, x0: number, y0: number, x1: number, y1: number) {
  let s = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { s += (f[y * w + x] / 255) ** 2.2; n++; }
  return s / n;
}
/**
 * WCAG general flash test: a flash is a pair of opposing luminance changes of ≥ 0.10 where the
 * darker side is below 0.80. Returns the most flashes found in any one-second window.
 */
function flashes(series: number[], fps = 60) {
  // Turning points with a 0.02 dead band: the series becomes alternating rising and falling runs.
  const pts = [series[0]], idx = [0];
  let dir = 0;
  for (let i = 1; i < series.length; i++) {
    const v = series[i], last = pts[pts.length - 1], d = v - last;
    if (dir === 0) { if (Math.abs(d) >= 0.02) { dir = Math.sign(d); pts.push(v); idx.push(i); } continue; }
    if (d * dir > 0) { pts[pts.length - 1] = v; idx[idx.length - 1] = i; }
    else if (Math.abs(d) >= 0.02) { dir = -dir; pts.push(v); idx.push(i); }
  }
  const transitions: number[] = [];
  for (let k = 1; k < pts.length; k++) if (Math.abs(pts[k] - pts[k - 1]) >= 0.1 && Math.min(pts[k], pts[k - 1]) < 0.8) transitions.push(idx[k]);
  let worst = 0;
  for (let a = 0; a < transitions.length; a++) { let b = a; while (b < transitions.length && transitions[b] - transitions[a] < fps) b++; worst = Math.max(worst, Math.floor((b - a) / 2)); }
  return { worst, transitions: transitions.length };
}

async function sheets(file: string, name: string, seconds: number, portrait: boolean) {
  const tmp = join(dir, `.${name}`); rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  const tw = portrait ? 180 : 320, th = portrait ? 320 : 180;
  execFileSync(ffmpegPath, ['-v', 'error', '-i', file, '-vf', `fps=2,scale=${tw}:${th}`, join(tmp, '%04d.png')]);
  const count = Math.round(seconds * 2), cols = portrait ? 10 : 6, rows = portrait ? 3 : 5, per = cols * rows, label = 28, files: string[] = [];
  for (let s = 0; s * per < count; s++) {
    const comps: OverlayOptions[] = [];
    for (let k = 0; k < per && s * per + k < count; k++) {
      const i = s * per + k, x = (k % cols) * (tw + 8) + 8, y = Math.floor(k / cols) * (th + label + 8) + 8;
      comps.push({ input: join(tmp, `${String(i + 1).padStart(4, '0')}.png`), left: x, top: y + label });
      comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${label}"><text x="2" y="20" font-family="Helvetica, Arial" font-size="18" font-weight="700" fill="#16191F">${(i * 0.5).toFixed(1)} s</text></svg>`), left: x, top: y });
    }
    const W = cols * (tw + 8) + 8, H = rows * (th + label + 8) + 8, sheet = join(dir, `${name}-${s + 1}.jpg`);
    await sharp({ create: { width: W, height: H, channels: 3, background: '#F5F6F8' } }).composite(comps).jpeg({ quality: 84 }).toFile(sheet);
    files.push(sheet);
  }
  rmSync(tmp, { recursive: true, force: true });
  return files;
}

function loudness(file: string) {
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-i', file, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(r.stderr.slice(r.stderr.lastIndexOf('Summary')))?.[1]);
  const TP = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(r.stderr.slice(r.stderr.lastIndexOf('True peak')))?.[1]);
  return { I, TP };
}

for (const cut of CUTS) {
  report.push(`## ${cut.id} (${(cut.beats * BEAT).toFixed(2)} s)`, '');
  const problems = checkCut(cut);
  if (problems.length) problems.forEach(fail); else ok(`Timing and readability: every block on the beat grid; every line on screen at least words ÷ 1.8 + 0.5 s (shortest margin ${Math.min(...cut.blocks.flatMap(b => 'lines' in b ? b.lines.filter(l => l.size !== 'small').map(l => (b.end - l.at) * BEAT - minSeconds(l.text)) : [])).toFixed(2)} s).`);
  for (const format of Object.keys(FORMATS) as Format[]) {
    const f = FORMATS[format], name = `${cut.id}-${f.id}`, file = join(out, `ai-kids-games-${name}.mp4`), P = format === 'portrait';
    if (!existsSync(file)) { fail(`${name}: not rendered`); continue; }
    report.push('', `### ${name}`, '');
    const list = await sheets(file, name, at(cut.beats), P);
    ok(`Contact sheets (every 0.5 s): ${list.map(s => s.replace(out + '/', '')).join(', ')}`);
    // Flash audit on the whole frame and each quarter of it.
    const w = P ? 36 : 64, h = P ? 64 : 36, fr = frames(file, w, h);
    const regions: [string, number, number, number, number][] = [['whole frame', 0, 0, w, h], ['top-left', 0, 0, w / 2, h / 2], ['top-right', w / 2, 0, w, h / 2], ['bottom-left', 0, h / 2, w / 2, h], ['bottom-right', w / 2, h / 2, w, h]];
    const worst = regions.map(([label, x0, y0, x1, y1]) => ({ label, ...flashes(fr.map(f => lum(f, w, x0, y0, x1, y1))) }));
    const max = Math.max(...worst.map(r => r.worst));
    (max <= 3 ? ok : fail)(`Flash audit (${fr.length} frames): at most ${max} flash${max === 1 ? '' : 'es'} in any one second (limit 3); ${worst.map(r => `${r.label} ${r.worst}`).join(', ')}.`);
    // Cuts: big frame-to-frame changes must land on a beat or half beat (± 1 frame).
    const cuts: number[] = [];
    for (let i = 1; i < fr.length; i++) { let d = 0; for (let k = 0; k < fr[i].length; k++) d += Math.abs(fr[i][k] - fr[i - 1][k]); if (d / fr[i].length > 28) cuts.push(i / 60); }
    const offGrid = cuts.filter(t => { const half = BEAT / 2, r = t % half; return Math.min(r, half - r) > 1 / 60 + 0.11; });
    (offGrid.length ? fail : ok)(`Cuts on the beat: ${cuts.length} hard changes detected, ${offGrid.length} off the half-beat grid${offGrid.length ? ` (${offGrid.slice(0, 6).map(t => t.toFixed(2)).join(', ')} s)` : ''}.`);
    // Text size at phone size (a 390 px wide phone, held upright).
    const scale = 390 / f.width;
    ok(`Readability at phone size: headlines ${(Math.round((P ? 92 : 112) * scale))} px, game pitches ${Math.round(64 * scale)} px, small lines ${Math.round((P ? 40 : 42) * scale)} px on a 390 px wide phone.`);
    const { I, TP } = loudness(file);
    (Math.abs(I + 14) <= 0.5 && TP <= -1 ? ok : fail)(`Loudness ${I.toFixed(1)} LUFS (target −14), true peak ${TP.toFixed(1)} dBTP (limit −1.0).`);
  }
  report.push('');
}
for (const web of ['trailer-1080.mp4', 'trailer-1080.webm', 'trailer-720.mp4', 'trailer-720.webm']) {
  const file = join(out, web);
  if (!existsSync(file)) continue;
  const bytes = readFileSync(file).length, { I, TP } = loudness(file);
  (bytes < 8_000_000 && TP <= -1 ? ok : fail)(`${web}: ${(bytes / 1e6).toFixed(2)} MB (limit 8), ${I.toFixed(1)} LUFS, ${TP.toFixed(1)} dBTP.`);
}
writeFileSync(join(dir, 'report.md'), report.join('\n') + '\n');
console.log(report.join('\n'));
if (failures.length) { console.error(`\n${failures.length} check(s) failed.`); process.exit(1); }
