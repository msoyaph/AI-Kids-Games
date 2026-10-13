/**
 * Story scripts: what happens when you talk to someone, step on a trigger or finish a spar.
 * Scripts are plain data (data/dialogue/*.ts); the game's script runner plays them, waiting for
 * the dialogue box, choices, spars and fades. Text may use {player}, {rival}, {partner}.
 *
 * Flag expressions: "a", "!a", "a & b", "a | b", "a & !b" (& binds tighter than |).
 */
import type { Dir } from './state';

export type Cmd =
  | { say: string; who?: string }
  | { ask: string; who?: string; yes: Cmd[]; no?: Cmd[]; yesText?: string; noText?: string }
  | { set: string }
  | { clear: string }
  | { if: string; then: Cmd[]; else?: Cmd[] }
  | { give: string; n?: number }
  | { coins: number }
  | { heal: true }
  | { rest: true }
  | { spar: string; win?: Cmd[]; lose?: Cmd[] }
  | { wild: { species: string; level: number; guardian?: boolean; partner?: boolean }; win?: Cmd[]; lose?: Cmd[]; friend?: Cmd[] }
  /** Befriend your first partner (the Spark Ring tutorial; it always works out). */
  | { partner: string }
  | { warp: string; x: number; y: number; dir?: Dir }
  | { walk: string; path: string }
  | { face: string; dir: Dir }
  | { wait: number }
  | { fade: 'out' | 'in' }
  | { quest: string; stage: number }
  | { tutorial: string }
  | { music: string }
  | { sfx: string }
  | { beacon: string }
  | { shop: string }
  | { base: true }
  | { tower: true }
  | { credits: true }
  | { show: string }
  | { hide: string }
  | { emote: string; who?: string }
  | { goto: string };

export type Script = Cmd[];

/** Evaluate a flag expression against the set flags. */
export function evalFlags(expr: string, flags: ReadonlySet<string>): boolean {
  return expr.split('|').some(any => any.split('&').every(term => {
    const t = term.trim();
    if (!t) return true;
    return t.startsWith('!') ? !flags.has(t.slice(1).trim()) : flags.has(t);
  }));
}

/** Fill {player}, {rival}, {partner} and friends' names into dialogue text. */
export function fillText(text: string, names: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => names[k] ?? m);
}
