/**
 * Writes the Ai Kids Games site art: a 16:9 banner and a square thumbnail.
 * Run: `npm run svgs` -> site-assets/space-sky-banner.svg and site-assets/space-sky-thumb.svg
 * Pure vector art in the game's style (no external assets or fonts).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { Rng } from '../src/core/rng';

const INK = '#20124d';
const FONT = "'Arial Rounded MT Bold', 'Trebuchet MS', 'Nunito', Arial, sans-serif";

function stars(w: number, h: number, n: number, seed: number): string {
  const r = new Rng(seed);
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = r.range(0, w).toFixed(1);
    const y = r.range(0, h).toFixed(1);
    const s = r.range(1, 4);
    if (s > 3.3) out += `<path d="M${x} ${+y - s * 3} L${+x + s} ${y} L${x} ${+y + s * 3} L${+x - s} ${y} Z M${+x - s * 3} ${y} L${x} ${+y - s} L${+x + s * 3} ${y} L${x} ${+y + s} Z" fill="#fff" opacity="${r.range(0.6, 1).toFixed(2)}"/>`;
    else out += `<circle cx="${x}" cy="${y}" r="${s.toFixed(1)}" fill="#fff" opacity="${r.range(0.4, 1).toFixed(2)}"/>`;
  }
  return out;
}

function planet(id: string, cx: number, cy: number, r: number, base: string, light: string, dark: string, bands: string[] = [], ring?: string): string {
  const back = ring ? `<path d="M${cx - r * 1.9} ${cy} A${r * 1.9} ${r * 0.55} 0 0 1 ${cx + r * 1.9} ${cy}" fill="none" stroke="${ring}" stroke-width="${r * 0.22}"/><path d="M${cx - r * 1.9} ${cy} A${r * 1.9} ${r * 0.55} 0 0 1 ${cx + r * 1.9} ${cy}" fill="none" stroke="${INK}" stroke-width="${r * 0.04}" opacity=".5"/>` : '';
  const front = ring ? `<path d="M${cx - r * 1.9} ${cy} A${r * 1.9} ${r * 0.55} 0 0 0 ${cx + r * 1.9} ${cy}" fill="none" stroke="${ring}" stroke-width="${r * 0.22}"/>` : '';
  const bandEls = bands.map((c, i) => `<rect x="${cx - r}" y="${cy - r + (i + 0.6) * ((2 * r) / (bands.length + 1))}" width="${2 * r}" height="${r * 0.18}" fill="${c}" opacity=".7"/>`).join('');
  return `
  <defs>
    <radialGradient id="g_${id}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${light}"/><stop offset=".6" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/></radialGradient>
    <clipPath id="c_${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
  </defs>
  ${back}
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g_${id})"/>
  <g clip-path="url(#c_${id})">${bandEls}<circle cx="${cx + r * 0.5}" cy="${cy + r * 0.5}" r="${r * 1.1}" fill="#0a0630" opacity=".18"/></g>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${INK}" stroke-width="${Math.max(4, r * 0.04)}"/>
  ${front}`;
}

function rocket(x: number, y: number, s: number, rot: number): string {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <path d="M-12 52 Q0 110 12 52 Z" fill="#ffb43b"/><path d="M-6 52 Q0 86 6 52 Z" fill="#fff36b"/>
    <path d="M-20 20 L-38 50 L-16 46 Z" fill="#ff5d73" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M20 20 L38 50 L16 46 Z" fill="#ff5d73" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M0 -50 C22 -30 24 14 18 52 L-18 52 C-24 14 -22 -30 0 -50 Z" fill="#f4f7ff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M0 -50 C10 -41 15 -30 17 -20 L-17 -20 C-15 -30 -10 -41 0 -50 Z" fill="#ff5d73" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="0" cy="4" r="11" fill="#4dd4ff" stroke="${INK}" stroke-width="4"/><circle cx="-4" cy="0" r="3.5" fill="#fff"/>
  </g>`;
}

function alien(x: number, y: number, s: number): string {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-14 -36 Q-18 -60 -30 -70" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="-30" cy="-72" r="9" fill="#ffe066" stroke="${INK}" stroke-width="4"/>
    <path d="M14 -36 Q18 -60 30 -70" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="30" cy="-72" r="9" fill="#ffe066" stroke="${INK}" stroke-width="4"/>
    <path d="M-45 5 C-48 -45 48 -45 45 5 C48 45 -48 45 -45 5 Z" fill="#2de0c7" stroke="${INK}" stroke-width="5"/>
    <ellipse cx="0" cy="26" rx="26" ry="16" fill="#c9fff4"/>
    <circle cx="-18" cy="-6" r="10" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="18" cy="-6" r="10" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="0" cy="-20" r="10" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <circle cx="-16" cy="-5" r="5" fill="${INK}"/><circle cx="20" cy="-5" r="5" fill="${INK}"/><circle cx="2" cy="-19" r="5" fill="${INK}"/>
    <path d="M-12 12 Q0 24 12 12" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <rect x="-38" y="20" width="76" height="12" rx="6" fill="#ff9f43" stroke="${INK}" stroke-width="3"/>
  </g>`;
}

function title(x: number, y: number, size: number, sub: boolean): string {
  return `<g text-anchor="middle" font-family="${FONT}" font-weight="900">
    <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7b3"/><stop offset=".5" stop-color="#ffe066"/><stop offset="1" stop-color="#ff9f43"/></linearGradient></defs>
    <text x="${x}" y="${y + size * 0.08}" font-size="${size}" fill="${INK}" stroke="${INK}" stroke-width="${size * 0.16}" stroke-linejoin="round">Space Sky</text>
    <text x="${x}" y="${y}" font-size="${size}" fill="url(#tg)" stroke="${INK}" stroke-width="${size * 0.05}" stroke-linejoin="round" paint-order="stroke">Space Sky</text>
    ${sub ? `<text x="${x}" y="${y + size * 0.62}" font-size="${size * 0.3}" fill="#4dd4ff" stroke="${INK}" stroke-width="${size * 0.05}" paint-order="stroke" stroke-linejoin="round">Academy Adventures</text>` : ''}
  </g>`;
}

function background(w: number, h: number, seed: number): string {
  return `<defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="#4a3aa8"/><stop offset=".55" stop-color="#2b1d78"/><stop offset="1" stop-color="#140d3a"/></radialGradient>
    <radialGradient id="neb1" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff7ad9" stop-opacity=".45"/><stop offset="1" stop-color="#ff7ad9" stop-opacity="0"/></radialGradient>
    <radialGradient id="neb2" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#4dd4ff" stop-opacity=".35"/><stop offset="1" stop-color="#4dd4ff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <ellipse cx="${w * 0.25}" cy="${h * 0.3}" rx="${w * 0.35}" ry="${h * 0.35}" fill="url(#neb1)"/>
  <ellipse cx="${w * 0.75}" cy="${h * 0.7}" rx="${w * 0.35}" ry="${h * 0.35}" fill="url(#neb2)"/>
  ${stars(w, h, Math.round((w * h) / 9000), seed)}`;
}

function banner(): string {
  const w = 1920;
  const h = 1080;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <title>Space Sky</title>
  ${background(w, h, 7)}
  ${planet('sat', 1530, 300, 170, '#ecd59f', '#fff3d6', '#c4a46a', ['#d4b57a', '#f7ebc8', '#c9a46a'], '#e8d3a2')}
  ${planet('earth', 260, 1040, 360, '#3a8dff', '#9fd0ff', '#1f5fc4', [])}
  <path d="M120 900 C200 820 300 860 330 940 C360 1010 260 1060 180 1040 Z M380 760 C460 720 520 780 500 840 C480 900 400 880 380 760 Z" fill="#36c46b" stroke="${INK}" stroke-width="6"/>
  ${planet('moon', 540, 640, 70, '#cfccc6', '#ffffff', '#8f8a82')}
  ${planet('mars', 1720, 820, 90, '#e0623a', '#ffa07a', '#a8402a')}
  ${rocket(1150, 640, 2.4, 35)}
  ${alien(1420, 720, 1.5)}
  ${title(960, 400, 230, true)}
</svg>
`;
}

function thumb(): string {
  const s = 1024;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}">
  <title>Space Sky</title>
  ${background(s, s, 11)}
  ${planet('sat', 800, 230, 120, '#ecd59f', '#fff3d6', '#c4a46a', ['#d4b57a', '#f7ebc8', '#c9a46a'], '#e8d3a2')}
  ${planet('earth', 170, 980, 300, '#3a8dff', '#9fd0ff', '#1f5fc4', [])}
  ${rocket(560, 560, 2.6, 30)}
  ${alien(820, 760, 1.2)}
  ${title(512, 230, 170, false)}
</svg>
`;
}

mkdirSync('site-assets', { recursive: true });
writeFileSync('site-assets/space-sky-banner.svg', banner());
writeFileSync('site-assets/space-sky-thumb.svg', thumb());
console.log('Wrote site-assets/space-sky-banner.svg and site-assets/space-sky-thumb.svg');
