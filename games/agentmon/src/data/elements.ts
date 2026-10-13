/**
 * The eight elements of Sunreach. Each is strong against exactly two others and weak against
 * exactly two (the chart is symmetric by design; tests/unit/elements.test.ts checks it). If X is
 * strong against Y, X also shrugs off Y's moves. There are no immunities.
 *
 * Colors are paired with distinct icon shapes, so the chart never relies on color alone.
 */
import type { Element } from '../core/types';

export interface ElementInfo {
  id: Element;
  name: string;
  /** Main color (bars, badges) and a darker shade for outlines/text on light backgrounds. */
  color: number;
  dark: number;
  /** Icon shape drawn in art/icons.ts; also the one-letter badge for colorblind mode. */
  icon: 'flame' | 'drop' | 'leaf' | 'mountain' | 'swirl' | 'snowflake' | 'bolt' | 'star';
  letter: string;
  strong: [Element, Element];
  /** Why, in kid words, for the chart screen: one reason per strong matchup. */
  why: [string, string];
  /** Field ability it unlocks once you have befriended any Agentmon of this element. */
  ability: { id: string; name: string; desc: string };
}

export const ELEMENT_INFO: Record<Element, ElementInfo> = {
  flare: {
    id: 'flare', name: 'Flare', color: 0xff7a3d, dark: 0xa83a12, icon: 'flame', letter: 'F',
    strong: ['leaf', 'frost'], why: ['Heat dries out leaves.', 'Heat melts frost.'],
    ability: { id: 'melt', name: 'Warm Glow', desc: 'Melts ice walls.' },
  },
  tide: {
    id: 'tide', name: 'Tide', color: 0x3d8bf2, dark: 0x1c4f9c, icon: 'drop', letter: 'T',
    strong: ['flare', 'stone'], why: ['Water puts out flames.', 'Water wears down stone.'],
    ability: { id: 'paddle', name: 'Paddle', desc: 'Crosses calm water.' },
  },
  leaf: {
    id: 'leaf', name: 'Leaf', color: 0x4cb84c, dark: 0x22702a, icon: 'leaf', letter: 'L',
    strong: ['tide', 'glow'], why: ['Plants drink water.', 'Plants soak up light.'],
    ability: { id: 'snip', name: 'Snip', desc: 'Trims thick vines.' },
  },
  stone: {
    id: 'stone', name: 'Stone', color: 0xb08050, dark: 0x6b4526, icon: 'mountain', letter: 'S',
    strong: ['flare', 'volt'], why: ['Rock smothers flames.', 'Rock grounds sparks.'],
    ability: { id: 'shove', name: 'Shove', desc: 'Pushes big boulders.' },
  },
  gust: {
    id: 'gust', name: 'Gust', color: 0x5fd6b8, dark: 0x1f8069, icon: 'swirl', letter: 'G',
    strong: ['leaf', 'glow'], why: ['Wind scatters leaves.', 'Wind blows out a glow.'],
    ability: { id: 'updraft', name: 'Updraft', desc: 'Rides warm winds up high.' },
  },
  frost: {
    id: 'frost', name: 'Frost', color: 0xa9b8ff, dark: 0x4a55b0, icon: 'snowflake', letter: 'R',
    strong: ['stone', 'gust'], why: ['Ice cracks rock.', 'Cold stills the wind.'],
    ability: { id: 'freeze', name: 'Freeze', desc: 'Makes ice stepping stones.' },
  },
  volt: {
    id: 'volt', name: 'Volt', color: 0xf5c830, dark: 0x8f6a00, icon: 'bolt', letter: 'V',
    strong: ['tide', 'gust'], why: ['Sparks zip through water.', 'Lightning races through the sky.'],
    ability: { id: 'power', name: 'Power Up', desc: 'Wakes up old machines.' },
  },
  glow: {
    id: 'glow', name: 'Glow', color: 0xf27ad6, dark: 0x9c2f86, icon: 'star', letter: 'W',
    strong: ['frost', 'volt'], why: ['Warm light melts frost.', 'Light calms static.'],
    ability: { id: 'light', name: 'Lantern', desc: 'Lights up dark caves.' },
  },
};
