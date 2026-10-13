// node --test .github/scripts/*.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scope } from './community-scope.mjs';
import { unsigned } from './dco.mjs';

test('pull requests that touch no community game pass with no slugs',() => assert.deepEqual(scope(['apps/site/src/main.tsx','README.md']),{ slugs: [],problems: [] }));
test('a community pull request that changes only its own folder passes',() => assert.deepEqual(scope(['community/star-sprint/game.json','community/star-sprint/src/main.ts']),{ slugs: ['star-sprint'],problems: [] }));
test('touching anything else fails and names the stray files',() => {
  const { slugs,problems } = scope(['community/star-sprint/game.json','.github/workflows/ci.yml','apps/site/src/data/games.ts']);
  assert.deepEqual(slugs,[]);
  assert.match(problems.join('\n'),/only its own community\/<slug>\/ folder[\s\S]*\.github\/workflows\/ci\.yml[\s\S]*apps\/site\/src\/data\/games\.ts/);
});
test('one game per pull request',() => assert.match(scope(['community/a-game/game.json','community/b-game/game.json']).problems.join(),/one game per pull request/));
test('folder names that could be unsafe are rejected',() => {
  assert.match(scope(['community/$(rm -rf)/game.json']).problems.join(),/isn't a valid game folder/);
  assert.match(scope(['community/Bad_Name/x.ts']).problems.join(),/isn't a valid game folder/);
  assert.match(scope(['community/README.md']).problems.join(),/isn't a valid game folder|only its own/);
});
test('DCO: each commit needs a sign-off matching its author',() => {
  assert.deepEqual(unsigned([{ sha: 'a'.repeat(40),author: 'kid@example.com',message: 'Add my game\n\nSigned-off-by: Kid <kid@example.com>' }]),[]);
  assert.equal(unsigned([{ sha: 'b'.repeat(40),author: 'kid@example.com',message: 'Add my game' }]).length,1);
  assert.equal(unsigned([{ sha: 'c'.repeat(40),author: 'kid@example.com',message: 'Add my game\n\nSigned-off-by: Someone <other@example.com>' }]).length,1);
});
