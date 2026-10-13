import { generatedGames } from './games.generated';

export type Category = 'Action' | 'Adventure' | 'Casual' | 'Cozy' | 'Farming' | 'Learning' | 'Puzzle' | 'Racing' | 'Strategy';
export type Device = 'Computer' | 'Tablet' | 'Phone';
export type Control = 'Keyboard' | 'Mouse' | 'Gamepad' | 'Touch';
/** Idle animations for cover layers: public/media/<slug>/cover-<motion>.svg, drawn over cover.svg. */
export type CoverMotion = 'float' | 'bob' | 'twinkle' | 'drift';
export interface Game {
  slug: string;
  title: string;
  /** The game's released version (games/<slug>/game.json). */
  version: string;
  tagline: string;
  description: string;
  categories: Category[];
  tags: string[];
  /** Genre, feature and audience words for search engines. */
  keywords: string[];
  ageGuidance: string;
  minAge: number;
  contentNotes: string;
  estimatedPlayTime: string;
  /** Three short first steps for the details page; the full guidance stays in controls.howToPlay. */
  quickStart: string[];
  controls: { types: Control[]; howToPlay: string[] };
  supportedDevices: Device[];
  /** How phones and tablets are held; the game shows its own prompt, the site never adds one. */
  orientation: 'any' | 'landscape' | 'portrait';
  /** Browser features the game needs, e.g. "WebGL 2". */
  requirements: string[];
  /** Cover art lives in public/media/<slug>/: cover.svg, these motion layers, logo.svg, and the captured previews. */
  coverLayers: CoverMotion[];
  releaseDate: string;
  featured: boolean;
  accentColor: string;
  status: 'Ready to play' | 'Coming soon';
}
/**
 * The catalog comes from each game's manifest, games/<slug>/game.json. Edit those, then run
 * `npm run manifests` at the repo root, which regenerates games.generated.ts.
 */
export const games: Game[] = generatedGames;
export const categories = [...new Set(games.flatMap(game => game.categories))].sort() as Category[];
export const findGame = (slug: string | undefined) => games.find(game => game.slug === slug);
