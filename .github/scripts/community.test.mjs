// node --test .github/scripts/*.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ownerFields,scope } from './community-scope.mjs';
import { unsigned } from './dco.mjs';

test('pull requests that touch no community game pass with no slugs',() => assert.deepEqual(scope(['apps/site/src/main.tsx','README.md']),{ slugs: [],problems: [] }));
test('a community pull request that changes only its own folder passes',() => assert.deepEqual(scope(['community/star-sprint/game.json','community/star-sprint/src/main.ts']),{ slugs: ['star-sprint'],problems: [] }));
test('touching anything else fails and names the stray files',() => {
  const { slugs,problems } = scope(['community/star-sprint/game.json','.github/workflows/ci.yml','apps/site/src/data/games.ts']);
  assert.deepEqual(slugs,['star-sprint'],'the game is still checked, so its creator sees every problem at once');
  assert.match(problems.join('\n'),/only its own community\/<slug>\/ folder[\s\S]*\.github\/workflows\/ci\.yml[\s\S]*apps\/site\/src\/data\/games\.ts/);
});
test('one game per pull request',() => assert.match(scope(['community/a-game/game.json','community/b-game/game.json']).problems.join(),/one game per pull request/));
test('folder names that could be unsafe are rejected',() => {
  assert.match(scope(['community/$(rm -rf)/game.json']).problems.join(),/isn't a valid game folder/);
  assert.deepEqual(scope(['community/$(rm -rf)/game.json','community/ok-game/game.json']).slugs,['ok-game'],'unsafe names never reach a job');
  assert.match(scope(['community/Bad_Name/x.ts']).problems.join(),/isn't a valid game folder/);
  assert.match(scope(['community/README.md']).problems.join(),/isn't a valid game folder|only its own/);
});
test('DCO: each commit needs a sign-off matching its author',() => {
  assert.deepEqual(unsigned([{ sha: 'a'.repeat(40),author: 'kid@example.com',message: 'Add my game\n\nSigned-off-by: Kid <kid@example.com>' }]),[]);
  assert.equal(unsigned([{ sha: 'b'.repeat(40),author: 'kid@example.com',message: 'Add my game' }]).length,1);
  assert.equal(unsigned([{ sha: 'c'.repeat(40),author: 'kid@example.com',message: 'Add my game\n\nSigned-off-by: Someone <other@example.com>' }]).length,1);
});
test('only the owner\'s pull request may add a game\'s art and llms.txt with its game.json',() => {
  const files = ['community/star-sprint/game.json','apps/site/public/media/community/star-sprint/cover.webp','llms.txt'];
  assert.deepEqual(scope(files,{ owner: true }),{ slugs: ['star-sprint'],problems: [] });
  assert.match(scope(files).problems.join(),/cover\.webp[\s\S]*llms\.txt/);
  assert.match(scope([...files,'apps/site/src/main.tsx'],{ owner: true }).problems.join(),/apps\/site\/src\/main\.tsx/);
  assert.match(scope(['community/star-sprint/game.json','apps/site/public/media/community/other-game/cover.webp'],{ owner: true }).problems.join(),/other-game/);
});
test('a contributor can\'t approve or list their own game',() => {
  const fresh = { listing: 'submitted',submitted: { sourceCommit: 'pending' } };
  const approval = { by: '@someone',date: '2026-10-13',commit: 'a'.repeat(40),sourceSha256: 'b'.repeat(64),reportSha256: 'c'.repeat(64) };
  assert.deepEqual(ownerFields('star-sprint',null,fresh),[]);
  assert.match(ownerFields('star-sprint',null,{ ...fresh,listing: 'listed',approval }).join(),/approval, listing \("submitted" → "listed"\)/);
  assert.match(ownerFields('star-sprint',fresh,{ ...fresh,submitted: { sourceCommit: 'd'.repeat(40) } }).join(),/submitted\.sourceCommit/);
  // An update keeps the approved fields as they are on main; its new source needs a new approval anyway.
  const listed = { listing: 'listed',approval,submitted: { sourceCommit: 'a'.repeat(40) } };
  assert.deepEqual(ownerFields('star-sprint',listed,{ ...listed }),[]);
  assert.match(ownerFields('star-sprint',listed,{ ...listed,listing: 'submitted' }).join(),/listing/);
  assert.deepEqual(ownerFields('star-sprint',fresh,{ ...listed },{ owner: true }),[]);
});
