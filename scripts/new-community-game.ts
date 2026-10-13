// npm run new-community-game -- <slug> --handle @your-nickname [--title "My Game"]
// Starts a community game in community/<slug>/ from the starter (templates/game-starter): its
// source only. The build, type checking and test setup come from tooling/community-kit, so a
// submission is just your game. Then: npm run dev:community -- <slug>, and
// npm run check-submission -- <slug>. The whole process is in SUBMITTING.md.
import { cpSync,existsSync,mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { relative,resolve } from 'node:path';
import { HANDLE,takenBy,type CommunityManifest } from './lib/manifest';
import { communityDir,root,SLUG } from './lib/repo';

const args = process.argv.slice(2);
const option = (name: string) => { const at = args.indexOf(name); return at >= 0 ? args[at+1] : undefined; };
const slug = args.find((arg,index) => !arg.startsWith('--') && !['--title','--handle'].includes(args[index-1] ?? ''));
const usage = 'Usage: npm run new-community-game -- <slug> --handle @your-nickname [--title "My Game"]';
if (!slug || !SLUG.test(slug)) throw new Error(`${usage}\nThe slug is lowercase letters, digits and single hyphens, e.g. star-sprint.`);
const handle = option('--handle')?.toLowerCase();
if (!handle || !HANDLE.test(handle)) throw new Error(`${usage}\nThe handle is a nickname like @star-maker (never your real name).`);
const title = option('--title') ?? slug.split('-').map(word => word[0]!.toUpperCase()+word.slice(1)).join(' ');
const dest = communityDir(slug);
if (existsSync(dest)) throw new Error(`community/${slug} already exists. Nothing was changed.`);

const id = slug.replace(/-/g,''), prefix = `${id}.`, hook = `__${id}`;
const taken = takenBy(slug);
if (taken.slugs.includes(slug)) throw new Error(`The slug "${slug}" is already used by another game. Pick a different one.`);
if (prefix.startsWith('aikg') || taken.prefixes.some(other => other.startsWith(prefix) || prefix.startsWith(other))) throw new Error(`The storage prefix "${prefix}" would overlap another game's. Pick a different slug.`);

// Source only: no build or test configs (the kit owns those), no scripts, no browser tests.
const template = resolve(root,'templates/game-starter');
mkdirSync(dest,{ recursive: true });
for (const part of ['index.html','src','tests/unit']) cpSync(resolve(template,part),resolve(dest,part),{ recursive: true,filter: source => !/(^|\/)(node_modules|dist)(\/|$)/.test(relative(template,source)) });
const swap = (text: string) => text.replaceAll('Star Catch',title).replaceAll('gamestarter.',prefix).replaceAll('__gamestarter',hook).replaceAll('game-starter',slug);
const edit = (file: string,change: (text: string) => string) => { const path = resolve(dest,file); writeFileSync(path,change(readFileSync(path,'utf8'))); };
for (const file of ['index.html','src/config.ts']) edit(file,swap);

const starter = JSON.parse(readFileSync(resolve(template,'game.json'),'utf8'));
const manifest: CommunityManifest = {
  $schema: '../../docs/community-game.schema.json',
  slug,title,
  tagline: 'Say what makes your game fun, in one short line.',
  shortDescription: `${title} is a new game for AI Kids Games. Describe what players do in one or two sentences here.`,
  longDescription: 'Describe your game for parents and players: what you do, what you collect or build, and what makes it fun. Keep it honest and simple.',
  version: '0.1.0',minAge: starter.minAge,ageRange: starter.ageRange,genres: starter.genres,tags: ['Arcade','Original'],keywords: starter.keywords,features: starter.features,
  contentNotes: starter.contentNotes,controls: starter.controls,devices: starter.devices,orientation: starter.orientation,requirements: [],playTime: starter.playTime,
  storage: { prefix,keys: [`${prefix}save`],probe: `${prefix}__probe` },
  safety: { ads: false,purchases: false,chat: false,accounts: false,network: false },
  hook,
  capture: { scenes: ['?scene=title','?scene=play&seed=7','?scene=results'] },
  creator: { handle },
  license: 'MIT',
  originality: 'Replace this with your own words: say that this game is your original work, made alone or with an AI assistant, and that it uses no other companies’ names, characters, art or music.',
  submitted: { date: new Date().toISOString().slice(0,10),sourceCommit: 'pending' },
  listing: 'submitted'
};
writeFileSync(resolve(dest,'game.json'),`${JSON.stringify(manifest,null,2)}\n`);
writeFileSync(resolve(dest,'package.json'),`${JSON.stringify({ name: `community-${slug}`,private: true,version: '0.1.0',description: `${title}, a community game for AI Kids Games by ${handle}.`,license: 'MIT',dependencies: {} },null,2)}\n`);

const guide = `# ${title}

A community game for AI Kids Games by ${handle}. It started from the starter game ("Star Catch").

## Make it yours

- Rules: \`src/sim.ts\`. Drawing: \`src/render.ts\`. Sounds: \`src/audio.ts\` (made in code, no files).
- Keep the plumbing: one self-contained file, no network, saves only under \`${prefix}\`
  (\`src/storage.ts\`), the test hook \`window.${hook}\` and the capture routes (\`?scene=…\`).
- Describe your game in \`game.json\`: title, ages, content notes, controls and the originality statement.

## Commands (run them from the repository root)

\`\`\`bash
npm run dev:community -- ${slug}           # play it while you build
npm run check-submission -- ${slug}        # every check the reviewers run, with fixes
\`\`\`

When every check passes, open a pull request that changes only \`community/${slug}/\`. The whole
process, the kid-safety rules and what happens next are in SUBMITTING.md at the repository root.
`;
writeFileSync(resolve(dest,'README.md'),guide);
// For AI coding assistants working in this folder.
const assistant = `# Working on ${title} (a community game)

Read SUBMITTING.md at the repository root first; it is written for you too. In short:

- Change files only inside \`community/${slug}/\`. A pull request that touches anything else fails.
- Source only: TypeScript, HTML, CSS, JSON, Markdown and small SVGs. No binaries, no minified or
  built files, no config files, no lockfiles.
- No network of any kind: no fetch, XHR, WebSockets, outside URLs, remote fonts or scripts, no eval
  or new Function. Allowed packages only (see tooling/community-kit/allowlist.json), at exact versions.
- Storage only under \`${prefix}\`, through \`src/storage.ts\`. Never call localStorage.clear().
- Kid-safe: no ads, purchases, accounts, chat, personal data, or other companies' names and characters;
  at most 3 flashes a second; 48 px touch targets; keyboard play.
- Keep the test hook \`window.${hook}\` and the capture routes listed in game.json working.
- Run \`npm run check-submission -- ${slug}\` from the repository root and fix every ✗ before you finish.
- Every commit needs a sign-off line (\`git commit -s\`), see SUBMITTING.md.
`;
writeFileSync(resolve(dest,'AGENTS.md'),assistant);
writeFileSync(resolve(dest,'CLAUDE.md'),assistant);

console.log(`Created community/${slug}: "${title}" by ${handle}, storage prefix "${prefix}", test hook window.${hook}.

Next (from the repository root):
  npm run dev:community -- ${slug}
  npm run check-submission -- ${slug}

Then fill in community/${slug}/game.json and read SUBMITTING.md to open your pull request.`);
