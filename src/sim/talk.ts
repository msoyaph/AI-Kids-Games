// Dialogue line selection + templating (pure; the UI renders the results).
import { hashInts, hashString, Rng } from '../core/rng';
import { DIALOGUE, type DialogueTopic } from '../data/dialogue';
import { VILLAGER_BY_ID } from '../data/villagers';
import type { Game } from './game';

export type Expr = 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry' | 'love' | 'sleepy' | 'smug';
const EXPRS = new Set<Expr>(['neutral', 'happy', 'sad', 'surprised', 'angry', 'love', 'sleepy', 'smug']);

export interface Line {
  text: string;
  expr: Expr;
}

export type TalkCtx = Record<string, string | number>;

/** Parse "[happy]Hello {player}" into a Line with tokens substituted. */
export function parseLine(raw: string, ctx: TalkCtx = {}, fallback: Expr = 'neutral'): Line {
  let expr: Expr = fallback;
  let text = raw;
  const m = /^\[(\w+)\]\s*/.exec(raw);
  if (m && EXPRS.has(m[1] as Expr)) {
    expr = m[1] as Expr;
    text = raw.slice(m[0].length);
  }
  text = text.replace(/\{(\w+)\}/g, (_, k: string) => (ctx[k] !== undefined ? String(ctx[k]) : `{${k}}`));
  return { text, expr };
}

export function lines(raw: string[], ctx: TalkCtx = {}): Line[] {
  return raw.map((r) => parseLine(r, ctx));
}

/** Deterministic-per-conversation picker so lines vary but tests stay stable. */
export function talkRng(g: Game, id: string): Rng {
  const n = (g.state.stats[`talk_${id}`] ?? 0) + Math.floor(g.state.clock.minute / 30);
  return new Rng(hashInts(g.state.seed, g.state.clock.day, hashString(id), n));
}

export function villagerCtx(g: Game, id: string, extra: TalkCtx = {}): TalkCtx {
  const v = VILLAGER_BY_ID[id];
  const others = Object.keys(g.state.villagers).filter((k) => k !== id && g.state.villagers[k]!.movedIn);
  const other = others.length ? VILLAGER_BY_ID[others[(g.state.clock.day + id.length) % others.length]!]!.name : 'Pemberly';
  return { player: g.state.player.name, catch: v?.catchphrase ?? '', villager: other, island: 'Driftlight Isle', ...extra };
}

export function topicLine(g: Game, id: string, topic: DialogueTopic, extra: TalkCtx = {}): Line {
  const v = VILLAGER_BY_ID[id];
  if (!v) return { text: '...', expr: 'neutral' };
  const pool = DIALOGUE[v.personality][topic];
  const r = talkRng(g, id + topic);
  return parseLine(r.pick(pool), villagerCtx(g, id, extra));
}
