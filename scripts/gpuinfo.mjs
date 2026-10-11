// Prints which WebGL backend headless Chromium uses with different flags.
import { chromium } from '@playwright/test';
const variants = [
  ['default', []],
  ['angle-metal', ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']],
  ['angle-gl', ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist']],
];
for (const [name, args] of variants) {
  for (const channel of [undefined, 'chromium']) {
    try {
      const b = await chromium.launch({ args, channel });
      const p = await b.newPage();
      const info = await p.evaluate(() => {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        if (!gl) return 'no webgl';
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      });
      console.log(name.padEnd(12), String(channel).padEnd(9), info);
      await b.close();
    } catch (e) {
      console.log(name, channel, 'failed', String(e).slice(0, 80));
    }
  }
}
