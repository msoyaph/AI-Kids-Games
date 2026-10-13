// Capture and render need the whole machine: never run them while tests or another render run.
import { execFileSync } from 'node:child_process';

const PATTERN = 'playwright test|vitest|test-server|playwright/lib/runner|hyperframes render';
export function running(): string {
  try { return execFileSync('pgrep', ['-fl', PATTERN], { encoding: 'utf8' }).trim().split('\n').filter(line => !line.includes(String(process.pid))).join('\n'); } catch { return ''; }
}
export function idle(what = 'capture'): void {
  const busy = running();
  if (busy) throw new Error(`Tests or a render are running; ${what} later.\n${busy}`);
}
