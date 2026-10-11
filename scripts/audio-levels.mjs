// Mixing pass: renders every music track, stinger and sound effect through
// the game's own synth code in an OfflineAudioContext (Chromium), measures
// sample peak + loudness (LUFS, K-weighted), and computes per-sound gains
// that bring each one to its group's target level.
//   npm run audio:levels              print the table (current mix)
//   npm run audio:levels -- --write   also write src/audio/mix.ts
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const WRITE = process.argv.includes('--write');
// --busy: only the worst-case master check (fast)
const BUSY_ONLY = process.argv.includes('--busy');

// Loudness targets (raw, before the volume buses). Tracks are evened out at
// full intensity; stingers sit a little above the music; sound effects are
// levelled around the median of all effects (100 ms "punch" loudness), with
// frequent combat sounds under one-off events so a big fight never drowns the
// music. Groups:
const TARGET = { track: -18, stinger: -16 };
const SFX_OFFSET = { shot: -2, light: -3, hit: 2, event: 6, ui: -1 };
const SFX_GROUP = {
  shot: ['arrow', 'cannon', 'fire', 'water', 'nature', 'light', 'shadow', 'earth', 'herofire'],
  light: ['poof', 'crit', 'shield', 'stun', 'heal', 'coin', 'warn', 'teleport', 'sell'],
  hit: ['bigpoof', 'splash', 'barrier', 'disable', 'burrow', 'leak', 'build', 'herodown', 'herorespawn', 'ability', 'clear'],
  event: ['meteor', 'herospecial', 'upgrade', 'pick', 'star'],
  ui: ['click', 'back', 'deny'],
};
const PEAK_CEIL = -3; // dBFS per sound, before buses
const GAIN_MIN = 0.15;
const GAIN_MAX = 3;

const groupOf = (name) => Object.keys(SFX_GROUP).find((g) => SFX_GROUP[g].includes(name)) ?? 'hit';
const round = (x) => Math.round(x * 100) / 100;
const fmt = (x) => (x <= -119 ? '  -inf' : x.toFixed(1).padStart(6));

const server = await createServer({ logLevel: 'error', server: { port: 4319, strictPort: false } });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch();
const page = await browser.newPage();
// any module URL gives us the dev server's origin without booting the game
await page.goto(base + 'src/audio/mix.ts');

const data = await page.evaluate(async (busyOnly) => {
  const m = await import('/src/audio/offline.ts');
  const out = { tracks: {}, stingers: {}, sfx: {}, busy: {} };
  out.busy.default = await m.measureBusy(0.5, 0.8);
  out.busy.max = await m.measureBusy(1, 1);
  if (busyOnly) return out;
  for (const id of m.ITEMS.tracks) {
    out.tracks[id] = {
      calm: await m.measureTrack(id, 0.1, 12),
      full: await m.measureTrack(id, 1, 12),
      mixed: await m.measureTrack(id, 1, 12, false),
    };
  }
  for (const id of m.ITEMS.stingers) out.stingers[id] = { raw: await m.measureStinger(id), mixed: await m.measureStinger(id, false) };
  for (const id of m.ITEMS.sfx) out.sfx[id] = { raw: await m.measureSfx(id), mixed: await m.measureSfx(id, false) };
  return out;
}, BUSY_ONLY);
await browser.close();
await server.close();

const gainFor = (lvl, target, ceil = PEAK_CEIL) => {
  let g = Math.pow(10, (target - lvl.lufsOrMomentary) / 20);
  // never push a sound's peak past the ceiling
  g = Math.min(g, Math.pow(10, (ceil - lvl.peakDb) / 20));
  return Math.min(GAIN_MAX, Math.max(GAIN_MIN, g));
};

const mix = { tracks: {}, sfx: {}, stingers: {} };
const rows = [];
for (const [id, r] of Object.entries(data.tracks)) {
  // music runs through a bus that is always well under unity: allow peaks to 0 dBFS
  const g = gainFor({ lufsOrMomentary: r.full.lufs, peakDb: r.full.peakDb }, TARGET.track, 0);
  mix.tracks[id] = round(g);
  rows.push(['track', id, r.full.lufs, r.full.peakDb, g, r.mixed.lufs, `calm ${r.calm.lufs.toFixed(1)}`]);
}
for (const [id, r] of Object.entries(data.stingers)) {
  const g = gainFor({ lufsOrMomentary: r.raw.momentary, peakDb: r.raw.peakDb }, TARGET.stinger);
  mix.stingers[id] = round(g);
  rows.push(['stinger', id, r.raw.momentary, r.raw.peakDb, g, r.mixed.momentary, '']);
}
const punches = Object.values(data.sfx)
  .map((r) => r.raw.punch)
  .sort((a, b) => a - b);
const sfxRef = punches[Math.floor(punches.length / 2)] ?? 0;
for (const [id, r] of Object.entries(data.sfx)) {
  const grp = groupOf(id);
  const g = gainFor({ lufsOrMomentary: r.raw.punch, peakDb: r.raw.peakDb }, sfxRef + SFX_OFFSET[grp]);
  mix.sfx[id] = round(g);
  rows.push(['sfx:' + grp, id, r.raw.punch, r.raw.peakDb, g, r.mixed.punch, '']);
}

if (!BUSY_ONLY) console.log('\nkind        name               loud(raw)  peak   gain   loud(now)   (tracks: integrated; stingers: 400 ms; sfx: 100 ms)');
for (const [kind, id, loud, peak, g, now, note] of rows) {
  console.log(`${kind.padEnd(11)} ${id.padEnd(18)} ${fmt(loud)}  ${fmt(peak)}  ${g.toFixed(2).padStart(5)}  ${fmt(now)}  ${note}`);
}
if (!BUSY_ONLY) console.log(`\nTargets (LUFS): tracks ${TARGET.track} integrated, stingers ${TARGET.stinger} momentary, sfx median ${sfxRef.toFixed(1)} punch + ${JSON.stringify(SFX_OFFSET)}`);
for (const [k, v] of Object.entries(data.busy)) {
  console.log(`Busy fight through master (${k === 'max' ? 'music 100%, sfx 100%' : 'default volumes'}): peak ${v.peakDb.toFixed(2)} dBFS, ${v.lufs.toFixed(1)} LUFS`);
}

if (WRITE && !BUSY_ONLY) {
  const body = (o) =>
    Object.entries(o)
      .filter(([, g]) => Math.abs(g - 1) > 0.02)
      .map(([k, g]) => `    ${/^[a-z]+$/.test(k) ? k : `'${k}'`}: ${g},`)
      .join('\n');
  const src = `/**
 * Mix gains per track / sound effect / stinger (1 = as synthesised).
 * Generated by \`node scripts/audio-levels.mjs --write\`; edit by hand only to
 * nudge a sound, then re-run the script to check the levels.
 */
export interface MixTable {
  tracks: Record<string, number>;
  sfx: Record<string, number>;
  stingers: Record<string, number>;
}

export const MIX: MixTable = {
  tracks: {
${body(mix.tracks)}
  },
  sfx: {
${body(mix.sfx)}
  },
  stingers: {
${body(mix.stingers)}
  },
};
`;
  writeFileSync('src/audio/mix.ts', src);
  console.log('\nWrote src/audio/mix.ts');
}
