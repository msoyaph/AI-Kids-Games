// node --test .github/scripts/   (run by the repo checks job)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lockfileGames,pick } from './what-changed.mjs';

const games = ['calex-cart','light-crossing','new-game','space-sky','game-starter'];
const lock = (packages,extra = {}) => JSON.stringify({ name: 'ai-kids-games',lockfileVersion: 3,requires: true,packages: { '': { workspaces: ['apps/*','games/*','templates/*'] },...packages },...extra });
const base = {
  'node_modules/pixi.js': { version: '8.22.0' },
  'node_modules/space-sky': { resolved: 'games/space-sky',link: true },
  'games/space-sky': { name: 'space-sky',version: '2.0.0' }
};

test('a new game folder runs only that game',() => {
  assert.deepEqual(pick({ event: 'pull_request',changed: ['games/new-game/src/main.ts','games/new-game/game.json'],games }).games,['new-game']);
});
test('the starter, and several games at once, in matrix order',() => {
  assert.deepEqual(pick({ event: 'pull_request',changed: ['templates/game-starter/src/sim.ts','games/space-sky/README.md','games/calex-cart/src/a.ts'],games }).games,['calex-cart','space-sky','game-starter']);
});
test('the website, root scripts and docs run no game suites (the site and repo checks always run)',() => {
  assert.deepEqual(pick({ event: 'pull_request',changed: ['apps/site/src/App.tsx','scripts/lib/manifest.ts','docs/game.schema.json','README.md'],games }).games,[]);
});
test('root package.json, .nvmrc, the CI workflow and these scripts run every game',() => {
  for (const file of ['package.json','.nvmrc','.github/workflows/ci.yml','.github/scripts/what-changed.mjs']) assert.deepEqual(pick({ event: 'pull_request',changed: [file],games }).games,games,file);
});
test('other .github files run no game suites',() => {
  assert.deepEqual(pick({ event: 'pull_request',changed: ['.github/dependabot.yml','.github/ISSUE_TEMPLATE/bug.yml'],games }).games,[]);
});
test('a manual run, or a push without a usable base, runs every game',() => {
  assert.deepEqual(pick({ event: 'workflow_dispatch',changed: ['README.md'],games }).games,games);
  assert.deepEqual(pick({ event: 'push',changed: null,games }).games,games);
});
test('adding a game workspace to the lockfile runs only the new game',() => {
  const after = lock({ ...base,'node_modules/new-game': { resolved: 'games/new-game',link: true },'games/new-game': { name: 'new-game',version: '0.1.0',dependencies: { 'pixi.js': '^8.22.0' } } });
  assert.deepEqual(lockfileGames(lock(base),after,games),['new-game']);
  assert.deepEqual(pick({ event: 'pull_request',changed: ['package-lock.json','games/new-game/package.json'],games,lock: () => ({ before: lock(base),after }) }).games,['new-game']);
});
test('a dependency nested under one game runs that game; the website\'s own entries run none',() => {
  const after = lock({ ...base,'games/space-sky/node_modules/three': { version: '0.180.0' },'apps/site/node_modules/react': { version: '19.2.0' } });
  assert.deepEqual(lockfileGames(lock(base),after,games),['space-sky']);
});
test('a shared (hoisted) dependency, the root entry or the lockfile header runs every game',() => {
  assert.equal(lockfileGames(lock(base),lock({ ...base,'node_modules/pixi.js': { version: '8.23.0' } }),games),'all');
  assert.equal(lockfileGames(lock(base),lock({ ...base,'': { workspaces: ['apps/*'] } }),games),'all');
  assert.equal(lockfileGames(lock(base),lock(base,{ lockfileVersion: 4 }),games),'all');
  assert.deepEqual(pick({ event: 'pull_request',changed: ['package-lock.json'],games,lock: () => ({ before: lock(base),after: lock({ ...base,'node_modules/pixi.js': { version: '8.23.0' } }) }) }).games,games);
});
test('a lockfile that can\'t be read on one side runs every game',() => {
  assert.equal(lockfileGames(null,lock(base),games),'all');
});
test('entries of a game folder that no longer exists count as shared: every game runs',() => {
  const after = lock({ 'node_modules/pixi.js': { version: '8.22.0' } });
  assert.deepEqual(lockfileGames(lock(base),after,['calex-cart','game-starter']),'all');
});

test('community games and the community kit run no game suites',() => {
  assert.deepEqual(pick({ event: 'pull_request',changed: ['community/star-sprint/game.json','community/star-sprint/src/main.ts','tooling/community-kit/allowlist.json'],games }).games,[]);
  const kit = (version) => ({ ...base,'node_modules/@ai-kids-games/community-kit': { resolved: 'tooling/community-kit',link: true },'tooling/community-kit': { name: '@ai-kids-games/community-kit',version } });
  assert.deepEqual(lockfileGames(lock(kit('1.0.0')),lock(kit('1.0.1')),games),[]);
});
