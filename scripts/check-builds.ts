// CI guard: every game under games/ has a committed build in the site, that build is the exact
// file recorded in BUILD_IMPORTS.json, and the game's source has not changed since it was
// imported. Fix a failure with: npm run import-game -- <slug>
import { existsSync,readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildImportsPath,buildInputsHash,buildSizesPath,gameSlugs,readJson,sha256,site,type BuildImports } from './lib/repo';

const errors: string[] = [];
const imports = readJson<BuildImports>(buildImportsPath).games;
const sizes = readJson<Record<string,number>>(buildSizesPath);
const slugs = gameSlugs();

for (const slug of slugs) if (!imports.some(game => game.slug === slug)) errors.push(`${slug}: games/${slug} has no imported build. Run npm run import-game -- ${slug}.`);
for (const game of imports) {
  const file = resolve(site,'public/games',game.slug,'index.html');
  if (!slugs.includes(game.slug)) errors.push(`${game.slug}: recorded in BUILD_IMPORTS.json but games/${game.slug}/game.json does not exist.`);
  if (game.source !== `games/${game.slug}/dist/index.html`) errors.push(`${game.slug}: source must be the monorepo-relative path games/${game.slug}/dist/index.html.`);
  if (!existsSync(file)) { errors.push(`${game.slug}: apps/site/public/games/${game.slug}/index.html is missing.`); continue; }
  const bytes = readFileSync(file);
  if (bytes.length !== game.bytes || sha256(bytes) !== game.sha256) errors.push(`${game.slug}: the committed build is not the file recorded in BUILD_IMPORTS.json. Never edit a build; re-import it.`);
  if (sizes[game.slug] !== game.bytes) errors.push(`${game.slug}: build-sizes.json says ${sizes[game.slug]} bytes, the build is ${game.bytes}.`);
  if (slugs.includes(game.slug) && buildInputsHash(game.slug).sha256 !== game.inputsSha256) errors.push(`${game.slug}: games/${game.slug} source changed since its build was imported. Run npm run import-game -- ${game.slug} and commit the new build.`);
}
for (const slug of Object.keys(sizes)) if (!imports.some(game => game.slug === slug)) errors.push(`${slug}: in build-sizes.json but not in BUILD_IMPORTS.json.`);

if (errors.length) { console.error(`Game builds are out of sync:\n${errors.map(error => `  • ${error}`).join('\n')}`); process.exit(1); }
console.log(`Game builds in sync: ${imports.length} games match their recorded builds and sources.`);
