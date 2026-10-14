// games/<slug>/game.json: the single source of truth for a game's listing (docs/game.schema.json).
// Validation is shared by `npm run manifests` and the site's tests.
import { existsSync,readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { communityDir,communitySlugs,gameDir,gameSlugs,SLUG } from './repo';

export const GENRES = ['Action','Adventure','Casual','Cozy','Farming','Learning','Puzzle','Racing','RPG','Strategy'] as const;
export const CONTROLS = ['Keyboard','Mouse','Gamepad','Touch'] as const;
export const DEVICES = ['Computer','Tablet','Phone'] as const;
export const MOTIONS = ['float','bob','twinkle','drift'] as const;
/**
 * How the game plays inside AI assistants (apps/mcp): inline in the chat card (light games),
 * fullscreen only (heavy games, e.g. 3D), or not at all, so the card links to the website (site).
 */
export const EMBEDS = ['inline','fullscreen','site'] as const;
/** How a game feels, for "something calm" or "something exciting" (apps/mcp's find_games). */
export const MOODS = ['calm','cozy','cheerful','exciting','brainy','creative','curious'] as const;
/** "In development": validated, but kept off the website, its registry, the README and llms.txt. */
export const STATUSES = ['Ready to play','Coming soon','In development'] as const;
export type Genre = typeof GENRES[number];
export type Status = typeof STATUSES[number];
export type ControlType = typeof CONTROLS[number];
export type Device = typeof DEVICES[number];
export type Motion = typeof MOTIONS[number];
export type Embed = typeof EMBEDS[number];
export type Mood = typeof MOODS[number];
export const SAFETY = ['ads','purchases','chat','accounts','network'] as const;
export type Safety = Record<typeof SAFETY[number],false>;

export interface Manifest {
  $schema?: string;
  slug: string; title: string; tagline: string; shortDescription: string; longDescription: string; version: string;
  minAge: number; ageRange: string; genres: Genre[]; tags: string[]; keywords: string[]; features: string[]; contentNotes: string;
  controls: { types: ControlType[]; quickStart: string[]; howToPlay: string[] };
  devices: Device[]; orientation: 'any' | 'landscape' | 'portrait'; requirements?: string[]; playTime: string;
  /** One sitting, in minutes [shortest, typical longest]; playTime is the whole game. */
  sessionMinutes: [number,number];
  moods: Mood[];
  embed: Embed;
  storage: { prefix: string; keys: string[]; probe?: string };
  /** What the game never does; all five must be false (the contract in docs/CREATE-A-GAME.md). */
  safety: Safety;
  capture: { route: string; script: string };
  license: string; source: string;
  site: { featured: boolean; releaseDate: string; accentColor: string; coverLayers: Motion[]; status: Status; order?: number };
}

/**
 * Other companies' game titles, franchises and platform trademarks. They must never appear in a
 * manifest (names, descriptions, tags or keywords). A game's own README may name inspirations
 * with "not affiliated with or endorsed by" wording; manifests may not.
 */
export const TRADEMARKS = ['minecraft','roblox','fortnite','mario','luigi','nintendo','zelda','pokemon','pokémon','kirby','sonic','sega','playstation','xbox','steam deck','animal crossing','stardew','harvest moon','story of seasons','vampire survivors','survivors-like','brotato','bloons','kingdom rush','plants vs','angry birds','among us','fall guys','rocket league','crash team','splatoon','terraria','lego','disney','pixar','marvel','star wars','hello kitty','peppa','paw patrol','bluey','tetris','pac-man','pacman','candy crush','subway surfers','temple run','fruit ninja','clash of clans','clash royale','brawl stars','genshin','overwatch','league of legends','dota','halo','call of duty','gta','sims','block blast','blockblast','woodoku','blockudoku','1010!','digimon','coromon','temtem','yo-kai','palworld','monster rancher','nexomon','cassette beasts','monster hunter','dragon quest','final fantasy'];

const ageText = (m: Manifest) => `Ages ${m.ageRange}`;
export { ageText };

/** The listing fields first-party and community games share (everything players and parents read). */
type Listing = Omit<Manifest,'$schema' | 'capture' | 'source' | 'site' | 'sessionMinutes' | 'moods' | 'embed'>;
type At = (message: string) => void;
const textCheck = (at: At) => (value: unknown,name: string,min = 1,max = Infinity) => { if (typeof value !== 'string' || value.trim().length < min) at(`${name} is missing or too short.`); else if (value.length > max) at(`${name} is longer than ${max} characters.`); };
const listCheck = (at: At) => (value: unknown,name: string,min: number,max: number,allowed?: readonly string[]) => {
  if (!Array.isArray(value) || value.length < min || value.length > max) return at(`${name} needs ${min}–${max} entries.`);
  if (new Set(value).size !== value.length) at(`${name} has duplicates.`);
  for (const item of value) { if (typeof item !== 'string' || !item.trim()) at(`${name} has an empty entry.`); else if (allowed && !allowed.includes(item)) at(`${name}: "${item}" is not one of ${allowed.join(', ')}.`); }
};
/** Another company's game title or trademark anywhere in these words. */
export function trademarksIn(words: string) {
  const lower = words.toLowerCase();
  return TRADEMARKS.filter(mark => new RegExp(`(^|[^a-z])${mark.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^a-z]|$)`).test(lower));
}
const trademarkMessage = (mark: string) => `uses "${mark}", another company's title or trademark. Describe the game by its genre and features instead.`;

function checkListing(m: Listing,folder: string,at: At) {
  const text = textCheck(at), list = listCheck(at);
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
  for (const flag of SAFETY) if (m.safety?.[flag] !== false) at(`safety.${flag} must be false: listed games never have ${flag === 'network' ? 'network requests' : flag}.`);
  if (m.safety && Object.keys(m.safety).some(flag => !(SAFETY as readonly string[]).includes(flag))) at(`safety may only list ${SAFETY.join(', ')}.`);
}

/** Every problem with one manifest, as readable sentences (empty when it is valid). */
export function validateManifest(m: Manifest,folder = m.slug): string[] {
  const errors: string[] = []; const at = (message: string) => errors.push(`${folder}: ${message}`);
  const text = textCheck(at), list = listCheck(at);
  checkListing(m,folder,at);
  if (typeof m.capture?.route !== 'string' || !m.capture?.script?.startsWith('apps/site/scripts/capture/')) at('capture needs a route and a script under apps/site/scripts/capture/.');
  text(m.license,'license'); if (m.source !== `games/${folder}`) at(`source must be games/${folder}.`);
  const site = m.site;
  if (!site || typeof site.featured !== 'boolean') at('site.featured must be true or false.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(site?.releaseDate ?? '') || Number.isNaN(Date.parse(site?.releaseDate ?? ''))) at('site.releaseDate must be a YYYY-MM-DD date.');
  if (!/^#[0-9a-fA-F]{6}$/.test(site?.accentColor ?? '')) at('site.accentColor must be a #RRGGBB color.');
  list(site?.coverLayers,'site.coverLayers',0,4,MOTIONS);
  if (!STATUSES.includes(site?.status)) at(`site.status must be one of ${STATUSES.map(status => `"${status}"`).join(', ')}.`);
  if (site?.order !== undefined && (!Number.isInteger(site.order) || site.order < 1)) at('site.order must be a whole number from 1.');
  const [shortest,longest] = Array.isArray(m.sessionMinutes) ? m.sessionMinutes : [];
  if (m.sessionMinutes?.length !== 2 || !Number.isInteger(shortest) || !Number.isInteger(longest) || shortest < 1 || longest < shortest || longest > 240) at('sessionMinutes must be [shortest, longest] whole minutes for one sitting, from 1 to 240.');
  list(m.moods,'moods',1,3,MOODS);
  if (!EMBEDS.includes(m.embed)) at(`embed must be one of ${EMBEDS.map(embed => `"${embed}"`).join(', ')}.`);
  // Never another company's game title or trademark, anywhere in the listing.
  for (const mark of trademarksIn(JSON.stringify({ ...m,$schema: undefined,capture: undefined,storage: undefined,safety: undefined,source: undefined }))) at(trademarkMessage(mark));
  return errors;
}

export function readManifest(slug: string): Manifest {
  const file = resolve(gameDir(slug),'game.json');
  if (!existsSync(file)) throw new Error(`games/${slug}/game.json not found.`);
  return JSON.parse(readFileSync(file,'utf8')) as Manifest;
}
export const readManifests = () => gameSlugs().map(readManifest);
/** The games the website lists: every game except those still "In development", which stay off the site. */
export const listedManifests = () => readManifests().filter(m => m.site.status !== 'In development');

// ---- Community games (community/<slug>/game.json; SUBMITTING.md, docs/community-game.schema.json) ----

/** submitted: in review, never on the site; listed: on the site once approved; unlisted: off the site, kept in the repo. */
export const LISTINGS = ['submitted','listed','unlisted'] as const;
export type ListingState = typeof LISTINGS[number];
/** The owner's approval, written only by `npm run review-submission -- <PR> --approve`. */
export interface Approval { by: string; date: string; commit: string; sourceSha256: string; reportSha256: string }
export interface CommunityManifest extends Listing {
  $schema?: string;
  /** The read-only test hook on window, e.g. "__starsprint". */
  hook: string;
  /** Capture routes the checks and the review screenshot, e.g. ["?scene=title", "?scene=play"]. */
  capture: { scenes: string[] };
  /** A nickname such as "@star-maker", never a real name. */
  creator: { handle: string };
  license: 'MIT';
  /** In the creator's words: this is their own work, made for this submission. */
  originality: string;
  /** When it was submitted, and the reviewed commit (filled in on approval; "pending" before). */
  submitted: { date: string; sourceCommit: string };
  listing: ListingState;
  approval?: Approval;
  /** Optional card color, #RRGGBB. */
  accentColor?: string;
}
export const HANDLE = /^@[a-z0-9_-]{2,32}$/;
export const COMMUNITY_LICENSE = 'MIT';

/** Every problem with one community manifest, as readable sentences (empty when it is valid). */
export function validateCommunityManifest(m: CommunityManifest,folder = m.slug,others: { slugs: string[]; prefixes: string[] } = { slugs: [],prefixes: [] }): string[] {
  const errors: string[] = []; const at = (message: string) => errors.push(`${folder}: ${message}`);
  const text = textCheck(at), list = listCheck(at);
  checkListing(m,folder,at);
  if (others.slugs.includes(m.slug)) at(`the slug "${m.slug}" is already taken by another game. Pick a different one.`);
  const prefix = m.storage?.prefix ?? '';
  if (prefix.startsWith('aikg') || others.prefixes.some(other => other.startsWith(prefix) || prefix.startsWith(other))) at(`the storage prefix "${prefix}" overlaps another game's. Use your slug without hyphens plus a dot, e.g. "${(m.slug ?? '').replace(/-/g,'')}.".`);
  if (!/^__[a-z][a-z0-9]*$/.test(m.hook ?? '')) at('hook must look like "__mygame": two underscores and lowercase letters or digits.');
  list(m.capture?.scenes,'capture.scenes',1,8);
  for (const scene of m.capture?.scenes ?? []) if (!/^\?scene=[a-z0-9-]+(&[a-z0-9-]+=[a-z0-9-]+)*$/.test(scene)) at(`capture scene "${scene}" must look like "?scene=title" (lowercase, no outside links).`);
  if (!HANDLE.test(m.creator?.handle ?? '')) at('creator.handle must be a nickname like "@star-maker": @ then 2–32 lowercase letters, digits, - or _. Never use a real name.');
  if (m.license !== COMMUNITY_LICENSE) at('license must be "MIT": community games are open source under the MIT license.');
  text(m.originality,'originality',40,600);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.submitted?.date ?? '') || Number.isNaN(Date.parse(m.submitted?.date ?? ''))) at('submitted.date must be a YYYY-MM-DD date.');
  if (m.submitted?.sourceCommit !== 'pending' && !/^[0-9a-f]{40}$/.test(m.submitted?.sourceCommit ?? '')) at('submitted.sourceCommit must be "pending" (it is filled in when the game is approved).');
  if (!LISTINGS.includes(m.listing)) at(`listing must be one of ${LISTINGS.map(state => `"${state}"`).join(', ')}. New submissions use "submitted".`);
  if (m.listing === 'listed' && !m.approval) at('listing is "listed" but there is no approval. Only the owner\'s review tool lists a game.');
  if (m.approval) {
    const a = m.approval;
    if (!HANDLE.test(a.by ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(a.date ?? '') || !/^[0-9a-f]{40}$/.test(a.commit ?? '') || !/^[0-9a-f]{64}$/.test(a.sourceSha256 ?? '') || !/^[0-9a-f]{64}$/.test(a.reportSha256 ?? '')) at('approval is incomplete. Only the owner\'s review tool writes it.');
  }
  if (m.accentColor !== undefined && !/^#[0-9a-fA-F]{6}$/.test(m.accentColor)) at('accentColor must be a #RRGGBB color.');
  const known = new Set(['$schema','slug','title','tagline','shortDescription','longDescription','version','minAge','ageRange','genres','tags','keywords','features','contentNotes','controls','devices','orientation','requirements','playTime','storage','safety','hook','capture','creator','license','originality','submitted','listing','approval','accentColor']);
  for (const key of Object.keys(m)) if (!known.has(key)) at(`unknown field "${key}". See docs/community-game.schema.json.`);
  // Never another company's game title or trademark, anywhere in the listing or the creator's words.
  for (const mark of trademarksIn(JSON.stringify({ ...m,$schema: undefined,storage: undefined,safety: undefined,approval: undefined }))) at(trademarkMessage(mark));
  return errors;
}

export function readCommunityManifest(slug: string): CommunityManifest {
  const file = resolve(communityDir(slug),'game.json');
  if (!existsSync(file)) throw new Error(`community/${slug}/game.json not found.`);
  return JSON.parse(readFileSync(file,'utf8')) as CommunityManifest;
}
export const readCommunityManifests = () => communitySlugs().map(readCommunityManifest);
/** The community manifests a build may use: an invalid one is never served, whatever its listing. */
export function validCommunityManifests() {
  const valid: CommunityManifest[] = [], invalid: { slug: string; why: string }[] = [];
  for (const folder of communitySlugs()) {
    const manifest = readCommunityManifest(folder), problems = validateCommunityManifest(manifest,folder,takenBy(folder));
    if (problems.length) invalid.push({ slug: folder,why: `its game.json has problems: ${problems.join(' ')}` }); else valid.push(manifest);
  }
  return { valid,invalid };
}
/** Slugs and storage prefixes a community game must not reuse: every first-party game's and every other community game's. */
export function takenBy(slug: string) {
  const first = readManifests(), community = readCommunityManifests().filter(m => m.slug !== slug);
  return { slugs: [...first.map(m => m.slug),...community.map(m => m.slug)],prefixes: [...first.map(m => m.storage.prefix),...community.map(m => m.storage.prefix)] };
}
