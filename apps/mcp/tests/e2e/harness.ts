// Opening the widget in the local host harness, and watching for problems in every frame.
import { expect,type Frame,type Page } from '@playwright/test';

export const ORIGINS = ['127.0.0.1:4330','127.0.0.1:4331','127.0.0.1:4332','127.0.0.1:4333'];
/**
 * Known, harmless notices from inside the verified games (they can't be fixed without a new build):
 * - Agentmon's data: fonts: the host CSP has no font-src data:, so its text falls back to a system font.
 * - Calex Cart's tilt sensors: no accelerometer permission in assistant frames; touch and keys steer.
 * - WebKit only: Space Sky and Vanex Defense call the Fullscreen API themselves and leave the rejected
 *   promise unhandled (assistant frames have no fullscreen permission; the host's fullscreen mode is used).
 */
export const KNOWN = [/Content Security Policy directive: "font-src|does not appear in the font-src directive|downloadable font: font load failed .*content blocked/,/Permissions policy violation: (accelerometer|gyroscope|magnetometer) is not allowed/,/Permission policy 'Fullscreen' check failed/];
export type Harness = { links: string[]; messages: string[]; modes: string[]; reads: string[]; calls: string[]; ready: boolean; error?: string; sizes: number[] };

/** Console errors, uncaught errors and any request to an origin outside the harness, from every frame. */
export function watch(page: Page,{ allow = [] as RegExp[] } = {}) {
  const problems: string[] = [];
  page.on('pageerror',error => { if (!allow.some(pattern => pattern.test(error.stack ?? error.message))) problems.push(`page error: ${error.stack ?? error.message}`); });
  page.on('console',message => { if (message.type() === 'error' && !allow.some(pattern => pattern.test(message.text()))) problems.push(`console error: ${message.text()}`); });
  page.on('request',request => {
    const url = new URL(request.url());
    if (['data:','blob:','about:'].includes(url.protocol)) return;
    if (!ORIGINS.includes(url.host)) problems.push(`request to ${request.url()}`);
  });
  return problems;
}

export async function open(page: Page,query: { profile?: string; tool: string; args: object; theme?: string; touch?: boolean; width?: number }) {
  const params = new URLSearchParams({ profile: query.profile ?? 'claude',tool: query.tool,args: JSON.stringify(query.args),theme: query.theme ?? 'light',touch: query.touch ? '1' : '0',width: String(query.width ?? 720) });
  await page.goto(`http://127.0.0.1:4330/?${params}`);
  await expect.poll(() => state(page).then(s => s.ready || s.error)).toBeTruthy();
  expect((await state(page)).error).toBeUndefined();
  return page.frameLocator('#proxy').frameLocator('iframe[title="Widget"]');
}
export const state = (page: Page) => page.evaluate(() => (window as unknown as { __harness: Harness }).__harness);

/** The game's own frame: the srcdoc inside the widget (itself a srcdoc inside the sandbox proxy). */
export async function gameFrame(page: Page): Promise<Frame> {
  let found: Frame | undefined;
  await expect.poll(() => { found = page.frames().find(frame => frame.parentFrame()?.parentFrame()?.url().endsWith('/sandbox.html')); return !!found && found.url() === 'about:srcdoc'; },{ timeout: 30_000 }).toBe(true);
  return found!;
}
export const tamper = (on: boolean) => fetch(`http://127.0.0.1:4332/__tamper?on=${on ? 1 : 0}`,{ method: 'POST' });
