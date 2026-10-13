// CI "What changed": picks the games whose own suites run for a push or pull request.
//   node .github/scripts/what-changed.mjs   (env EVENT, BASE, HEAD; prints games=[...] for $GITHUB_OUTPUT)
// The repo checks and the website always run, so this only decides the per-game matrix:
// - every game: a manual run, no usable base, or a change to the root package.json, .nvmrc, the
//   CI workflow or these scripts;
// - a game: anything under games/<slug>/ (templates/game-starter/ for the starter);
// - package-lock.json: only the workspaces whose own entries changed (adding a game adds just its
//   workspace entries). Any other entry is a shared dependency, so every game runs.
// Root scripts/ and docs/ are repo tooling: the repo checks cover them, and no game uses them.
import { execFileSync } from 'node:child_process';
import { existsSync,readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const STARTER = 'game-starter';
const EVERYTHING = [/^package\.json$/,/^\.nvmrc$/,/^\.github\/workflows\/ci\.yml$/,/^\.github\/scripts\//];

/** Every game folder with a package.json, plus the starter template. */
export function allGames(root = '.') {
  const dir = `${root}/games`;
  const games = existsSync(dir) ? readdirSync(dir).filter(name => existsSync(`${dir}/${name}/package.json`)).sort() : [];
  return [...games,STARTER];
}

/** The workspace a lockfile path belongs to: a game slug, the starter, "site", or null (shared). */
function owner(path,games) {
  const game = path.match(/^games\/([a-z0-9-]+)(?:\/|$)/)?.[1];
  if (game && games.includes(game)) return game;
  if (/^templates\/game-starter(?:\/|$)/.test(path)) return STARTER;
  if (/^apps\/site(?:\/|$)/.test(path)) return 'site';
  return null;
}

/** The games a lockfile change touches, or "all" when a shared dependency changed. */
export function lockfileGames(before,after,games) {
  if (!before || !after) return 'all';
  const a = JSON.parse(before), b = JSON.parse(after);
  for (const key of new Set([...Object.keys(a),...Object.keys(b)])) if (key !== 'packages' && JSON.stringify(a[key]) !== JSON.stringify(b[key])) return 'all';
  const picked = new Set();
  const packages = [a.packages ?? {},b.packages ?? {}];
  for (const path of new Set(packages.flatMap(Object.keys))) {
    const [old,now] = packages.map(list => list[path]);
    if (JSON.stringify(old) === JSON.stringify(now)) continue;
    const entry = now ?? old;
    // A workspace's own entry, its nested node_modules, or the node_modules link npm makes to it.
    const workspace = owner(path,games) ?? (entry?.link ? owner(entry.resolved ?? '',games) : null);
    if (!workspace) return 'all';
    if (workspace !== 'site') picked.add(workspace);
  }
  return [...picked];
}

/** Which games to test, and why. */
export function pick({ event,changed,games,lock = () => ({}) }) {
  if (event === 'workflow_dispatch' || !changed) return { games,reason: 'manual run or no base commit: every game' };
  const shared = changed.find(file => EVERYTHING.some(pattern => pattern.test(file)));
  if (shared) return { games,reason: `${shared} changed: every game` };
  const picked = new Set();
  for (const file of changed) {
    const workspace = owner(file,games);
    if (workspace && workspace !== 'site') picked.add(workspace);
  }
  if (changed.includes('package-lock.json')) {
    const { before,after } = lock();
    const fromLock = lockfileGames(before,after,games);
    if (fromLock === 'all') return { games,reason: 'a shared dependency in package-lock.json changed: every game' };
    for (const game of fromLock) picked.add(game);
  }
  return { games: games.filter(game => picked.has(game)),reason: picked.size ? 'games whose folders or lockfile entries changed' : 'no game changed' };
}

function main() {
  const { EVENT: event = '',BASE: base = '',HEAD: head = 'HEAD' } = process.env;
  const git = (...args) => execFileSync('git',args,{ encoding: 'utf8',maxBuffer: 1 << 28 });
  const show = (ref) => { try { return git('show',`${ref}:package-lock.json`); } catch { return null; } };
  let changed = null;
  if (base && !/^0+$/.test(base)) {
    try { git('cat-file','-e',`${base}^{commit}`); changed = git('diff','--name-only',base,head).split('\n').filter(Boolean); } catch { changed = null; }
  }
  const result = pick({ event,changed,games: allGames(),lock: () => ({ before: show(base),after: show(head) }) });
  console.error(`What changed: ${result.reason}. Games: ${result.games.join(', ') || 'none'}.`);
  console.log(`games=${JSON.stringify(result.games)}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
