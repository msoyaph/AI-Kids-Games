/**
 * Types for written content: villager dialogue, letters (mail) and friendship cutscenes.
 * Text placeholders: {name} = player nickname, {farm} = farm name, {pet} = pet name.
 */

export interface DialogueSet {
  /** first time you ever talk */
  intro: string;
  /** everyday lines (one is picked each day) */
  daily: string[];
  /** two lines per season: [spring, summer, autumn, winter] */
  season: [string[], string[], string[], string[]];
  /** rainy/stormy day lines */
  rain: string[];
  /** extra lines unlocked at 3, 6 and 9 hearts */
  hearts: { 3: string[]; 6: string[]; 9: string[] };
  /** said on their own birthday */
  birthday: string;
  /** gift reactions */
  gift: { love: string; like: string; neutral: string; dislike: string; birthday: string };
  /** lines at specific places (location id → line) */
  places?: Record<string, string>;
  /** one line per festival id: sprout, berry, harvest, starlight */
  festival: Record<'sprout' | 'berry' | 'harvest' | 'starlight', string>;
  /** said after the Valley Hall finale */
  postgame: string;
}

export interface LetterDef {
  id: string;
  /** villager id, or 'hall' (Valley Hall), 'aunt' (Great-Aunt Rosemary's old letters), 'radio' */
  from: string;
  subject: string;
  body: string;
  when: {
    /** earliest absolute day index (0 = Spring 1, Year 1) */
    day?: number;
    /** [villager id, hearts] */
    hearts?: [string, number];
    /** a story flag set by the game, e.g. 'board.forage' when a board is done */
    flag?: string;
  };
  attach?: { item?: string; n?: number; recipe?: string; coins?: number };
}

export type CutsceneStep =
  | { say: string; who: string; emote?: Emote }
  | { move: string; by: [number, number] }
  | { face: string; dir: 0 | 1 | 2 | 3 }
  | { emote: Emote; who: string }
  | { wait: number }
  | { choice: string; who: string; options: { text: string; reply: string; pts?: number }[] };

export type Emote = 'happy' | 'sad' | 'surprised' | 'heart' | 'music' | 'idea' | 'sweat' | 'question' | 'laugh' | 'sleepy';

export interface CutsceneDef {
  id: string;
  /** main villager */
  npc: string;
  /** friendship hearts needed */
  hearts: number;
  /** location id and named spot where it happens (the player walking in starts it) */
  at: string;
  spot: string;
  /** daytime window [from, to] in minutes; default 9:00–18:00 */
  time?: [number, number];
  /** actors and their tile offsets from the spot; 'player' and villager ids */
  actors: { id: string; pos: [number, number]; dir: 0 | 1 | 2 | 3 }[];
  steps: CutsceneStep[];
  /** friendship points + optional reward after it ends */
  reward?: { item?: string; n?: number; recipe?: string; pts?: number };
}
