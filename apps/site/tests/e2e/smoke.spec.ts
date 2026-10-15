// The short smoke test, the only browser test that runs against production (npm run test:smoke after
// a release): the main pages and one light game, with no errors and nothing from other sites. The full
// suites run against the release's preview deployment before the merge, so production's request
// totals (npm run plays) stay about real families.
import { expect,test } from './fixtures';
import { boot,guard } from './games';

test('smoke: the main pages and one game, no errors, nothing from other sites',async ({ page }) => {
  const { errors,external } = guard(page);
  await page.goto('/');
  await expect(page.getByRole('link',{ name: /Tuck Pop/ }).first()).toBeAttached();
  for (const [path,heading] of [['/game/tuck-pop','Tuck Pop'],['/parents','For parents'],['/privacy','Privacy'],['/terms','Terms of use'],['/faq',/FAQ|questions/i]] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading',{ level: 1,name: heading })).toBeVisible();
  }
  await boot(page,'tuck-pop'); // one game download
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
