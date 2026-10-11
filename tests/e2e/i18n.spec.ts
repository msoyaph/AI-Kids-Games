import { expect, test, type Page } from '@playwright/test';
import { cellCenter, expectClean, guard, isTouch, tap, testState, waitForGame } from './helpers';

/**
 * Layout check for every language: no clipped, cut-off or ellipsised text on
 * any menu, modal or HUD, on phones and desktop. The pseudo-locale (accented,
 * +40 % longer) stands in for future languages and also reveals any text that
 * skipped translation.
 */
const LOCALES = ['en', 'fil', 'pseudo'] as const;
const PROJECTS = ['desktop', 'phone-landscape', 'phone-portrait'];

interface Issue {
  text: string;
  why: string;
}

/** Runs in the page: every visible text node must fit inside its clipping boxes. */
function findOverflow(pseudo: boolean): Issue[] {
  const issues: Issue[] = [];
  const vw = innerWidth;
  const vh = innerHeight;
  const root = document.getElementById('ui') ?? document.body;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const seen = new Set<Element>();
  const hiddenUp = (el: Element): boolean => {
    for (let a: Element | null = el; a; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05 || a.getAttribute('aria-hidden') === 'true') return true;
    }
    return false;
  };
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const text = (node.textContent ?? '').trim();
    if (!text) continue;
    const el = node.parentElement;
    if (!el || hiddenUp(el)) continue;
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
    if (!rects.length) continue;
    // text parked fully off-screen (closed drawers, slide-outs) is not "clipped"
    if (rects.every((r) => r.right <= 0 || r.left >= vw || r.bottom <= 0 || r.top >= vh)) continue;
    // clip box: viewport width, narrowed by every ancestor that hides overflow
    let l = 0;
    let r = vw;
    let tp = -Infinity;
    let b = Infinity;
    // content inside a scroll container can be scrolled to: clipping from it
    // (and from anything above it) on that axis doesn't hide text for good
    let scrollX = false;
    let scrollY = false;
    for (let a: Element | null = el; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const box = a.getBoundingClientRect();
      if (!scrollX && (cs.overflowX === 'hidden' || cs.overflowX === 'clip')) {
        l = Math.max(l, box.left);
        r = Math.min(r, box.right);
      }
      if (!scrollY && (cs.overflowY === 'hidden' || cs.overflowY === 'clip')) {
        tp = Math.max(tp, box.top);
        b = Math.min(b, box.bottom);
      }
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') scrollX = true;
      if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') scrollY = true;
    }
    const tol = 1.5;
    const bad = rects.find((q) => (!scrollX && (q.left < l - tol || q.right > r + tol)) || q.top < tp - tol || q.bottom > b + tol);
    if (bad) issues.push({ text, why: `clipped (${Math.round(bad.left)}..${Math.round(bad.right)} × ${Math.round(bad.top)}..${Math.round(bad.bottom)} vs ${Math.round(l)}..${Math.round(r)} × ${Math.round(tp)}..${Math.round(b)}) in <${el.tagName.toLowerCase()} class="${el.className}">` });
    // covered by another control (e.g. a wider label sliding under a button)?
    const modal = document.querySelector('.modal-back');
    if (!modal || modal.contains(el)) {
      const q = rects[0]!;
      const cx = q.left + q.width / 2;
      const cy = q.top + q.height / 2;
      if (cx > 0 && cx < vw && cy > 0 && cy < vh) {
        const hit = document.elementFromPoint(cx, cy);
        // big layers (panels, drawers) stack over each other on purpose; small controls must not hide text
        const layer = hit?.closest('.panel, .drawer, .modal-back') ?? hit;
        const lb = layer?.getBoundingClientRect();
        const small = !!lb && lb.width * lb.height < 160 * 160;
        if (hit && small && !layer!.contains(el) && hit !== el && !el.contains(hit) && !hit.contains(el) && hit.tagName !== 'CANVAS') issues.push({ text, why: `covered by <${hit.tagName.toLowerCase()} class="${hit.className}">` });
      }
    }
    const cs = getComputedStyle(el);
    if (!seen.has(el) && cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) issues.push({ text, why: 'ellipsised' });
    seen.add(el);
    // pseudo-locale: any real words without the ⟦…⟧ marker skipped translation
    // (text marked with its own lang attribute — language names — is meant to stay as is)
    if (pseudo && !el.closest('#ui [lang]') && /[A-Za-z]{3,}/.test(text) && !/[⟦⟧]/.test(text) && !/[áéíóúñŕţšžçďĝĥĵķľṽŵẋýƀƒɱþǫ]/i.test(text)) issues.push({ text, why: 'not translated' });
  }
  return issues;
}

async function check(page: Page, label: string, locale: string): Promise<void> {
  await page.waitForTimeout(350); // let entry transitions finish
  const issues = await page.evaluate(findOverflow, locale === 'pseudo');
  expect(issues, `${label} [${locale}]:\n${issues.map((i) => `  “${i.text}” — ${i.why}`).join('\n')}`).toEqual([]);
}

async function open(page: Page, query: string): Promise<void> {
  await page.goto(`/?${query}`);
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30_000 });
}

for (const locale of LOCALES) {
  test(`menus fit [${locale}]`, async ({ page, baseURL }, info) => {
    test.skip(!PROJECTS.includes(info.project.name));
    const g = guard(page, baseURL!);
    await open(page, `lang=${locale}`);
    await check(page, 'title', locale);
    for (const screen of ['worlds', 'encyclopedia', 'badges', 'settings', 'research', 'daily', 'workshop']) {
      await open(page, `lang=${locale}&screen=${screen}`);
      await check(page, screen, locale);
    }
    // every codex tab
    await open(page, `lang=${locale}&screen=encyclopedia`);
    const tabs = page.getByRole('tab');
    for (let i = 1; i < (await tabs.count()); i++) {
      await tabs.nth(i).click();
      await check(page, `codex tab ${i}`, locale);
    }
    // map workshop editor
    await open(page, `lang=${locale}&screen=workshop`);
    await page.locator('.row.left .btn.green').click();
    await expect(page.locator('.ws-grid')).toBeVisible();
    await check(page, 'workshop editor', locale);
    // mission briefing
    await open(page, `lang=${locale}&brief=w1m2`);
    await expect(page.locator('.modal')).toBeVisible();
    await check(page, 'briefing', locale);
    expectClean(g);
  });

  test(`battle HUD fits [${locale}]`, async ({ page, baseURL }, info) => {
    test.skip(!PROJECTS.includes(info.project.name));
    const g = guard(page, baseURL!);
    await page.goto(`/?lang=${locale}&map=w1m1&diff=normal`);
    await waitForGame(page);
    // the first element pick opens on its own
    await expect(page.locator('.el-grid button').first()).toBeVisible();
    await check(page, 'element pick', locale);
    await page.locator('.el-grid button').first().click();
    await check(page, 'hud', locale);
    // build drawer (behind the Build button on short screens)
    const fab = page.locator('.build-fab button');
    if (await fab.isVisible()) await fab.click();
    await page.locator('.drawer button.card').first().click({ timeout: 10_000 });
    await check(page, 'build selected', locale);
    // place it, then open the tower panel (stat table with upgrade deltas)
    const c = await cellCenter(page, 6, 4);
    await tap(page, info, c.x, c.y);
    if (isTouch(info)) await page.locator('.confirm .btn.green').click();
    await expect.poll(async () => (await testState(page)).towers).toBe(1);
    await page.keyboard.press('Escape').catch(() => {});
    await tap(page, info, c.x, c.y);
    await expect(page.locator('.tpanel')).toBeVisible();
    await check(page, 'tower panel', locale);
    await page.keyboard.press('Escape').catch(() => {});
    await page.keyboard.press('p');
    await expect(page.getByRole('dialog')).toBeVisible();
    await check(page, 'pause', locale);
    expectClean(g);
  });
}

test('the language picker switches, remembers and follows the device', async ({ page, baseURL }, info) => {
  test.skip(info.project.name !== 'desktop');
  const g = guard(page, baseURL!);
  await open(page, 'screen=settings');
  await expect(page.locator('h2')).toHaveText('Settings');
  await page.locator('button[lang="fil"]').click();
  await expect(page.locator('h2')).toHaveText('Mga Setting');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fil');
  // saved: a fresh load comes back in Filipino
  await open(page, '');
  await expect(page.getByRole('button', { name: /Kampanya/ })).toBeVisible();
  // back to the device language (English in this browser)
  await open(page, 'screen=settings');
  await page.locator('.seg button').first().click();
  await expect(page.locator('h2')).toHaveText('Settings');
  expectClean(g);
});
