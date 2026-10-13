/**
 * Six original themes, unlocked by playing. Each sets the background, the board, the blocks (six
 * colors with a drawing style) and the music. Classic is a warm cream board with soft, bright
 * blocks; none of the themes is a dark board with jewel-tone blocks.
 */
export type ThemeId = 'classic' | 'wood' | 'candy' | 'ocean' | 'space' | 'night';
export type BlockStyle = 'gloss' | 'wood' | 'candy' | 'glass' | 'glow' | 'soft';
export type Deco = 'dots' | 'grain' | 'sprinkles' | 'bubbles' | 'stars' | 'moon';

export interface Theme {
  id: ThemeId; name: string;
  /** Background gradient (top, bottom) and its decoration. */
  bg: readonly [string, string]; deco: Deco; decoColor: string;
  board: string; boardEdge: string; cell: string; cellShade: string;
  blocks: readonly [string, string, string, string, string, string];
  style: BlockStyle;
  stone: string;
  /** Text and buttons drawn over this theme. */
  ink: string; panel: string; accent: string;
  /** How to earn it (shown on locked themes). */
  unlock: string;
}

export const THEMES: readonly Theme[] = [
  { id: 'classic', name: 'Sunny', bg: ['#fff3dc', '#ffe1c2'], deco: 'dots', decoColor: '#ffd2a8', board: '#f6dcb4', boardEdge: '#e8c391', cell: '#efcf9f', cellShade: '#e3bd86',
    blocks: ['#ff6f61', '#ffb52e', '#52c97a', '#3fa7f5', '#9b7cf6', '#ff7fbf'], style: 'gloss', stone: '#a39a8f', ink: '#4a2f1a', panel: '#fffaf0', accent: '#ff6f61', unlock: 'Ready to play' },
  { id: 'wood', name: 'Treehouse', bg: ['#f3e6cf', '#dcc29a'], deco: 'grain', decoColor: '#cfae7d', board: '#b98552', boardEdge: '#8d5f35', cell: '#a8743f', cellShade: '#956434',
    blocks: ['#e86f4f', '#f2b844', '#7fb35a', '#5aa3c8', '#a77cc2', '#e98aa6'], style: 'wood', stone: '#8c8279', ink: '#3d2613', panel: '#fbf3e4', accent: '#c96a2b', unlock: 'Score 1,000 in one Classic game' },
  { id: 'candy', name: 'Candy Shop', bg: ['#ffe8f4', '#ffd3e6'], deco: 'sprinkles', decoColor: '#ff9ccb', board: '#ffffff', boardEdge: '#ffc2dc', cell: '#ffeaf3', cellShade: '#ffd6e7',
    blocks: ['#ff5c8a', '#ff9f43', '#2ed1a2', '#45aaf2', '#a55eea', '#fd79a8'], style: 'candy', stone: '#b3a3ad', ink: '#5a1d3a', panel: '#fffafd', accent: '#ff5c8a', unlock: 'Earn 10 stars in Adventure' },
  { id: 'ocean', name: 'Lagoon', bg: ['#d9f6ff', '#9edcf2'], deco: 'bubbles', decoColor: '#ffffff', board: '#e9fbff', boardEdge: '#8fd3ea', cell: '#c9eef8', cellShade: '#b0e2f0',
    blocks: ['#ff7b6b', '#ffcf4d', '#33d6a6', '#2f8cff', '#7a6cff', '#ff8fd0'], style: 'glass', stone: '#93a6ad', ink: '#0f3a4d', panel: '#f4fdff', accent: '#2f8cff', unlock: 'Clear 100 lines in all' },
  { id: 'space', name: 'Star Trip', bg: ['#2a2f6e', '#4b3a8c'], deco: 'stars', decoColor: '#ffffff', board: '#3a3f86', boardEdge: '#6c6fd1', cell: '#33377a', cellShade: '#2c306c',
    blocks: ['#ff7a8a', '#ffd166', '#5ee6a8', '#5cc8ff', '#c49bff', '#ff9ee5'], style: 'glow', stone: '#8b8fb5', ink: '#fdf7ff', panel: '#3b3f86', accent: '#ffd166', unlock: 'Finish World 2 in Adventure' },
  { id: 'night', name: 'Moonlight', bg: ['#33415f', '#5b5277'], deco: 'moon', decoColor: '#fff6d6', board: '#465476', boardEdge: '#7d88b0', cell: '#3e4a6b', cellShade: '#36415f',
    blocks: ['#ff9a8b', '#ffd59e', '#9be3b4', '#8fc7ff', '#c3b1ff', '#ffb3d9'], style: 'soft', stone: '#9097ad', ink: '#fff8ec', panel: '#46557a', accent: '#ffd59e', unlock: 'Play 3 Daily puzzles (any days)' },
];

export const theme = (id: string): Theme => THEMES.find(t => t.id === id) ?? THEMES[0]!;
