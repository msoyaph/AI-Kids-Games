// Loading a submission, and the checks on what it contains: source files only, its manifest, and
// its dependencies (allow-listed packages at exact versions).
import { existsSync,lstatSync,readdirSync,readFileSync } from 'node:fs';
import { extname,join,relative } from 'node:path';
import { takenBy,validateCommunityManifest,type CommunityManifest } from '../lib/manifest';
import { communityDir } from '../lib/repo';
import { result,type CheckResult,type Problem,type SourceFile,type Submission } from './types';
import { ALLOWLIST } from './vite-config';

const TEXT = new Set(['.ts','.tsx','.js','.mjs','.css','.html','.json','.md','.svg']);
const CODE = new Set(['.ts','.tsx','.js','.mjs','.css']);
/** Files a submission may have at its top level; everything else lives in src/ or tests/unit/. */
const TOP = new Set(['game.json','package.json','index.html','README.md','AGENTS.md','CLAUDE.md','LICENSE','LICENSE.md']);
const MAX_FILE = 200 * 1024, MAX_TOTAL = 2 * 1024 * 1024;

export function loadSubmission(slug: string): Submission {
  const dir = communityDir(slug), checkDir = join(dir,'.check');
  const files: SourceFile[] = [];
  const walk = (folder: string) => {
    for (const name of readdirSync(folder).sort()) {
      const path = join(folder,name), rel = relative(dir,path);
      if (rel === '.check' || rel === 'node_modules') continue;
      const stat = lstatSync(path);
      if (stat.isDirectory() && !stat.isSymbolicLink()) { walk(path); continue; }
      const bytes = stat.size, raw = stat.isSymbolicLink() ? null : readFileSync(path);
      // Text means valid UTF-8 with no NUL bytes; anything else is treated as binary.
      let text: string | null = null;
      if (raw && !raw.includes(0)) { const decoded = raw.toString('utf8'); if (!decoded.includes('�')) text = decoded; }
      files.push({ path: stat.isSymbolicLink() ? `${rel} (symlink)` : rel,bytes,text });
    }
  };
  if (existsSync(dir)) walk(dir);
  let manifest: CommunityManifest | null = null;
  try { manifest = JSON.parse(readFileSync(join(dir,'game.json'),'utf8')) as CommunityManifest; } catch { manifest = null; }
  return { slug,dir,checkDir,manifest,files };
}

export function checkFiles(s: Submission): CheckResult {
  const problems: Problem[] = [];
  if (!s.files.length) return result('files','Files',[{ message: `community/${s.slug}/ is empty or missing.`,fix: `Start one with: npm run new-community-game -- ${s.slug} --handle @your-nickname` }]);
  let total = 0;
  for (const file of s.files) {
    total += file.bytes;
    const ext = extname(file.path).toLowerCase(), base = file.path.split('/')[0]!;
    if (file.path.endsWith('(symlink)')) { problems.push({ message: `${file.path} is a symbolic link.`,fix: 'Replace it with a real file inside your folder.',file: file.path }); continue; }
    if (/(^|\/)(dist|build|out|node_modules|coverage)\//.test(file.path)) { problems.push({ message: `${file.path} is a build output.`,fix: 'Delete it. Submissions are source only; we always build from source.',file: file.path }); continue; }
    if (/(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/.test(file.path)) { problems.push({ message: `${file.path} is a lockfile.`,fix: 'Delete it. Community games use the shared, pinned packages in tooling/community-kit and never install their own.',file: file.path }); continue; }
    if (/(^|\/)([a-z0-9-]+\.config\.[cm]?[jt]sx?|[jt]sconfig[^/]*\.json)$|(^|\/)\.[^/]+/.test(file.path)) { problems.push({ message: `${file.path} is a config or hidden file.`,fix: 'Delete it. The build, type-check and test setup come from tooling/community-kit, so your folder holds only your game.',file: file.path }); continue; }
    if (!TOP.has(file.path) && !file.path.startsWith('src/') && !file.path.startsWith('tests/unit/')) { problems.push({ message: `${file.path} is outside the allowed places.`,fix: 'Keep your code and art in src/ and unit tests in tests/unit/. At the top level only game.json, package.json, index.html, README.md, AGENTS.md, CLAUDE.md and LICENSE are allowed.',file: file.path }); continue; }
    if (!TEXT.has(ext) && !(TOP.has(file.path) && ext === '')) { problems.push({ message: `${file.path}: "${ext || 'no extension'}" files aren't allowed.`,fix: 'Use source files only: .ts, .tsx, .js, .css, .html, .json, .md and .svg. Draw images in code or SVG, and make sounds in code (Web Audio), as the starter does.',file: file.path }); continue; }
    if (file.text === null) { problems.push({ message: `${file.path} is a binary file.`,fix: 'Replace it with text source (code or SVG).',file: file.path }); continue; }
    if (file.bytes > MAX_FILE) problems.push({ message: `${file.path} is ${(file.bytes/1024).toFixed(0)} KB (each file can be at most 200 KB).`,fix: 'Split it into smaller files. Big generated data or embedded media isn\'t allowed.',file: file.path });
    if (CODE.has(ext)) {
      const lines = file.text.split('\n'), longest = Math.max(...lines.map(line => line.length));
      if (longest > 1000 || (lines.length > 3 && file.text.length/lines.length > 250)) problems.push({ message: `${file.path} looks minified or generated (lines up to ${longest} characters).`,fix: 'Submit readable source you wrote, not minified, bundled or generated code.',file: file.path });
    }
  }
  if (total > MAX_TOTAL) problems.push({ message: `The folder holds ${(total/1048576).toFixed(1)} MB of source (at most 2 MB).`,fix: 'Remove unused files and keep art in code or small SVGs.' });
  for (const needed of ['game.json','package.json','index.html','src/main.ts']) if (!s.files.some(file => file.path === needed) && !(needed === 'src/main.ts' && s.files.some(file => /^src\/main\.(tsx|js)$/.test(file.path)))) problems.push({ message: `${needed} is missing.`,fix: `Every game needs ${needed}; start from the starter: npm run new-community-game.` });
  return result('files','Files',problems,[`${s.files.length} files, ${(total/1024).toFixed(0)} KB of source`]);
}

/** Starter wording a creator must replace with their own. */
const PLACEHOLDERS = ['Replace this with your own words','Describe your game for parents','Describe what players do in one or two sentences','Say what makes your game fun'];

export function checkManifest(s: Submission): CheckResult {
  if (!s.manifest) return result('manifest','Manifest (game.json)',[{ message: 'game.json is missing or isn\'t valid JSON.',fix: 'Fix the JSON (a missing comma or quote is the usual cause), or start again from the starter.',file: 'game.json' }]);
  const problems: Problem[] = validateCommunityManifest(s.manifest,s.slug,takenBy(s.slug)).map(message => ({ message: message.replace(`${s.slug}: `,''),fix: 'Edit game.json; docs/community-game.schema.json explains every field.',file: 'game.json' }));
  const text = JSON.stringify(s.manifest);
  for (const placeholder of PLACEHOLDERS) if (text.includes(placeholder)) problems.push({ message: `game.json still has starter wording ("${placeholder}…").`,fix: 'Write the description, tagline and originality statement in your own words.',file: 'game.json' });
  if (s.manifest.listing && s.manifest.listing !== 'submitted' && !s.manifest.approval) problems.push({ message: `listing is "${s.manifest.listing}".`,fix: 'New submissions use "submitted". Only the owner\'s review tool changes it.',file: 'game.json' });
  const config = s.files.find(file => file.path === 'src/config.ts')?.text ?? '';
  if (config && s.manifest.hook && !config.includes(s.manifest.hook)) problems.push({ message: `src/config.ts doesn't mention the hook "${s.manifest.hook}" from game.json.`,fix: 'Use the same hook name in game.json and your code.',file: 'src/config.ts',severity: 'warn' });
  return result('manifest','Manifest (game.json)',problems);
}

export function checkDependencies(s: Submission): CheckResult {
  const file = s.files.find(entry => entry.path === 'package.json');
  if (!file?.text) return result('dependencies','Dependencies',[{ message: 'package.json is missing.',fix: 'Add the package.json the starter makes (name, version, license, dependencies).' }]);
  let pkg: Record<string,unknown>;
  try { pkg = JSON.parse(file.text); } catch { return result('dependencies','Dependencies',[{ message: 'package.json isn\'t valid JSON.',fix: 'Fix the JSON.',file: 'package.json' }]); }
  const problems: Problem[] = [];
  const allowedKeys = new Set(['name','private','version','description','license','type','dependencies']);
  for (const key of Object.keys(pkg)) if (!allowedKeys.has(key)) problems.push({ message: `package.json has "${key}".`,fix: key === 'scripts' ? 'Remove "scripts": community games never run their own scripts; use npm run check-submission from the repository root.' : `Remove "${key}". Only name, private, version, description, license and dependencies are allowed.`,file: 'package.json' });
  if (pkg.license !== 'MIT') problems.push({ message: 'package.json license isn\'t "MIT".',fix: 'Set "license": "MIT".',file: 'package.json' });
  const deps = (pkg.dependencies ?? {}) as Record<string,string>;
  for (const [name,version] of Object.entries(deps)) {
    if (!(name in ALLOWLIST)) problems.push({ message: `"${name}" isn't an allowed package.`,fix: `Remove it and write that part yourself. Allowed: ${Object.entries(ALLOWLIST).map(([pkgName,v]) => `${pkgName}@${v}`).join(', ')}.`,file: 'package.json' });
    else if (version !== ALLOWLIST[name]) problems.push({ message: `"${name}" is "${version}", but only exactly "${ALLOWLIST[name]}" is allowed.`,fix: `Set "${name}": "${ALLOWLIST[name]}" (an exact version, no ^ or ~).`,file: 'package.json' });
  }
  return result('dependencies','Dependencies',problems,[Object.keys(deps).length ? `uses ${Object.keys(deps).join(', ')}` : 'no packages']);
}
