// Generates 1200×630 Open Graph images from the cover art and logos:
// public/og/<slug>.jpg for each game and public/og/site.jpg for the home page.
// Usage: npx tsx scripts/art/og.ts
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { games } from '../../src/data/games';
import { serve } from '../capture/lib';

const out = resolve(import.meta.dirname,'../../public/og'); mkdirSync(out,{ recursive: true });
const { server,origin } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200,height: 630 },deviceScaleFactor: 1 });
const font = `@font-face{font-family:Nunito;src:url(${origin}/og-font.woff2)}`;
const layers = (slug: string,list: string[]) => ['cover.svg',...list.map(name => `cover-${name}.svg`)].map(src => `<img src="${origin}/media/${slug}/${src}" style="position:absolute;inset:0;width:100%;height:100%">`).join('');
const brand = `<div style="position:absolute;left:28px;bottom:24px;padding:10px 18px;border-radius:999px;background:#fff;color:#16191F;font:800 24px Nunito">Ai Kids Games</div>`;

async function shoot(html: string,file: string) {
  await page.setContent(`<style>${font}body{margin:0}</style>${html}`);
  await page.waitForLoadState('networkidle'); await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: 'png' });
  await sharp(png).jpeg({ quality: 84,mozjpeg: true,progressive: true }).toFile(file);
  console.log(`og: ${file}`);
}

// The font is served from node_modules only for rendering these images.
server.removeAllListeners('request');
const { createReadStream,existsSync } = await import('node:fs');
server.on('request',(req,res) => {
  const url = new URL(req.url || '/','http://x');
  const file = url.pathname === '/og-font.woff2' ? resolve(import.meta.dirname,'../../node_modules/@fontsource/nunito/files/nunito-latin-800-normal.woff2') : resolve(import.meta.dirname,'../../public',`.${decodeURIComponent(url.pathname)}`);
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200,{ 'Content-Type': file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream','Access-Control-Allow-Origin': '*' });
  createReadStream(file).pipe(res);
});

for (const game of games) {
  // 16:9 cover is 1200×675; crop 45 px off the bottom. The logo sits in the cover's empty sky band.
  await shoot(`<div style="position:relative;width:1200px;height:630px;overflow:hidden"><div style="position:absolute;inset:0 0 auto 0;height:675px">${layers(game.slug,game.coverLayers)}</div>
    <img src="${origin}/media/${game.slug}/logo.svg" style="position:absolute;left:50%;top:22px;transform:translateX(-50%);max-width:640px;max-height:150px">${brand}</div>`,resolve(out,`${game.slug}.jpg`));
}
const tile = (slug: string,list: string[],x: number,y: number,w: number) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${w*9/16}px;border-radius:18px;overflow:hidden;box-shadow:0 6px 20px #16191f22">${layers(slug,list)}</div>`;
const [a,b,c,d,e] = games;
await shoot(`<div style="position:relative;width:1200px;height:630px;background:#F5F6F8;font-family:Nunito;color:#16191F">
  <div style="position:absolute;left:60px;top:200px;width:430px"><div style="font:800 60px/1.05 Nunito">Ai Kids Games</div><div style="margin-top:22px;font:700 27px/1.4 Nunito;color:#5A6272">Five original games.<br>No ads. No tracking.<br>No accounts.</div></div>
  ${tile(a.slug,a.coverLayers,520,48,320)}${tile(b.slug,b.coverLayers,856,48,320)}${tile(c.slug,c.coverLayers,520,246,320)}${tile(d.slug,d.coverLayers,856,246,320)}${tile(e.slug,e.coverLayers,688,444,320)}</div>`,resolve(out,'site.jpg'));
await browser.close(); server.close();
