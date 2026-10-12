// games/<slug>/game.json: the single source of truth for a game's listing (docs/game.schema.json).
// Validation is shared by `npm run manifests` and the site's tests.
import { existsSync,readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gameDir,gameSlugs,SLUG } from './repo';

export const GENRES = ['Action','Adventure','Cozy','Farming','Learning','Racing','Strategy'] as const;
export const CONTROLS = ['Keyboard','Mouse','Gamepad','Touch'] as const;
export const DEVICES = ['Computer','Tablet','Phone'] as const;
export const MOTIONS = ['float','bob','twinkle','drift'] as const;
export type Genre = typeof GENRES[number];
export type ControlType = typeof CONTROLS[number];
export type Device = typeof DEVICES[number];
export type Motion = typeof MOTIONS[number];

export interface Manifest {
  $schema?: string;
  slug: string; title: string; tagline: string; shortDescription: string; longDescription: string; version: string;
  minAge: number; ageRange: string; genres: Genre[]; tags: string[]; keywords: string[]; features: string[]; contentNotes: string;
  controls: { types: ControlType[]; quickStart: string[]; howToPlay: string[] };
  devices: Device[]; orientation: 'any' | 'landscape' | 'portrait'; requirements?: string[]; playTime: string;
  storage: { prefix: string; keys: string[]; probe?: string };
  capture: { route: string; script: string };
  license: string; source: string;
  site: { featured: boolean; releaseDate: string; accentColor: string; coverLayers: Motion[]; status: 'Ready to play' | 'Coming soon'; order?: number };
}

/**
 * Other companies' game titles, franchises and platform trademarks. They must never appear in a
 * manifest (names, descriptions, tags or keywords). A game's own README may name inspirations
 * with "not affiliated with or endorsed by" wording; manifests may not.
 */
export const TRADEMARKS = ['minecraft','roblox','fortnite','mario','luigi','nintendo','zelda','pokemon','pokémon','kirby','sonic','sega','playstation','xbox','steam deck','animal crossing','stardew','harvest moon','story of seasons','vampire survivors','survivors-like','brotato','bloons','kingdom rush','plants vs','angry birds','among us','fall guys','rocket league','crash team','splatoon','terraria','lego','disney','pixar','marvel','star wars','hello kitty','peppa','paw patrol','bluey','tetris','pac-man','pacman','candy crush','subway surfers','temple run','fruit ninja','clash of clans','clash royale','brawl stars','genshin','overwatch','league of legends','dota','halo','call of duty','gta','sims'];

const ageText = (m: Manifest) => `Ages ${m.ageRange}`;
export { ageText };

/** Every problem with one manifest, as readable sentences (empty when it is valid). */
export function validateManifest(m: Manifest,folder = m.slug): string[] {
  const errors: string[] = []; const at = (message: string) => errors.push(`${folder}: ${message}`);
  const text = (value: unknown,name: string,min = 1,max = Infinity) => { if (typeof value !== 'string' || value.trim().length < min) at(`${name} is missing or too short.`); else if (value.length > max) at(`${name} is longer than ${max} characters.`); };
  const list = (value: unknown,name: string,min: number,max: number,allowed?: readonly string[]) => {
    if (!Array.isArray(value) || value.length < min || value.length > max) return at(`${name} needs ${min}–${max} entries.`);
    if (new Set(value).size !== value.length) at(`${name} has duplicates.`);
    for (const item of value) { if (typeof item !== 'string' || !item.trim()) at(`${name} has an empty entry.`); else if (allowed && !allowed.includes(item)) at(`${name}: "${item}" is not one of ${allowed.join(', ')}.`); }
  };
  if (!SLUG.test(m.slug ?? '')) at('slug must be lowercase letters and digits with single hyphens.');
  if (m.slug !== folder) at(`slug "${m.slug}" must match its folder.`);
  text(m.title,'title',1,40); text(m.tagline,'tagline',1,60); text(m.shortDescription,'shortDescription',20,260); text(m.longDescription,'longDescription',40);
  if (!/^\d+\.\d+\.\d+$/.test(m.version ?? '')) at('version must look like 1.2.3.');
  if (!Number.isInteger(m.minAge) || m.minAge < 3 || m.minAge > 17) at('minAge must be a whole number from 3 to 17.');
  const range = /^(\d+)(?:\+|–(\d+))$/.exec(m.ageRange ?? '');
  if (!range) at('ageRange must be "8+" or "10–14" (with an en dash).');
  else if (Number(range[1]) !== m.minAge || (range[2] && Number(range[2]) <= m.minAge)) at('ageRange must start at minAge.');
  list(m.genres,'genres',1,3,GENRES); list(m.tags,'tags',2,8); list(m.keywords,'keywords',4,16); list(m.features,'features',3,10);
  for (const keyword of m.keywords ?? []) if (!/^[a-z0-9][a-z0-9 +&'-]*$/.test(keyword)) at(`keyword "${keyword}" must be lowercase words.`);
  text(m.contentNotes,'contentNotes',20);
  list(m.controls?.types,'controls.types',1,4,CONTROLS); list(m.controls?.quickStart,'controls.quickStart',3,3); list(m.controls?.howToPlay,'controls.howToPlay',1,10);
  list(m.devices,'devices',1,3,DEVICES);
  if (m.devices?.some(device => device !== 'Computer') && !m.controls?.types?.includes('Touch')) at('phones and tablets need Touch in controls.types.');
  if (!['any','landscape','portrait'].includes(m.orientation)) at('orientation must be any, landscape or portrait.');
  text(m.playTime,'playTime',3);
  if (!m.storage || typeof m.storage.prefix !== 'string' || m.storage.prefix.length < 3) at('storage.prefix is missing.');
  else for (const key of m.storage.keys ?? []) if (!key.startsWith(m.storage.prefix)) at(`storage key "${key}" does not start with the prefix "${m.storage.prefix}".`);
  if (!m.storage?.keys?.length) at('storage.keys must list every persistent key.');
  if (typeof m.capture?.route !== 'string' || !m.capture?.script?.startsWith('apps/site/scripts/capture/')) at('capture needs a route and a script under apps/site/scripts/capture/.');
  text(m.license,'license'); if (m.source !== `games/${folder}`) at(`source must be games/${folder}.`);
  const site = m.site;
  if (!site || typeof site.featured !== 'boolean') at('site.featured must be true or false.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(site?.releaseDate ?? '') || Number.isNaN(Date.parse(site?.releaseDate ?? ''))) at('site.releaseDate must be a YYYY-MM-DD date.');
  if (!/^#[0-9a-fA-F]{6}$/.test(site?.accentColor ?? '')) at('site.accentColor must be a #RRGGBB color.');
  list(site?.coverLayers,'site.coverLayers',0,4,MOTIONS);
  if (!['Ready to play','Coming soon'].includes(site?.status)) at('site.status must be "Ready to play" or "Coming soon".');
  if (site?.order !== undefined && (!Number.isInteger(site.order) || site.order < 1)) at('site.order must be a whole number from 1.');
  // Never another company's game title or trademark, anywhere in the listing.
  const words = JSON.stringify({ ...m,$schema: undefined,capture: undefined,storage: undefined,source: undefined }).toLowerCase();
  for (const mark of TRADEMARKS) if (new RegExp(`(^|[^a-z])${mark.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^a-z]|$)`).test(words)) at(`uses "${mark}", another company's title or trademark. Describe the game by its genre and features instead.`);
  return errors;
}

export function readManifest(slug: string): Manifest {
  const file = resolve(gameDir(slug),'game.json');
  if (!existsSync(file)) throw new Error(`games/${slug}/game.json not found.`);
  return JSON.parse(readFileSync(file,'utf8')) as Manifest;
}
export const readManifests = () => gameSlugs().map(readManifest);
