// Calex Cart and Light Crossing call navigator.getGamepads() every frame without a try/catch. Assistant
// frames get no `gamepad` permission (MCP Apps has none to ask for), and the Gamepad spec lets the call
// throw then, which would stop their frame loops. This plays every game that runs in assistants in a
// host-like frame (the harness's claude profile: a cross-origin sandbox proxy with allow="") and fails
// on any uncaught error or gamepad error. The known, harmless notices (harness.ts KNOWN) are reported.
import { expect,test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Catalog } from '../../src/data/types';
import { gameFrame,KNOWN,open,state,watch } from './harness';

const catalog = JSON.parse(readFileSync(resolve(import.meta.dirname,'../../src/data/catalog.generated.json'),'utf8')) as Catalog;

for (const game of catalog.games.filter(entry => entry.embed !== 'site')) {
  test(`${game.title} keeps running without gamepad access`,async ({ page },info) => {
    const notices: string[] = [];
    page.on('console',message => { if (message.type() === 'error' && KNOWN.some(pattern => pattern.test(message.text()))) notices.push(message.text().slice(0,90)); });
    page.on('pageerror',error => { if (KNOWN.some(pattern => pattern.test(error.stack ?? error.message))) notices.push((error.stack ?? error.message).split('\n').find(text => KNOWN.some(pattern => pattern.test(text)))?.trim().slice(0,90) ?? error.message); });
    const problems = watch(page,{ allow: KNOWN });
    const widget = await open(page,{ tool: 'play_game',args: { game: game.slug } });
    await widget.getByRole('button',{ name: `Start ${game.title}` }).click();
    if (game.embed === 'fullscreen') await expect.poll(async () => (await state(page)).modes).toEqual(['fullscreen']);
    const frame = await gameFrame(page);
    await expect.poll(() => frame.evaluate(() => !!document.querySelector('canvas')),{ timeout: 45_000 }).toBe(true);
    const gamepads = await frame.evaluate(() => { try { navigator.getGamepads(); return 'getGamepads() works'; } catch (error) { return `getGamepads() throws ${(error as Error).name}`; } });
    await page.waitForTimeout(8_000);
    console.log(`${info.project.name} · ${game.title}: ${gamepads}; known notices: ${[...new Set(notices)].length ? [...new Set(notices)].join(' | ') : 'none'}`);
    expect(problems).toEqual([]);
  });
}
