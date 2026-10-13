import { expect,test } from './fixtures';
import { REPO } from '../../src/lib/links';
import { guard } from './games';

// GitHub boxes: the project in the header, and each game's own code and Fork beside its age (the
// hero) and on its page. Nothing loads from GitHub, and every link asks a grown-up first.
test('GitHub boxes: the header, the hero game and a game page, behind the grown-up check',async ({ page,isMobile }) => {
  const { errors,external } = guard(page);
  await page.goto('/');
  const header = page.getByRole('banner').getByRole('link',{ name: 'AI Kids Games on GitHub: the open-source code' });
  await expect(header).toHaveAttribute('href',REPO);
  if (isMobile) await expect(header.getByText('GitHub')).toBeHidden(); else await expect(header.getByText('GitHub')).toBeVisible();
  const hero = page.locator('.hero-meta').getByRole('group',{ name: /on GitHub$/ });
  await expect(hero.getByRole('link',{ name: /’s code on GitHub$/ })).toHaveAttribute('href',new RegExp(`^${REPO}/tree/main/games/[a-z-]+$`));
  await expect(hero.getByRole('link',{ name: /^Fork AI Kids Games on GitHub/ })).toHaveAttribute('href',`${REPO}/fork`);
  for (const link of [header,hero.getByRole('link',{ name: /’s code on GitHub$/ })]) {
    const box = await link.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await link.click();
    await expect(page.getByRole('dialog')).toContainText('Ask a grown-up first!');
    await page.getByRole('button',{ name: 'Stay here' }).click();
  }
  await page.goto('/game/tuck-pop');
  await expect(page.getByRole('link',{ name: 'Tuck Pop’s code on GitHub' })).toHaveAttribute('href',`${REPO}/tree/main/games/tuck-pop`);
  await page.getByRole('link',{ name: 'Fork AI Kids Games on GitHub to make your own Tuck Pop' }).click();
  await expect(page.getByRole('dialog')).toContainText('Ask a grown-up first!');
  await page.getByRole('button',{ name: 'Stay here' }).click();
  expect(errors).toEqual([]); expect(external).toEqual([]);
});
