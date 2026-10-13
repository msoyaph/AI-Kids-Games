import { expect,test } from './fixtures';
import { boot,clearSpaceDialogue,guard,instrument,startGame } from './games';
test('TheaBonk obtains pointer lock inside the actual play iframe',async ({ page },info) => {
  test.skip(info.project.name !== 'desktop','Pointer lock is for desktop mouse play.');
  await instrument(page); const checks = guard(page);
  const f = await startGame(page,'theabonk',false);
  await f.locator('canvas#game').press('Escape');
  await f.getByRole('button',{ name:'Settings',exact:true }).click();
  await f.locator('.setting').filter({ hasText:'Camera control' }).getByRole('button').click();
  await expect(f.locator('.setting').filter({ hasText:'Camera control' })).toContainText('Mouse lock');
  await f.getByRole('button',{ name:'Done',exact:true }).click();
  await f.getByRole('button',{ name:'Resume',exact:true }).click();
  await expect.poll(() => f.evaluate(() => document.pointerLockElement?.id)).toBe('game');
  await f.evaluate(() => document.exitPointerLock());
  expect(checks.errors).toEqual([]);
});
for (const slug of ['theabonk','light-crossing','space-sky','calex-cart']) test(`${slug} reads and responds to a simulated gamepad in the iframe`,async ({ page },info) => {
  test.skip(info.project.name !== 'desktop','Gamepad wiring check runs once per game; physical hardware still needs real-device QA.');
  await instrument(page); const checks = guard(page);
  await page.addInitScript(() => {
    const pad = { id:'QA Standard Pad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({ length:17 },() => ({ pressed:false,value:0,touched:false })),timestamp:0 };
    (window as any).__qaPad = pad;
    navigator.getGamepads = () => [pad as unknown as Gamepad];
  });
  const f = await startGame(page,slug,false);
  if (slug === 'space-sky') {
    await f.goto(f.url()+'?debug'); await f.getByTestId('btn-play').click(); await f.getByTestId('slot-play-0').click(); await clearSpaceDialogue(f,false);
  }
  await f.evaluate(() => { (window as any).__qaPad.axes[0] = 1; (window as any).__qaPad.timestamp = performance.now(); });
  await expect.poll(() => f.evaluate(slug => {
    const w = window as any;
    if (slug === 'theabonk') return w.__theabonk.input.usingGamepad ? 'gamepad' : '';
    if (slug === 'light-crossing') return w.__lc.input.lastDevice;
    if (slug === 'space-sky') return w.__spacesky.input.lastSource;
    return w.__calex.app.input.lastDevice;
  },slug)).toBe('gamepad');
  expect(checks.errors).toEqual([]); expect(checks.external).toEqual([]);
});
test('Space Sky touch joystick and boost work inside the site',async ({ page,context },info) => {
  test.skip(!info.project.use.hasTouch,'Touch check runs on tablet and phone.');
  await instrument(page); const checks = guard(page);
  const f = await startGame(page,'space-sky',true);
  await f.goto(f.url()+'?debug'); await f.getByTestId('btn-play').tap(); await f.getByTestId('slot-play-0').tap(); await clearSpaceDialogue(f,true);
  await f.waitForFunction(() => (window as any).__spacesky.game.sceneName === 'hub' && !(window as any).__spacesky.game.isSwitching);
  await f.evaluate(() => (window as any).__spacesky.game.go('flight',{ from:'earth',to:'earth' }));
  await expect.poll(() => f.evaluate(() => (window as any).__spacesky.game.sceneName)).toBe('flight');
  await clearSpaceDialogue(f,true);
  const x0 = await f.evaluate(() => (window as any).__spacesky.game.current.getShip().x);
  const zone = await f.getByTestId('joy-zone').boundingBox();
  const cdp = await context.newCDPSession(page);
  const x = zone!.x+zone!.width*.3,y = zone!.y+zone!.height*.5;
  await cdp.send('Input.dispatchTouchEvent',{ type:'touchStart',touchPoints:[{ x,y,id:1 }] });
  await cdp.send('Input.dispatchTouchEvent',{ type:'touchMove',touchPoints:[{ x:x+75,y,id:1 }] });
  await page.waitForTimeout(1400);
  await expect.poll(() => f.evaluate(() => (window as any).__spacesky.game.current.getShip().x)).toBeGreaterThan(x0+20);
  await cdp.send('Input.dispatchTouchEvent',{ type:'touchEnd',touchPoints:[] });
  await f.getByTestId('btn-boost').tap();
  expect(await f.evaluate(() => (window as any).__spacesky.input.lastSource)).toBe('touch');
  expect(checks.errors).toEqual([]); expect(checks.external).toEqual([]);
});
test('Light Crossing touch joystick moves the islander inside the site',async ({ page,context },info) => {
  test.skip(!info.project.use.hasTouch,'Touch check runs on tablet and phone.');
  await instrument(page); const checks = guard(page);
  const f = await startGame(page,'light-crossing',true);
  const position = () => f.evaluate(() => { const p = (window as any).__lc.game.state.player; return { x:p.x,z:p.z }; });
  const before = await position();
  // Light Crossing 2.0: drag anywhere on the play area and a stick appears under the finger.
  const zone = await f.locator('.tc-zone').boundingBox();
  const cdp = await context.newCDPSession(page);
  const x = zone!.x+zone!.width*.35,y = zone!.y+zone!.height*.6;
  await cdp.send('Input.dispatchTouchEvent',{ type:'touchStart',touchPoints:[{ x,y,id:2 }] });
  for (let step = 1; step <= 6; step++) await cdp.send('Input.dispatchTouchEvent',{ type:'touchMove',touchPoints:[{ x:x+15*step,y:y-6*step,id:2 }] });
  await page.waitForTimeout(1200);
  await cdp.send('Input.dispatchTouchEvent',{ type:'touchEnd',touchPoints:[] });
  const after = await position(); expect(Math.hypot(after.x-before.x,after.z-before.z)).toBeGreaterThan(.1);
  expect(checks.errors).toEqual([]); expect(checks.external).toEqual([]);
});
test('TheaBonk 2.0 glass touch controls move Thea and jump inside the site',async ({ page,context },info) => {
  test.skip(!info.project.use.hasTouch,'Touch check runs on tablet and phone.');
  await instrument(page); const checks = guard(page);
  const f = await startGame(page,'theabonk',true);
  // phones and tablets start in touch mode on the Tablet tier, with the glass stick and buttons
  expect(await f.evaluate(() => ({ touch: (window as any).__theabonk.input.touchMode,quality: (window as any).__theabonk.renderer.quality }))).toEqual({ touch: true,quality: 'tablet' });
  await expect(f.locator('.touch-ui')).toBeVisible();
  const position = () => f.evaluate(() => { const p = (window as any).__theabonk.world.player; return { x: p.x,z: p.z }; });
  const before = await position();
  const zone = (await f.locator('.tzone-stick').boundingBox())!;
  const cdp = await context.newCDPSession(page);
  const x = zone.x+zone.width*.4,y = zone.y+zone.height*.6;
  await cdp.send('Input.dispatchTouchEvent',{ type:'touchStart',touchPoints:[{ x,y,id:3 }] });
  for (let step = 1; step <= 6; step++) await cdp.send('Input.dispatchTouchEvent',{ type:'touchMove',touchPoints:[{ x,y:y-12*step,id:3 }] });
  await page.waitForTimeout(1200);
  await cdp.send('Input.dispatchTouchEvent',{ type:'touchEnd',touchPoints:[] });
  const after = await position(); expect(Math.hypot(after.x-before.x,after.z-before.z)).toBeGreaterThan(1);
  const jumps = await f.evaluate(() => (window as any).__theabonk.world.stats.jumps);
  await f.locator('.gbtn-jump').tap();
  await expect.poll(() => f.evaluate(() => (window as any).__theabonk.world.stats.jumps)).toBeGreaterThan(jumps);
  await page.screenshot({ path: `test-results/theabonk-touch-${info.project.name}.png` });
  expect(checks.errors).toEqual([]); expect(checks.external).toEqual([]);
});
