// Shared helpers for the monorepo scripts: where things live, which games exist, and the
// build-inputs hash that tells CI when a committed game build no longer matches its source.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync,readFileSync,readdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../../',import.meta.url));
export const site = resolve(root,'apps/site');
export const gameDir = (slug: string) => resolve(root,'games',slug);
export const SLUG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** Community games (community/<slug>/): source only, built and checked by tooling/community-kit, hosted on their own origin. */
export const communityRoot = resolve(root,'community');
export const communityDir = (slug: string) => resolve(communityRoot,slug);
/** Every folder under community/ that has a game.json manifest, sorted. */
export function communitySlugs() {
  return existsSync(communityRoot) ? readdirSync(communityRoot).filter(name => SLUG.test(name) && existsSync(resolve(communityRoot,name,'game.json'))).sort() : [];
}

/** Every folder under games/ that has a game.json manifest, sorted. */
export function gameSlugs() {
  const dir = resolve(root,'games');
  return existsSync(dir) ? readdirSync(dir).filter(name => existsSync(resolve(dir,name,'game.json'))).sort() : [];
}

/**
 * Files that decide what a game's single-file build contains. Docs, tests, scripts and
 * reports are left out so editing them never forces a re-import.
 */
export const BUILD_INPUTS = [/^index\.html$/,/^package\.json$/,/^src\//,/^public\//,/^vite\.config\.[cm]?[jt]s$/,/^tsconfig[^/]*\.json$/];

/** SHA-256 over the paths and bytes of a game's build inputs (tracked plus new, unignored files). */
export function buildInputsHash(slug: string) {
  const prefix = `games/${slug}/`;
  const listed = execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard','--',prefix],{ cwd: root }).toString().split('\0').filter(Boolean);
  const files = [...new Set(listed)].map(file => file.slice(prefix.length))
    .filter(file => BUILD_INPUTS.some(pattern => pattern.test(file)) && existsSync(resolve(root,prefix,file))).sort();
  const hash = createHash('sha256');
  for (const file of files) hash.update(`${file}\0`).update(readFileSync(resolve(root,prefix,file))).update('\0');
  return { sha256: hash.digest('hex'),files: files.length };
}

export const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

export interface BuildImport { slug: string; version: string; source: string; bytes: number; sha256: string; inputsSha256: string; importedAt: string }
export interface BuildImports { games: BuildImport[] }
export const buildImportsPath = resolve(site,'BUILD_IMPORTS.json');
export const buildSizesPath = resolve(site,'src/data/build-sizes.json');
export const readJson = <T>(file: string): T => JSON.parse(readFileSync(file,'utf8')) as T;
export const writeJson = (file: string,value: unknown) => writeFileSync(file,`${JSON.stringify(value,null,2)}\n`);
