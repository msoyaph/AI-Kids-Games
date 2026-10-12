// Dev diagnostics: time update/render phases per frame on the dev server with software GL.
import { chromium } from '@playwright/test';
const url = process.argv[2] ?? 'http://localhost:5181/';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
await page.goto(url);
await page.waitForFunction(() => window.__cvdev && window.__cliffvalley?.ready, null, { timeout: 60000 });
await page.evaluate(() => window.__cliffvalley.scene('farmHarvest'));
const r = await page.evaluate(async () => {
  const g = window.__cvdev;
  const app = g.host.app;
  const t = { update: 0, view: 0, render: 0, frames: 0 };
  const origRender = app.render.bind(app);
  for (let i = 0; i < 40; i++) {
    const a = performance.now();
    g.update(1 / 60);
    const b = performance.now();
    g.view.update();
    const c = performance.now();
    origRender();
    const gl = app.renderer.gl;
    if (gl) gl.finish();
    const d = performance.now();
    t.update += b - a; t.view += c - b; t.render += d - c; t.frames++;
  }
  return { update: t.update / t.frames, view: t.view / t.frames, render: t.render / t.frames, sprites: g.view.sorted.children.length };
});
console.log(JSON.stringify(r));
await browser.close();
