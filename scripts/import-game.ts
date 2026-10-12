// npm run import-game -- <slug> [--no-build | --keep]
// Builds games/<slug> in its own workspace, copies dist/index.html byte-for-byte into the site
// (apps/site/public/games/<slug>/index.html) and records its size, SHA-256 and a hash of the
// source files it was built from. CI (scripts/check-builds.ts) fails when that source changes
// without a re-import, so the site always ships exactly what the game's source builds.
// --keep records the build already in the site against the current source without rebuilding;
// use it only when that build was verifiably made from exactly this source.
import { execFileSync } from 'node:child_process';
import { copyFileSync,existsSync,mkdirSync,readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildImportsPath,buildInputsHash,buildSizesPath,gameDir,readJson,root,sha256,site,SLUG,writeJson,type BuildImports } from './lib/repo';

const [slug,...flags] = process.argv.slice(2);
if (!slug || !SLUG.test(slug)) throw new Error('Usage: npm run import-game -- <slug> [--no-build]');
const dir = gameDir(slug);
if (!existsSync(resolve(dir,'game.json'))) throw new Error(`games/${slug}/game.json not found. Scaffold a game with npm run new-game -- ${slug}.`);
const manifest = readJson<{ version: string }>(resolve(dir,'game.json'));

const keep = flags.includes('--keep');
const target = resolve(site,'public/games',slug,'index.html');
if (!keep && !flags.includes('--no-build')) execFileSync('npm',['run','build','--workspace',`games/${slug}`],{ cwd: root,stdio: 'inherit' });
const build = keep ? target : resolve(dir,'dist/index.html');
if (!existsSync(build)) throw new Error(keep ? `No build in the site at apps/site/public/games/${slug}/index.html.` : `No build at games/${slug}/dist/index.html.`);
const bytes = readFileSync(build);
if (!/<html[\s>]/i.test(bytes.toString('utf8'))) throw new Error('Expected a complete single-file HTML build.');

mkdirSync(resolve(target,'..'),{ recursive: true });
if (!keep) copyFileSync(build,target);
const digest = sha256(bytes);
if (sha256(readFileSync(target)) !== digest) throw new Error(`Copy of ${slug} does not match its build.`);

const imports = readJson<BuildImports>(buildImportsPath);
const entry = { slug,version: manifest.version,source: `games/${slug}/dist/index.html`,bytes: bytes.length,sha256: digest,inputsSha256: buildInputsHash(slug).sha256,importedAt: new Date().toISOString().slice(0,10) };
imports.games = [...imports.games.filter(game => game.slug !== slug),entry].sort((a,b) => a.slug.localeCompare(b.slug));
writeJson(buildImportsPath,imports);
const sizes = readJson<Record<string,number>>(buildSizesPath);
sizes[slug] = bytes.length;
writeJson(buildSizesPath,Object.fromEntries(Object.entries(sizes).sort(([a],[b]) => a.localeCompare(b))));

console.log(`Imported ${slug} ${manifest.version}: ${(bytes.length/1024).toFixed(0)} KB, sha256 ${digest}.`);
console.log('If the game looks different now, recapture its previews: npm run capture-previews --workspace apps/site -- '+slug);
