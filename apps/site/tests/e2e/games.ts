import { expect,type Frame,type Locator,type Page } from '@playwright/test';
export const launchGames = [
  { slug: 'cliff-valley',title: 'Cliff Valley',key: 'cliffvalley.slot.1',prefix: /^cliffvalley\./ }, // gitleaks:allow (a storage key name, not a secret)
  { slug: 'light-crossing',title: 'Light Crossing',key: 'lightcrossing.slot0',prefix: /^lightcrossing\./ },
  { slug: 'theabonk',title: 'TheaBonk',key: 'theabonk.save',prefix: /^theabonk\.save$|^__theabonk_probe__$/ },
  { slug: 'vanex-defense',title: 'Vanex Defense',key: 'vanex-defense-save',prefix: /^vanex-defense-|^__vanex_probe__$/ },
  { slug: 'space-sky',title: 'Space Sky',key: 'spacesky.slot.0',prefix: /^spacesky\.|^__spacesky_probe__$/ },
  { slug: 'calex-cart',title: 'Calex Cart',key: 'calexcart.slot.1',prefix: /^calexcart\./ },
  { slug: 'tuck-pop',title: 'Tuck Pop',key: 'tuckpop.run',prefix: /^tuckpop\./ },
  { slug: 'agentmon',title: 'Agentmon',key: 'agentmon.slot1',prefix: /^agentmon\./ },
  { slug: 'shooberry',title: 'Shooberry',key: 'shooberry.save',prefix: /^shooberry\./ }
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
/** Records page errors and every request to another origin. `allow` adds exactly one more: a community game's play origin. */
export function guard(page: Page,origin = new URL(process.env.AIKG_BASE_URL || 'http://127.0.0.1:4190').origin,allow?: string) {
  const errors: string[] = [],external: string[] = [];
  page.on('pageerror',e => errors.push(e.message));
  page.on('console',m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request',r => { const url = r.url(); if (/^https?:/.test(url) && new URL(url).origin !== origin && new URL(url).origin !== allow) external.push(url); });
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
/** A computer-only game on a touch-only device explains first (src/lib/devices.ts); test runs press on. */
export async function pastTouchGate(page: Page) {
  await expect(page.locator('.touch-gate, .game-loading, iframe').first()).toBeAttached();
  const gate = page.getByRole('button',{ name: 'I have a keyboard or controller' });
  if (await gate.isVisible()) await gate.click();
}
export async function boot(page: Page,slug: string) {
  const size = page.viewportSize();
  // These finished games intentionally require landscape on touch screens.
  if (size && size.height > size.width && ['space-sky','calex-cart','theabonk','shooberry'].includes(slug) && await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) await page.setViewportSize({ width:size.height,height:size.width });
  await page.goto(`/play/${slug}`);
  await pastTouchGate(page);
  await expect(page.locator('.game-loading')).toBeHidden({ timeout: 30000 });
  // first play on a phone or tablet asks "Play fullscreen?" once (tests/e2e/fullscreen.spec.ts covers it)
  const tip = page.getByRole('dialog',{ name: 'Play fullscreen?' });
  if (await tip.isVisible()) await tip.getByRole('button',{ name: 'Not now' }).click();
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
  } else if (slug === 'cliff-valley') {
    await f.waitForFunction(() => (window as any).__cliffvalley?.ready === true,null,{ timeout: 90000 });
    await press(f.getByRole('button',{ name:'Start Playing' }),touch);
    await checkAudio(f);
    await press(f.getByRole('button',{ name:'New' }).first(),touch);
    await f.getByLabel('Farmer nickname').fill('LaunchTest');
    await f.getByLabel('Farm name').fill('Sunny');
    await f.getByLabel('Pet name').fill('Biscuit');
    await press(f.getByRole('button',{ name:'Start farming!' }),touch);
    await f.waitForFunction(() => (window as any).__cliffvalley.info?.mode === 'play',null,{ timeout: 60000 });
    await f.evaluate(() => (window as any).__cliffvalley.sleep());
    await f.waitForFunction(() => (window as any).__cliffvalley.info?.day === 1,null,{ timeout: 60000 });
  } else if (slug === 'light-crossing') {
    await press(f.getByRole('button',{ name:/Start|Continue/ }).first(),touch);
    await checkAudio(f);
    await expect(f.getByText(/Saving is unavailable/)).toHaveCount(0);
    await press(f.getByText('New Game').first(),touch);
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
    await press(f.getByRole('button',{ name:/Campaign/ }),touch);
    await press(f.getByRole('button',{ name:'Skip',exact:true }),touch);
    await press(f.getByRole('button',{ name:'Breach Point',exact:true }),touch);
    await press(f.getByRole('button',{ name:/Deploy/ }),touch);
    await f.waitForFunction(() => !!(window as any).__vanexTest);
    await press(f.getByRole('button',{ name:'Water',exact:true }),touch);
    const drawer = f.getByRole('button',{ name:'Build',exact:true });
    if (await drawer.isVisible()) await press(drawer,touch);
    await press(f.getByRole('button',{ name:/Bolt Turret/ }).first(),touch);
    const point = await f.evaluate(() => (window as any).__vanexTest.cellCenter(6,4));
    const box = await page.locator('iframe').boundingBox();
    if (touch) { await page.touchscreen.tap(box!.x+point.x,box!.y+point.y); await press(f.getByRole('button',{ name:'Build here' }),true); }
    else await page.mouse.click(box!.x+point.x,box!.y+point.y);
    await expect.poll(() => f.evaluate(() => (window as any).__vanexTest.state().towers)).toBe(1);
    const go = f.getByRole('button',{ name:'Send next wave' });
    // GO continuously pulses: it has no stable animation frame to wait for.
    await expect(go).toBeVisible(); await expect(go).toBeEnabled();
    if (touch) await go.tap({ force: true }); else await go.click({ force: true });
  } else if (slug === 'tuck-pop') {
    await press(f.locator('#classic'),touch);
    await checkAudio(f);
    await f.waitForFunction(() => (window as any).__tuckpop.snapshot().screen === 'play');
    if (touch) {
      // tap a piece, then tap the board (frame coordinates plus the iframe's place on the page)
      const s = await f.evaluate(() => (window as any).__tuckpop.snapshot().layout);
      const box = await page.locator('iframe').boundingBox();
      await page.touchscreen.tap(box!.x+s.slots[0].x+s.slots[0].w/2,box!.y+s.slots[0].y+s.slots[0].h/2);
      await page.touchscreen.tap(box!.x+s.board.x+s.board.w/2,box!.y+s.board.y+s.board.h/2);
    } else { await f.locator('body').press('Digit1'); await f.locator('body').press('Enter'); }
    await expect.poll(() => f.evaluate(() => (window as any).__tuckpop.snapshot().moves)).toBe(1);
  } else if (slug === 'agentmon') {
    // a new adventure in slot 1: your Field Agent, a name, how tricky; it saves as it starts
    await press(f.getByRole('button',{ name:'Play',exact:true }),touch);
    await checkAudio(f);
    await press(f.getByRole('button',{ name:'New adventure' }).first(),touch);
    await press(f.getByRole('button',{ name:'Next',exact:true }),touch);
    await press(f.getByRole('button',{ name:/^I'm / }).first(),touch);
    await press(f.getByRole('button',{ name:'Start!' }),touch);
    await f.waitForFunction(() => (window as any).__agentmon.snapshot().map === 'home',null,{ timeout: 30000 });
  } else if (slug === 'shooberry') {
    // Adventure level 1: the seeds, the tips (saved as seen), then the first card planted in the open lane
    await press(f.getByRole('button',{ name:'Play',exact:true }),touch);
    await checkAudio(f);
    await press(f.getByRole('button',{ name:'Level 1, 0 of 3 stars' }),touch);
    await press(f.getByRole('button',{ name:"Let's grow!" }),touch);
    for (let i = 0; i < 4 && await f.evaluate(() => (window as any).__shooberry.snapshot().screen) === 'tip'; i++) await press(f.getByRole('button',{ name:'Got it!' }),touch);
    await f.waitForFunction(() => (window as any).__shooberry.snapshot().screen === 'play');
    if (touch) {
      // tap the card, then the tile (frame coordinates plus the iframe's place on the page)
      const s = await f.evaluate(() => (window as any).__shooberry.snapshot());
      const box = await page.locator('iframe').boundingBox();
      const card = s.cards[0],tile = s.tiles.find((t: { lane: number; col: number }) => t.lane === 2 && t.col === 1);
      await page.touchscreen.tap(box!.x+card.x+card.w/2,box!.y+card.y+card.h/2);
      await page.touchscreen.tap(box!.x+tile.x,box!.y+tile.y);
    } else { await f.locator('body').press('Digit1'); await f.locator('body').press('Enter'); }
    await expect.poll(() => f.evaluate(() => (window as any).__shooberry.snapshot().plants.length)).toBe(1);
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
    // the first race on a device explains its controls first
    await expect(f.locator('.controls-card')).toBeVisible();
    await press(f.locator('.ui-root [data-nav]').filter({ hasText:/Got it/ }).first(),touch);
    await expect(f.locator('.hud')).toBeVisible();
    await f.waitForFunction(() => (window as any).__calex.app.session?.world.phase === 'race');
    if (touch) {
      await expect(f.locator('.touch-controls')).toBeVisible();
      // Calex Cart 0.2's glass controller: each control is [data-ctl=<id>]; real touches through CDP.
      const cdp = await page.context().newCDPSession(page);
      const centre = async (id: string) => { const box = await f.locator(`.touch-controls [data-ctl="${id}"]`).boundingBox(); return { x:box!.x+box!.width/2,y:box!.y+box!.height/2 }; };
      for (const field of ['drift','brake','item']) {
        await cdp.send('Input.dispatchTouchEvent',{ type:'touchStart',touchPoints:[{ ...await centre(field),id:4 }] });
        await expect.poll(() => f.evaluate(field => !!(window as any).__calex.app.input.touch.state[field],field)).toBe(true);
        await cdp.send('Input.dispatchTouchEvent',{ type:'touchEnd',touchPoints:[] });
      }
      // With the beginner assist the kart drives itself and there is no GO button; otherwise hold GO.
      const go = f.locator('.touch-controls [data-ctl="accel"]');
      const holding = await go.isVisible();
      if (holding) await cdp.send('Input.dispatchTouchEvent',{ type:'touchStart',touchPoints:[{ ...await centre('accel'),id:5 }] });
      await expect.poll(() => f.evaluate(() => (window as any).__calex.app.session.world.karts[0].progress),{ timeout:20000 }).toBeGreaterThan(2);
      if (holding) await cdp.send('Input.dispatchTouchEvent',{ type:'touchEnd',touchPoints:[] });
      await cdp.detach();
    }
    else {
      await f.locator('canvas').first().press('ArrowUp',{ delay: 1200 });
      await expect.poll(() => f.evaluate(() => (window as any).__calex.app.session.world.karts[0].progress),{ timeout:15000 }).toBeGreaterThan(2);
    }
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
  } else if (slug === 'cliff-valley') {
    await f.waitForFunction(() => (window as any).__cliffvalley?.ready === true,null,{ timeout: 90000 });
    await f.getByRole('button',{ name:/Continue — LaunchTest/ }).click();
    await f.waitForFunction(() => (window as any).__cliffvalley.info?.mode === 'play',null,{ timeout: 60000 });
    expect(await f.evaluate(() => (window as any).__cliffvalley.info.day)).toBe(1);
  } else if (slug === 'light-crossing') {
    await f.getByRole('button',{ name:/Start|Continue/ }).first().click();
    await expect(f.locator('.slotcard').first()).toContainText('LaunchTest');
    await f.getByRole('button',{ name:'Continue',exact:true }).first().click();
    await expect.poll(() => f.evaluate(() => (window as any).__lc.game?.state.player.name)).toBe('LaunchTest');
    expect(await f.evaluate(() => (window as any).__lc.saves.storage.persistent)).toBe(true);
  } else if (slug === 'vanex-defense') {
    await f.getByRole('button',{ name:/Settings/ }).click();
    await expect(f.locator('.setting').filter({ hasText:'Screen shake' }).getByRole('radio',{ name:'Off' })).toHaveAttribute('aria-checked','true');
  } else if (slug === 'tuck-pop') {
    await f.getByRole('button',{ name:/Continue/ }).click();
    await f.waitForFunction(() => (window as any).__tuckpop.snapshot().screen === 'play');
    expect(await f.evaluate(() => (window as any).__tuckpop.snapshot().moves)).toBe(1);
    expect(await f.evaluate(() => (window as any).__tuckpop.snapshot().persistent)).toBe(true);
  } else if (slug === 'agentmon') {
    await f.getByRole('button',{ name:'Play',exact:true }).click();
    await expect(f.locator('.slot').first()).toContainText('friends');
    await expect(f.getByText("This browser can't save")).toHaveCount(0);
    await f.locator('.slot').first().getByRole('button',{ name:'Continue' }).click();
    await f.waitForFunction(() => (window as any).__agentmon.snapshot().map === 'home',null,{ timeout: 30000 });
  } else if (slug === 'shooberry') {
    // the seeds and the tips were saved: level 1 remembers the seeds and skips the tips it has shown
    await f.getByRole('button',{ name:'Play',exact:true }).click();
    await expect(f.getByText("This browser can't save")).toBeHidden();
    await f.getByRole('button',{ name:'Level 1, 0 of 3 stars' }).click();
    await f.getByRole('button',{ name:"Let's grow!" }).click();
    await f.waitForFunction(() => (window as any).__shooberry.snapshot().screen === 'play');
    expect(await f.evaluate(() => (window as any).__shooberry.snapshot().persistent)).toBe(true);
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
