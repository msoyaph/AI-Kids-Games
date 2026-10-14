import { expect,test } from './fixtures';
import { mkdirSync } from 'node:fs';
import { gridSpans } from '../../src/lib/grid';

// Temporary mock entries rendered with the site's real CSS and grid rule: the balanced grid
// must give full rows with no gaps and no lonely last card for any count.
for (const count of [1,4,5,6,7,8,9,10,12]) test(`balanced grid with ${count} games`,async ({ page },info) => {
  await page.goto('/about'); await page.locator('main h1').waitFor();
  const spans = gridSpans(count);
  await page.evaluate(({ spans }) => {
    const main = document.querySelector('main')!;
    main.innerHTML = `<div class="container page"><div class="game-grid" id="mock">${spans.map((span,i) => `<article class="card${span.solo ? ' solo' : ''}" style="--span-lg:${span.lg};--span-md:${span.md}"><div class="card-media" style="background:hsl(${i*47} 60% 70%)"><span class="card-badge">Ages ${i+3}+</span></div><div class="card-text"><h3 class="card-title">Mock game ${i+1}</h3><p class="card-meta">Adventure</p></div></article>`).join('')}</div></div>`;
  },{ spans });
  const grid = page.locator('#mock'); const gridBox = (await grid.boundingBox())!;
  const boxes = await grid.locator('.card').evaluateAll(cards => cards.map(card => { const r = card.getBoundingClientRect(); return { x: r.x,y: r.y,w: r.width }; }));
  const rows: { x: number; y: number; w: number }[][] = [];
  for (const box of boxes) { const row = rows.find(r => Math.abs(r[0].y-box.y) < 2); if (row) row.push(box); else rows.push([box]); }
  const sizes = rows.map(row => row.length);
  if (count === 1) { expect(Math.abs(boxes[0].x+boxes[0].w/2-(gridBox.x+gridBox.width/2))).toBeLessThan(2); }
  else for (const row of rows) {
    const left = Math.min(...row.map(b => b.x)), right = Math.max(...row.map(b => b.x+b.w));
    expect(Math.abs(left-gridBox.x),`row starts at the grid edge (${sizes})`).toBeLessThan(2);
    expect(Math.abs(right-(gridBox.x+gridBox.width)),`row fills the grid (${sizes})`).toBeLessThan(2);
  }
  // Wider rows first, and the last row is never smaller than an earlier one.
  for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeGreaterThanOrEqual(sizes[i-1]);
  mkdirSync('test-results/grid',{ recursive: true });
  await grid.screenshot({ path: `test-results/grid/grid-${count}-${info.project.name}.png` });
});
