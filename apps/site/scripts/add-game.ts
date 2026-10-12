import { createInterface } from 'node:readline/promises';
import { stdin,stdout } from 'node:process';
import { existsSync,mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { games,type Category,type Control,type Device,type Game } from '../src/data/games';
const root = fileURLToPath(new URL('../',import.meta.url));
const prompt = createInterface({ input: stdin, output: stdout });
async function ask(label: string, fallback = '') { return (await prompt.question(`${label}${fallback ? ` [${fallback}]` : ''}: `)).trim() || fallback; }
const htmlEscape = (text: string) => text.replace(/[&<>"']/g,char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]!));
function select<T extends string>(text: string,options: readonly T[]) { const selected = text.split(',').map(value => value.trim()).filter(Boolean); const invalid = selected.filter(value => !options.includes(value as T)); if (!selected.length || invalid.length) throw new Error(`Choose from: ${options.join(', ')}. You entered: ${text}`); return [...new Set(selected)] as T[]; }
try {
  const title = await ask('Game title'); if (!title) throw new Error('Please give the game a title.');
  const suggested = title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const slug = await ask('Folder slug',suggested);
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Use a lowercase slug starting with a letter, with single hyphens.');
  if (games.some(game => game.slug === slug) || existsSync(resolve(root,'public/games',slug))) throw new Error(`The game "${slug}" already exists. Nothing was changed.`);
  const tagline = await ask('Short tagline','A new little adventure.');
  const description = await ask('Full description','A new game is on the way. Check back soon!');
  const categories = select<Category>(await ask('Categories: Action, Adventure, Cozy, Strategy, Racing, Learning (comma separated)','Adventure'),['Action','Adventure','Cozy','Strategy','Racing','Learning']);
  const tags = (await ask('Search tags (comma separated)','Explore')).split(',').map(tag => tag.trim()).filter(Boolean);
  const ageGuidance = await ask('Age guidance','Ages 8+');
  const minAge = Number(await ask('Suggested minimum age',ageGuidance.match(/\d+/)?.[0] || '8'));
  if (!Number.isInteger(minAge) || minAge < 0 || minAge > 18) throw new Error('Minimum age must be a whole number from 0 to 18.');
  const contentNotes = await ask('Content notes','Coming soon. A grown-up should review this game before publishing.');
  const estimatedPlayTime = await ask('Play time','5–15 minutes');
  const types = select<Control>(await ask('Controls: Keyboard, Mouse, Gamepad, Touch','Keyboard, Mouse'),['Keyboard','Mouse','Gamepad','Touch']);
  const howToPlay = (await ask('How-to-play steps (separate with |)','Follow the instructions in the game.')).split('|').map(step => step.trim()).filter(Boolean);
  const supportedDevices = select<Device>(await ask('Devices: Computer, Tablet, Phone','Computer'),['Computer','Tablet','Phone']);
  const entry: Game = { slug,title,tagline,description,categories,tags,ageGuidance,minAge,contentNotes,estimatedPlayTime,quickStart: howToPlay.slice(0,3),controls: { types,howToPlay },supportedDevices,coverLayers: [],releaseDate: new Intl.DateTimeFormat('en-CA',{ timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date()),featured: false,accentColor: '#d9ebda',status: 'Coming soon' };
  const registryPath = resolve(root,'src/data/games.ts'); const registry = readFileSync(registryPath,'utf8'); const marker = '  // ADD_GAME_ENTRIES';
  if (!registry.includes(marker)) throw new Error('The registry scaffold marker is missing. Nothing was changed.');
  const folder = resolve(root,'public/games',slug); mkdirSync(folder,{ recursive: true });
  writeFileSync(resolve(folder,'index.html'),`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>${htmlEscape(title)}</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#e8f2e3;color:#254d39;font:18px system-ui;text-align:center}main{padding:30px}h1{font-size:38px}p{line-height:1.6}</style></head><body><main><h1>Game coming soon!</h1><p>${htmlEscape(title)} is getting ready for a little adventure.</p></main></body></html>`);
  // Placeholder art until the real cover, logo and captured previews exist (see ADDING_A_GAME.md).
  const media = resolve(root,'public/media',slug); mkdirSync(media,{ recursive: true });
  writeFileSync(resolve(media,'cover.svg'),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#e2e5ea"/><circle cx="800" cy="560" r="150" fill="#f5f6f8"/><path d="m760 490 130 70-130 70z" fill="#5a6272"/></svg>`);
  writeFileSync(resolve(media,'logo.svg'),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 160" role="img" aria-label="${htmlEscape(title)}"><title>${htmlEscape(title)}</title><text x="450" y="112" text-anchor="middle" fill="#16191f" font-family="system-ui" font-size="96" font-weight="800">${htmlEscape(title)}</text></svg>`);
  writeFileSync(registryPath,registry.replace(marker,JSON.stringify(entry,null,2).split('\n').map(line => `  ${line}`).join('\n')+`,\n${marker}`));
  console.log(`\nCreated ${slug}. Replace public/games/${slug}/index.html with the reviewed build, draw public/media/${slug}/cover.svg and logo.svg, write scripts/capture/${slug}.ts and run npm run capture-previews -- ${slug}, then update its status in src/data/games.ts and run npm run build.`);
} catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; } finally { prompt.close(); }
