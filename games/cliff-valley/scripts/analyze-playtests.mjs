#!/usr/bin/env node
/**
 * Summarize exported `?playtest=1` logs and compare them with the pacing model.
 *
 *   npm run analyze-playtests -- playtests/          (a folder of .json exports)
 *   npm run analyze-playtests -- a.json b.json       (or individual files)
 *
 * Prints a Markdown report and writes it to reports/playtests.md. Accepts a single log,
 * an array of logs, or { logs: [...] } per file (e.g. pasted from the in-game Copy box).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DAYS_PER_YEAR = 40;
const TARGET = [7, 8];
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const hh = (m) => `${Math.floor(m / 60) % 24}:${String(Math.round(m % 60)).padStart(2, '0')}`;
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);

/** Read logs from files/folders. */
export function loadLogs(paths) {
  const files = [];
  for (const p of paths) {
    if (!existsSync(p)) {
      console.warn(`skip: ${p} (not found)`);
      continue;
    }
    if (statSync(p).isDirectory()) for (const f of readdirSync(p)) if (f.endsWith('.json')) files.push(join(p, f));
    else files.push(p);
  }
  const logs = [];
  for (const f of files) {
    try {
      const raw = JSON.parse(readFileSync(f, 'utf8'));
      const list = Array.isArray(raw) ? raw : Array.isArray(raw.logs) ? raw.logs : [raw];
      for (const l of list) if (l && l.game === 'cliff-valley' && Array.isArray(l.sessions)) logs.push(l);
    } catch (e) {
      console.warn(`skip: ${f} (${e.message})`);
    }
  }
  // the same device may export several times: keep the longest log per id
  const byId = new Map();
  for (const l of logs) {
    const prev = byId.get(l.id);
    if (!prev || l.days.length > prev.days.length) byId.set(l.id, l);
  }
  return [...byId.values()];
}

/** Turn logs into numbers + a Markdown report. */
export function summarize(logs) {
  const players = logs.map((l) => {
    const playMin = l.sessions.reduce((t, s) => t + s.playSec, 0) / 60;
    const pausedMin = l.sessions.reduce((t, s) => t + s.pausedSec, 0) / 60;
    // one farm per player: the slot with the most days
    const slots = new Map();
    for (const d of l.days) slots.set(d.slot, [...(slots.get(d.slot) ?? []), d]);
    const days = [...slots.values()].sort((a, b) => b.length - a.length)[0] ?? [];
    const perDay = days.map((d) => (d.playSec + d.pausedSec) / 60);
    const seasonMin = [0, 1, 2, 3].map((s) => days.filter((d) => Math.min(3, Math.floor(d.day / 10)) === s).reduce((t, d) => t + (d.playSec + d.pausedSec) / 60, 0));
    const reached = Math.max(-1, ...days.map((d) => d.day)) + 1;
    const ev = (k) => l.events.filter((e) => e.kind === k);
    const fps = l.sessions.filter((s) => s.fpsAvg > 0);
    return {
      id: l.id,
      device: l.device,
      sessions: l.sessions.length,
      playMin,
      pausedMin,
      days: days.length,
      reached,
      perDayMin: median(perDay),
      bedtime: median(days.map((d) => d.bed)),
      passedOutShare: days.length ? days.filter((d) => d.passedOut).length / days.length : 0,
      seasonMin,
      boards: ev('board').map((e) => `${e.data} (day ${e.day + 1})`),
      firstHarvestDay: ev('firstHarvest')[0]?.day,
      deepest: Math.max(0, ...days.map((d) => d.deepest)),
      faints: ev('faint').length,
      finaleDay: ev('finale')[0]?.day,
      menusPerDay: mean(days.map((d) => d.menus)),
      fpsAvg: mean(fps.map((s) => s.fpsAvg)),
      fpsLow: fps.length ? Math.min(...fps.map((s) => s.fpsLow)) : 0,
      slowShare: l.sessions.reduce((t, s) => t + s.slowSec, 0) / Math.max(1, l.sessions.reduce((t, s) => t + s.playSec + s.pausedSec, 0)),
    };
  });
  const allPerDay = players.filter((p) => p.days >= 3).map((p) => p.perDayMin);
  const projected = (median(allPerDay) * DAYS_PER_YEAR) / 60;
  const lines = [
    '# Cliff Valley — playtest summary',
    '',
    `${players.length} player${players.length === 1 ? '' : 's'}, ${players.reduce((t, p) => t + p.sessions, 0)} sessions, ${f1(players.reduce((t, p) => t + p.playMin + p.pausedMin, 0) / 60)} hours in total.`,
    '',
    '## Pacing',
    '',
    allPerDay.length
      ? `Median real time per in-game day: **${f1(median(allPerDay))} min** → projected year one (${DAYS_PER_YEAR} days): **${f1(projected)} h** (target ${TARGET[0]}–${TARGET[1]} h; model: see reports/pacing.md).`
      : 'Not enough days played yet to project year one (need 3+ days per player).',
    projected && (projected < TARGET[0] || projected > TARGET[1]) ? `\n> Outside the target band. The main lever is \`TUNING.dayRealSeconds\` (one full day, 6:00 → 2:00).` : '',
    '',
    '| Player | Device | Days played | Reached | Min / day | Bedtime | Dozed off | Spring | Summer | Autumn | Winter | Paused % |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...players.map((p) => `| ${p.id.slice(0, 6)} | ${p.device.w}×${p.device.h}${p.device.touch ? ' touch' : ''} | ${p.days} | ${p.reached ? `${SEASONS[Math.min(3, Math.floor((p.reached - 1) / 10))]} ${((p.reached - 1) % 10) + 1}` : '–'} | ${f1(p.perDayMin)} | ${p.days ? hh(p.bedtime) : '–'} | ${Math.round(p.passedOutShare * 100)}% | ${p.seasonMin.map((m) => (m ? f1(m / 60) + ' h' : '–')).join(' | ')} | ${Math.round((p.pausedMin / Math.max(1, p.playMin + p.pausedMin)) * 100)}% |`),
    '',
    '## Progress',
    '',
    '| Player | First harvest | Boards repaired | Deepest floor | Faints | Finale | Menus / day |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...players.map((p) => `| ${p.id.slice(0, 6)} | ${p.firstHarvestDay !== undefined ? `day ${p.firstHarvestDay + 1}` : '–'} | ${p.boards.join(', ') || '–'} | ${p.deepest} | ${p.faints} | ${p.finaleDay !== undefined ? `day ${p.finaleDay + 1}` : '–'} | ${f1(p.menusPerDay)} |`),
    '',
    '## Performance',
    '',
    '| Player | Renderer | Avg FPS | Lowest FPS | Time under 45 FPS |',
    '| --- | --- | --- | --- | --- |',
    ...players.map((p) => `| ${p.id.slice(0, 6)} | ${p.device.renderer}${p.device.lowq ? ' (low)' : ''} | ${Math.round(p.fpsAvg)} | ${p.fpsLow} | ${Math.round(p.slowShare * 100)}% |`),
    '',
  ];
  return { players, projected, markdown: lines.join('\n') };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const paths = args.length ? args : ['playtests'];
  const logs = loadLogs(paths);
  if (!logs.length) {
    console.log('No playtest logs found. Export them from the game (open it with ?playtest=1, tap the 🧪 Playtest badge),');
    console.log('save each as a .json file, then run: npm run analyze-playtests -- <folder or files>');
    process.exit(1);
  }
  const { markdown } = summarize(logs);
  console.log(markdown);
  mkdirSync('reports', { recursive: true });
  writeFileSync('reports/playtests.md', markdown);
  console.log('\nWrote reports/playtests.md');
}
