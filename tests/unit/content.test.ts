/**
 * Kid-safety content scan: every string the game can show (items, villagers, dialogue, mail,
 * cutscenes, festivals, boards, achievements, tips) must stay clear of romance, alcohol,
 * gambling, scary/violent words, external links and requests for personal information.
 */
import { describe, expect, it } from 'vitest';
import '../../src/sim';
import { ACHIEVEMENTS } from '../../src/data/achievements';
import { BOARDS } from '../../src/data/boards';
import { CUTSCENES } from '../../src/data/cutscenes';
import { DIALOGUE } from '../../src/data/dialogue';
import { FESTIVALS } from '../../src/data/festivals';
import { ITEMS } from '../../src/data/items';
import { LETTERS } from '../../src/data/mail';
import { FINALE, HEARTSTONE, INTRO, REPAIRS } from '../../src/data/story-scenes';
import { SHOPS } from '../../src/data/shops';
import { SKILL_DEFS } from '../../src/data/skills';
import { VILLAGERS } from '../../src/data/villagers';

function strings(v: unknown, out: string[] = [], depth = 0): string[] {
  if (depth > 12 || v === null || v === undefined) return out;
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) for (const x of v) strings(x, out, depth + 1);
  else if (typeof v === 'object') for (const x of Object.values(v as object)) strings(x, out, depth + 1);
  return out;
}

const BANNED: [string, RegExp][] = [
  ['romance', /\b(romanc\w*|dating|go on a date|marry|married|marriage|wedding|spouse|husband|wife|boyfriend|girlfriend|kiss\w*|flirt\w*|crush on)\b/i],
  ['alcohol', /\b(beer|wine|ale|mead|whiskey|vodka|alcohol\w*|drunk|brewery|tavern|saloon|cocktail)\b/i],
  ['gambling', /\b(gambl\w*|casino|lottery|slot machine|betting|wager)\b/i],
  ['violence', /\b(blood\w*|kill\w*|murder\w*|gun|guns|corpse|gore|stab\w*)\b/i],
  ['links', /(https?:\/\/|www\.)/i],
  ['personal info', /\b(your (real )?(birthday|address|phone|email|last name|surname|school))\b/i],
];

describe('kid-friendly content', () => {
  const sources: [string, unknown][] = [
    ['items', Object.values(ITEMS).map((d) => [d.name, d.desc])],
    ['villagers', VILLAGERS],
    ['dialogue', DIALOGUE],
    ['mail', LETTERS],
    ['cutscenes', CUTSCENES],
    ['story', [INTRO, REPAIRS, HEARTSTONE, FINALE]],
    ['festivals', FESTIVALS],
    ['boards', BOARDS],
    ['achievements', ACHIEVEMENTS],
    ['shops', Object.values(SHOPS).map((s) => [s.name, s.greeting])],
    ['skills', SKILL_DEFS],
  ];
  for (const [name, data] of sources) {
    it(`${name} text is kid-safe`, () => {
      const all = strings(data);
      expect(all.length).toBeGreaterThan(0);
      const hits: string[] = [];
      for (const s of all) for (const [why, re] of BANNED) if (re.test(s)) hits.push(`${why}: "${s.slice(0, 90)}"`);
      expect(hits).toEqual([]);
    });
  }
});
