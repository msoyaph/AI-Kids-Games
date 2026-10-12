import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';

/**
 * In CI (software GL, slow shared CPUs) every page reports a 2-core device, so
 * Auto quality picks the Low tier (smaller atlases, fewer effects) — the same
 * path a low-end phone takes. Locally nothing changes.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    if (process.env.CI) await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { get: () => 2, configurable: true }));
    await use(page);
  },
});
