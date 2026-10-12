import { test as base, expect } from '@playwright/test';

/**
 * Shared Playwright `test`: with CALEX_TESTMODE=1 (set by CI) every page starts in the game's test mode —
 * Low quality and reduced effects — so software-rendered CI browsers stay quick.
 */
export const test = base.extend<{ calexTestMode: void }>({
  calexTestMode: [
    async ({ page }, use) => {
      if (process.env.CALEX_TESTMODE) await page.addInitScript(() => ((window as unknown as { __CALEX_TESTMODE: boolean }).__CALEX_TESTMODE = true));
      await use();
    },
    { auto: true },
  ],
});

export { expect };

/** Explicit waits stretch ×3 on CI, where WebGL is software-rendered. */
export function slow(ms: number): number {
  return process.env.CI ? ms * 3 : ms;
}

/** Frame-rate floor for "it renders smoothly enough": real GPUs locally; CI's software GL only has to draw at all. */
export const MIN_FPS = process.env.CI ? 1 : 10;
