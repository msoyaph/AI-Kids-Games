import { expect,type Frame,type Locator,type Page } from '@playwright/test';
export const launchGames = [
  { slug: 'light-crossing',title: 'Light Crossing',key: 'lightcrossing.slot0',prefix: /^lightcrossing\.|^__lc_probe__$/ },
  { slug: 'theabonk',title: 'TheaBonk',key: 'theabonk.save',prefix: /^theabonk\.save$|^__theabonk_probe__$/ },
  { slug: 'vanex-defense',title: 'Vanex Defense',key: 'vanex-defense-save',prefix: /^vanex-defense-save$|^__vanex_probe__$/ },
  { slug: 'space-sky',title: 'Space Sky',key: 'spacesky.slot.0',prefix: /^spacesky\.|^__spacesky_probe__$/ },
  { slug: 'calex-cart',title: 'Calex Cart',key: 'calexcart.slot.1',prefix: /^calexcart\.|^__calex_probe__$/ }
];
export async function press(locator: Locator,touch: boolean) { if (touch) await locator.tap(); else await locator.click(); }
export async function instrument(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__qaAudio = [];
    const AC = window.AudioContext;
    if (AC) w.AudioContext = new Proxy(AC,{ construct(Target,args) { const ctx = Reflect.construct(Target,args); w.__qaAudio.push(ctx); return ctx; } });
    w.__qaStorage = [];
    for (const method of ['getItem','setItem','removeItem','clear'] as const) {
      const original = Storage.prototype[method];
      (Storage.prototype as any)[method] = function(...args: any[]) { w.__qaStorage.push({ method,key: args[0] ?? '<all>' }); return Reflect.apply(original,this,args); };
    }
  });
}
export function guard(page: Page,origin = 'http://127.0.0.1:4190') {
  const errors: string[] = [],external: string[] = [];
  page.on('pageerror',e => errors.push(e.message));
  page.on('console',m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request',r => { const url = r.url(); if (/^https?:/.test(url) && new URL(url).origin !== origin) external.push(url); });
  return { errors,external };
}
export async function gameFrame(page: Page,slug: string): Promise<Frame> {
  await expect(page.locator('iframe')).toBeVisible();
  const handle = await page.locator('iframe').elementHandle();
  const frame = await handle!.contentFrame();
  await frame!.waitForURL(new RegExp(`/games/${slug}/`));
  if (!frame) throw new Error(`Missing ${slug} frame`);
  return frame;
}
export async function boot(page: Page,slug: string) {
  const size = page.viewportSize();
  // These finished games intentionally require landscape on touch screens.
  if (size && size.height > size.width && ['space-sky','calex-cart'].includes(slug) && await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) await page.setViewportSize({ width:size.height,height:size.width });
  await page.goto(`/play/${slug}`);
  await expect(page.locator('.game-loading')).toBeHidden({ timeout: 30000 });
  const f = await gameFrame(page,slug);
  await expect(f.locator('canvas').first()).toBeAttached({ timeout: 30000 });
  if (await page.getByRole('button',{ name: 'Play anyway' }).isVisible()) await page.getByRole('button',{ name: 'Play anyway' }).click();
  return f;
}
export async function clearSpaceDialogue(f: Frame,touch: boolean) {
  for (let i=0;i<35;i++) {
    const d = f.getByTestId('dialogue');
    if (!await d.isVisible()) { await f.waitForTimeout(150); if (!await d.isVisible()) break; }
    await press(d,touch); await f.waitForTimeout(90);
  }
  for (const id of ['btn-popup-ok','btn-badge-ok','btn-tip-ok']) {
    const button = f.getByTestId(id); if (await button.isVisible()) await press(button,touch);
  }
}
async function checkAudio(f: Frame) { await expect.poll(() => f.evaluate(() => (window as any).__qaAudio?.some((ctx: AudioContext) => ctx.state === 'running'))).toBe(true); }
export async function startGame(page: Page,slug: string,touch: boolean): Promise<Frame> {
  const f = await boot(page,slug);
  if (slug === 'theabonk') {
    await press(f.getByRole('button',{ name:'Settings',exact:true }),touch);
    await checkAudio(f);
    // A real settings save through the UI, rather than a synthetic localStorage write.
    const shake = f.locator('.setting').filter({ hasText: 'Screen shake' });
    const button = shake.getByRole('button');
    if (await button.innerText() === 'On') await press(button,touch);
    await press(f.getByRole('button',{ name:'Done',exact:true }),touch);
    await press(f.getByRole('button',{ name:'Play',exact:true }),touch);
    await press(f.getByRole('button',{ name:'Start run',exact:true }),touch);
    await expect.poll(() => f.evaluate(() => !!(window as any).__theabonk.world)).toBe(true);
  } else if (slug === 'light-crossing') {
    await press(f.getByRole('button',{ name:'Start',exact:true }),touch);
    await checkAudio(f);
    await expect(f.getByText(/Saving is unavailable/)).toHaveCount(0);
    await press(f.getByRole('button',{ name:/New Game/ }).first(),touch);
    await f.locator('input').first().fill('LaunchTest');
    await press(f.getByRole('button',{ name:'Set sail!' }),touch);
    await expect.poll(() => f.evaluate(() => !!(window as any).__lc.game)).toBe(true);
    // The opening story is a timed sequence; use its own skip button if offered.
    const skip = f.getByRole('button',{ name:/Skip/ });
    if (await skip.isVisible()) await press(skip,touch);
    for (let i=0;i<20;i++) { const dialogue = f.locator('.dlg'); if (!await dialogue.isVisible()) break; await press(dialogue,touch); await f.waitForTimeout(80); }
  } else if (slug === 'vanex-defense') {
    await press(f.getByRole('button',{ name:/Settings/ }),touch);
    await checkAudio(f);
    await press(f.locator('.setting').filter({ hasText:'Screen shake' }).getByRole('radio',{ name:'Off' }),touch);
    await press(f.getByRole('button',{ name:'Back',exact:true }),touch);
    await press(f.getByRole('button',{ name:/Play/ }),touch);
    await press(f.getByRole('button',{ name:'Skip',exact:true }),touch);
    await press(f.getByRole('button',{ name:'Daisy Field',exact:true }),touch);
    await press(f.getByRole('button',{ name:/Play!/ }),touch);
    await f.waitForFunction(() => !!(window as any).__vanexTest);
    await press(f.getByRole('button',{ name:'Water',exact:true }),touch);
    const drawer = f.getByRole('button',{ name:'Build',exact:true });
    if (await drawer.isVisible()) await press(drawer,touch);
    await press(f.getByRole('button',{ name:/Arrow Post/ }).first(),touch);
    const point = await f.evaluate(() => (window as any).__vanexTest.cellCenter(6,4));
    const box = await page.locator('iframe').boundingBox();
    if (touch) { await page.touchscreen.tap(box!.x+point.x,box!.y+point.y); await press(f.getByRole('button',{ name:'Build here' }),true); }
    else await page.mouse.click(box!.x+point.x,box!.y+point.y);
    await expect.poll(() => f.evaluate(() => (window as any).__vanexTest.state().towers)).toBe(1);
    const go = f.getByRole('button',{ name:'Send next wave' });
    // GO continuously pulses: it has no stable animation frame to wait for.
    await expect(go).toBeVisible(); await expect(go).toBeEnabled();
    if (touch) await go.tap({ force: true }); else await go.click({ force: true });
  } else if (slug === 'space-sky') {
    await press(f.getByTestId('btn-play'),touch);
    await checkAudio(f);
    await press(f.getByTestId('slot-0'),touch);
    await f.getByTestId('name-input').fill('LaunchTest');
    await press(f.getByTestId('btn-start'),touch);
    await expect(f.getByTestId('hub-banner')).toBeVisible();
    await clearSpaceDialogue(f,touch);
    await press(f.getByTestId('btn-go'),touch);
    await expect(f.getByTestId('part-cards')).toBeVisible();
    await clearSpaceDialogue(f,touch);
  } else {
    await press(f.locator('.title-screen'),touch);
    await checkAudio(f);
    await press(f.getByRole('button',{ name:'New Game',exact:true }).first(),touch);
    await f.getByRole('textbox',{ name:'Racer name' }).fill('LaunchTest');
    await press(f.getByRole('button',{ name:"Let's go!" }),touch);
    await press(f.locator('.ui-root [data-nav]').filter({ hasText:/^Versus/ }).first(),touch);
    await press(f.locator('.ui-root [data-nav]').filter({ hasText:/^1 Player/ }).first(),touch);
    await press(f.locator('.ui-root [data-nav]').filter({ hasText:/^Rookie/ }).first(),touch);
    await press(f.locator('.ui-root [data-nav]').filter({ hasText:'Calex' }).first(),touch);
    await press(f.locator('.ui-root [data-nav]').filter({ hasText:/Next/ }).first(),touch);
    await press(f.locator('.ui-root [data-nav]').filter({ hasText:'Seashell Boardwalk' }).first(),touch);
    await expect(f.locator('.hud')).toBeVisible();
    await f.waitForFunction(() => (window as any).__calex.app.session?.world.phase === 'race');
    if (touch) {
      await expect(f.locator('.touch-controls')).toBeVisible();
      const cdp = await page.context().newCDPSession(page);
      for (const [selector,field] of [['.tc-right','steer'],['.tc-drift','drift'],['.tc-brake','brake'],['.tc-item','item']]) {
        const box = await f.locator(selector).boundingBox();
        await cdp.send('Input.dispatchTouchEvent',{ type:'touchStart',touchPoints:[{ x:box!.x+box!.width/2,y:box!.y+box!.height/2,id:4 }] });
        await expect.poll(() => f.evaluate(field => !!(window as any).__calex.app.input.touch.state[field],field)).toBe(true);
        await cdp.send('Input.dispatchTouchEvent',{ type:'touchEnd',touchPoints:[] });
      }
      await cdp.detach();
    }
    else await f.locator('canvas').first().press('ArrowUp',{ delay: 1200 });
    await expect.poll(() => f.evaluate(() => (window as any).__calex.app.session.world.karts[0].progress),{ timeout:15000 }).toBeGreaterThan(2);
  }
  await expect(f.locator('canvas').first()).toBeVisible();
  await checkAudio(f);
  return f;
}
export async function verifySaveReload(f: Frame,slug: string) {
  const g = launchGames.find(g => g.slug === slug)!;
  await expect.poll(() => f.evaluate(key => localStorage.getItem(key),g.key)).not.toBeNull();
  await f.goto(f.url());
  if (slug === 'theabonk') {
    await f.waitForFunction(() => !!(window as any).__theabonk);
    expect(await f.evaluate(() => (window as any).__theabonk.save.data.settings.screenShake)).toBe(false);
    expect(await f.evaluate(() => (window as any).__theabonk.save.persistent)).toBe(true);
  } else if (slug === 'light-crossing') {
    await f.getByRole('button',{ name:/Start|Continue/,exact:true }).click();
    await expect(f.locator('.slotcard').first()).toContainText('LaunchTest');
    await f.getByRole('button',{ name:'Continue',exact:true }).first().click();
    await expect.poll(() => f.evaluate(() => (window as any).__lc.game?.state.player.name)).toBe('LaunchTest');
    expect(await f.evaluate(() => (window as any).__lc.saves.storage.persistent)).toBe(true);
  } else if (slug === 'vanex-defense') {
    await f.getByRole('button',{ name:/Settings/ }).click();
    await expect(f.locator('.setting').filter({ hasText:'Screen shake' }).getByRole('radio',{ name:'Off' })).toHaveAttribute('aria-checked','true');
  } else if (slug === 'space-sky') {
    await f.getByTestId('btn-play').click();
    await expect(f.getByTestId('slot-0')).toContainText('LaunchTest');
    await f.getByTestId('slot-play-0').click();
    await clearSpaceDialogue(f,false);
    await expect(f.getByTestId('hub-banner')).toContainText('Lounge');
  } else {
    await f.locator('.title-screen').click();
    await expect(f.locator('.panel').first()).toContainText('LaunchTest');
    await f.getByRole('button',{ name:'Continue',exact:true }).first().click();
    expect(await f.evaluate(() => (window as any).__calex.app.save.name)).toBe('LaunchTest');
  }
}
