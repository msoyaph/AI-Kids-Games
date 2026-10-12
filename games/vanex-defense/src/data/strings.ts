import { t, type MessageKey } from '../i18n';
import type { BuildFail } from '../sim/Game';

/** Short, clear messages (middle-school reading level). Text lives in i18n. */
export function buildFailMsg(reason: BuildFail): string {
  return t(`build.fail.${reason}`);
}

/** How many variants each line set has in en.ts (`line.win.0` …). */
const LINE_COUNT = { 'line.win': 4, 'line.lose': 3, tip: 8 } as const;
export type LineSet = keyof typeof LINE_COUNT;

/** A random line from a set (PIP's win/lose quips, loading tips). */
export function randomLine(set: LineSet, r = Math.random()): string {
  const i = Math.min(LINE_COUNT[set] - 1, Math.floor(r * LINE_COUNT[set]));
  return t(`${set}.${i}` as MessageKey);
}
