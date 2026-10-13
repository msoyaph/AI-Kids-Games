// Before any browser test, capture or long simulation: is another session's heavy test work running?
//   node scripts/quiet-check.mjs        exit 0 = quiet, exit 1 = busy (lists the processes)
//   node scripts/quiet-check.mjs --wait  re-checks every 30 s until quiet (max 2 h)
// Looks for Playwright browsers (Chromium, WebKit, Firefox from the ms-playwright cache), Playwright
// test runners, Vitest runs and capture scripts, except this process and its parents.
import { execFileSync } from 'node:child_process';
import { statfsSync } from 'node:fs';
import { homedir } from 'node:os';

const HEAVY = [/ms-playwright/, /playwright(\.js)?\s+test/, /@playwright\/test/, /\bvitest\b/, /capture-previews/, /release-local/];

function busy() {
  const out = execFileSync('ps', ['-axo', 'pid=,ppid=,command='], { encoding: 'utf8' });
  const rows = out.split('\n').map(line => line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/)).filter(Boolean).map(m => ({ pid: +m[1], ppid: +m[2], cmd: m[3] }));
  const mine = new Set([process.pid]);
  for (let p = process.ppid, guard = 0; p > 1 && guard < 50; guard++) { mine.add(p); p = rows.find(r => r.pid === p)?.ppid ?? 0; }
  return rows.filter(r => !mine.has(r.pid) && HEAVY.some(re => re.test(r.cmd)) && !/quiet-check/.test(r.cmd));
}

function freeGB() {
  try { const s = statfsSync(homedir()); return (s.bavail * s.bsize) / 1e9; } catch { return NaN; }
}

const wait = process.argv.includes('--wait');
const start = Date.now();
for (;;) {
  const list = busy();
  if (!list.length) { console.log(`Quiet: no other heavy test processes. Free disk: ${freeGB().toFixed(1)} GB.`); process.exit(0); }
  console.log(`Busy: ${list.length} heavy process(es):\n${list.slice(0, 8).map(r => `  ${r.pid} ${r.cmd.slice(0, 140)}`).join('\n')}`);
  if (!wait || Date.now() - start > 2 * 3600_000) process.exit(1);
  await new Promise(resolve => setTimeout(resolve, 30_000));
}
