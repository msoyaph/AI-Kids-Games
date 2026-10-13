// npm run new-game -- <slug> [--title "My Game"]
// Copies templates/game-starter to games/<slug> and personalises it: package name, title,
// storage prefix, test hook, ports and game.json. Then: npm install, and build your game.
import { cpSync,existsSync,readFileSync,writeFileSync } from 'node:fs';
import { relative,resolve } from 'node:path';
import { readManifests } from './lib/manifest';
import { gameDir,root,SLUG } from './lib/repo';

const args = process.argv.slice(2);
const slug = args.find(arg => !arg.startsWith('--') && args[args.indexOf(arg)-1] !== '--title');
const titleAt = args.indexOf('--title');
if (!slug || !SLUG.test(slug)) throw new Error('Usage: npm run new-game -- <slug> [--title "My Game"]   (slug: lowercase letters, digits and single hyphens)');
const title = titleAt >= 0 && args[titleAt+1] ? args[titleAt+1]! : slug.split('-').map(word => word[0]!.toUpperCase()+word.slice(1)).join(' ');
const dest = gameDir(slug);
if (existsSync(dest)) throw new Error(`games/${slug} already exists. Nothing was changed.`);

// A storage prefix and hook unique to this game: the slug without hyphens.
const id = slug.replace(/-/g,'');
const prefix = `${id}.`, hook = `__${id}`;
const taken = readManifests().map(m => m.storage.prefix);
if (taken.some(other => other.startsWith(prefix) || prefix.startsWith(other)) || prefix.startsWith('aikg')) throw new Error(`The storage prefix "${prefix}" would overlap another game's. Pick a different slug.`);
// Ports from the slug, so two games' preview servers never collide.
const hash = [...slug].reduce((h,c) => (h*31+c.charCodeAt(0)) >>> 0,7);
const preview = 4200+hash%600, dev = preview+1000;

const template = resolve(root,'templates/game-starter');
cpSync(template,dest,{ recursive: true,filter: source => !/(^|\/)(node_modules|dist|test-results|playwright-report)(\/|$)/.test(relative(template,source)) });
const edit = (file: string,change: (text: string) => string) => { const path = resolve(dest,file); writeFileSync(path,change(readFileSync(path,'utf8'))); };
const swap = (text: string) => text.replaceAll('Star Catch',title).replaceAll('gamestarter.',prefix).replaceAll('__gamestarter',hook).replaceAll('game-starter',slug).replaceAll('4199',String(preview)).replaceAll('5199',String(dev));
for (const file of ['src/config.ts','index.html','tests/e2e/smoke.spec.ts','playwright.config.ts','vite.config.ts','README.md','CLAUDE.md']) edit(file,swap);
edit('package.json',text => { const pkg = JSON.parse(text); pkg.name = slug; pkg.version = '0.1.0'; pkg.description = `${title}, a game for Ai Kids Games.`; return `${JSON.stringify(pkg,null,2)}\n`; });
edit('game.json',text => {
  const m = JSON.parse(swap(text));
  m.version = '0.1.0';
  m.site = { ...m.site,featured: false,status: 'In development',releaseDate: new Date().toISOString().slice(0,10) };
  return `${JSON.stringify(m,null,2)}\n`;
});
edit('README.md',text => text.replace(/^# .*$/m,`# ${title}`).replace(/Don't edit this folder to make a game\. Copy it:[\s\S]*?```\n\n/,''));

console.log(`Created games/${slug} from the starter: "${title}", storage prefix "${prefix}", test hook window.${hook}.

Next:
  npm install
  npm run dev --workspace games/${slug}
  npm test --workspace games/${slug}

Make it yours: change the rules in src/sim.ts, the art in src/render.ts and the listing in
games/${slug}/game.json. It stays off the website while site.status is "In development".
Read docs/CREATE-A-GAME.md for the whole path, from the game contract to
trying it on the website (npm run import-game -- ${slug}).`);
