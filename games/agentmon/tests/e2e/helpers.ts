import type { Page } from '@playwright/test';

/** Collects console errors and any request that leaves the game's own origin (file:// and data: are fine). */
export function watch(page: Page) {
  const problems: string[] = [];
  page.on('pageerror', error => problems.push(`page error: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') problems.push(`console error: ${message.text()}`); });
  page.on('request', request => {
    const url = new URL(request.url());
    if (!['127.0.0.1:4246', ''].includes(url.host) && url.protocol !== 'data:' && url.protocol !== 'blob:') problems.push(`request to ${request.url()}`);
  });
  return problems;
}
