/**
 * The cast. Everyone here is invented for Space Sky.
 * `voice` tunes the read-aloud voice (browser speech synthesis) so characters sound different.
 */

export type CharacterKind = 'human' | 'robot' | 'tuggy' | 'alien' | 'elder' | 'critter' | 'player';

export interface HumanLook {
  skin: string;
  hair: string;
  hairStyle: 'bun' | 'curly' | 'short' | 'spiky' | 'long' | 'puff' | 'bald' | 'pony' | 'bob';
  outfit: string;
  accessory?: 'glasses' | 'goggles' | 'headset' | 'bowtie' | 'beard' | 'mustache' | 'star' | 'cap';
}

export interface AlienLook {
  body: string;
  belly: string;
  eyes: 1 | 2 | 3;
  antenna: string;
  extra?: 'scarf' | 'crown' | 'bow' | 'leaf';
}

export interface CharacterDef {
  id: string;
  name: string;
  role: string;
  kind: CharacterKind;
  human?: HumanLook;
  alien?: AlienLook;
  /** Portrait background color. */
  bg: string;
  voice: { pitch: number; rate: number };
  /** Codex entry (made-up characters are marked as story friends). */
  codex?: string;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'stella', name: 'Commander Stella', role: 'Leader of the Space Sky Academy', kind: 'human', bg: '#9b6bff',
    human: { skin: '#8d5a3b', hair: '#2b1a12', hairStyle: 'bun', outfit: '#6b3fd4', accessory: 'star' }, voice: { pitch: 1.0, rate: 0.95 }, codex: 'c_stella',
  },
  {
    id: 'pip', name: 'Professor Pip', role: 'Space scientist', kind: 'human', bg: '#2ed47a',
    human: { skin: '#f2c9a5', hair: '#f4f7ff', hairStyle: 'puff', outfit: '#f4f7ff', accessory: 'glasses' }, voice: { pitch: 0.85, rate: 0.9 }, codex: 'c_pip',
  },
  {
    id: 'rio', name: 'Captain Rio', role: 'Flight teacher', kind: 'human', bg: '#ff9f43',
    human: { skin: '#c68a5e', hair: '#3b2416', hairStyle: 'short', outfit: '#ff9f43', accessory: 'goggles' }, voice: { pitch: 1.1, rate: 1.0 }, codex: 'c_rio',
  },
  { id: 'boltzy', name: 'Boltzy', role: 'Robot mechanic in the hangar', kind: 'robot', bg: '#4dd4ff', voice: { pitch: 1.5, rate: 1.0 }, codex: 'c_boltzy' },
  { id: 'tuggy', name: 'Tuggy', role: 'Friendly tow-bot', kind: 'tuggy', bg: '#ffe066', voice: { pitch: 1.8, rate: 1.05 }, codex: 'c_tuggy' },
  {
    id: 'sol', name: 'Skipper Sol', role: 'Keeper of Moon Base', kind: 'human', bg: '#4c7dff',
    human: { skin: '#e8b48f', hair: '#9aa4c7', hairStyle: 'bald', outfit: '#4c7dff', accessory: 'beard' }, voice: { pitch: 0.75, rate: 0.9 },
  },
  {
    id: 'kit', name: 'Ranger Kit', role: 'Ranger at the Mars Outpost', kind: 'human', bg: '#ff5d73',
    human: { skin: '#f0c19a', hair: '#d9572b', hairStyle: 'pony', outfit: '#2ed47a', accessory: 'cap' }, voice: { pitch: 1.2, rate: 1.0 },
  },
  {
    id: 'ada', name: 'Doctor Ada', role: 'Scientist at Ganymede Station', kind: 'human', bg: '#2de0c7',
    human: { skin: '#a8714e', hair: '#1a1a2e', hairStyle: 'curly', outfit: '#4c7dff', accessory: 'headset' }, voice: { pitch: 1.05, rate: 0.95 },
  },
  {
    id: 'fin', name: 'Captain Fin', role: 'Pilot at Titan Station', kind: 'human', bg: '#ffc83d',
    human: { skin: '#d9a07a', hair: '#ffe066', hairStyle: 'spiky', outfit: '#ff5d73', accessory: 'mustache' }, voice: { pitch: 0.9, rate: 1.0 },
  },
  {
    id: 'ivy', name: 'Ivy', role: 'Ice explorer at Triton Outpost', kind: 'human', bg: '#4dd4ff',
    human: { skin: '#f5d0b5', hair: '#6b3fd4', hairStyle: 'bob', outfit: '#9b6bff', accessory: 'goggles' }, voice: { pitch: 1.25, rate: 1.0 },
  },
  {
    id: 'pots', name: 'Pots', role: 'Robot cook at Ceres Station', kind: 'robot', bg: '#ff9f43', voice: { pitch: 1.3, rate: 0.95 },
  },
  {
    id: 'zibbo', name: 'Zibbo', role: 'Alien explorer from Zephyra', kind: 'alien', bg: '#ff7ad9',
    alien: { body: '#2de0c7', belly: '#c9fff4', eyes: 3, antenna: '#ffe066', extra: 'scarf' }, voice: { pitch: 1.7, rate: 1.05 }, codex: 'c_zibbo',
  },
  {
    id: 'ollo', name: 'Glowkeeper Ollo', role: 'Keeper of the Star Beacon on Zephyra', kind: 'elder', bg: '#6b3fd4',
    alien: { body: '#9b6bff', belly: '#e3d1ff', eyes: 2, antenna: '#fff7b3', extra: 'crown' }, voice: { pitch: 0.8, rate: 0.85 }, codex: 'c_ollo',
  },
  {
    id: 'pibble', name: 'Pibble', role: 'Young Zephyran', kind: 'alien', bg: '#ffe066',
    alien: { body: '#ff9ad9', belly: '#ffe3f4', eyes: 2, antenna: '#4dd4ff', extra: 'bow' }, voice: { pitch: 1.9, rate: 1.1 },
  },
  {
    id: 'wobb', name: 'Wobb', role: 'Zephyran gardener', kind: 'alien', bg: '#8cff66',
    alien: { body: '#8cff66', belly: '#e6ffd9', eyes: 1, antenna: '#ff7ad9', extra: 'leaf' }, voice: { pitch: 1.2, rate: 0.9 },
  },
  { id: 'glimmer', name: 'Glimmer', role: 'A tiny glowing space friend', kind: 'critter', bg: '#2b1d78', voice: { pitch: 2, rate: 1.1 }, codex: 'c_glimmers' },
  { id: 'player', name: 'You', role: 'Space Sky cadet', kind: 'player', bg: '#4c7dff', voice: { pitch: 1.15, rate: 1.0 } },
];

export const CHAR_BY_ID: Record<string, CharacterDef> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
