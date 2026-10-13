// Generates 1200×630 Open Graph images from the cover art and logos:
// public/og/<slug>.jpg for each game (with the brand mark) and public/og/site.jpg for the home page
// (the owner's wordmark, docs/brand/wordmark.png, from scripts/art/icons.ts). Run icons.ts first.
// Usage: npx tsx scripts/art/og.ts
import { mkdirSync,readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { games,type Game } from '../../src/data/games';
import { BRAND,TAGLINE } from '../../src/data/site';
import { mediaFor } from '../../src/lib/media';
import { serve } from '../capture/lib';

const out = resolve(import.meta.dirname,'../../public/og'); mkdirSync(out,{ recursive: true });
const { server,origin } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200,height: 630 },deviceScaleFactor: 1 });
const font = `@font-face{font-family:Nunito;src:url(${origin}/og-font.woff2)}`;
// A game's cover: the drawn cover and its layers, or the game's own screenshot while it has temporary art.
const cover = (game: Game) => { const media = mediaFor(game); return [media.cover,...media.layers.map(layer => layer.src)].map(src => `<img src="${origin}${src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`).join(''); };
const brand = `<div style="position:absolute;left:28px;bottom:24px;display:flex;align-items:center;gap:12px;padding:8px 20px 8px 8px;border-radius:999px;background:#fff;color:#16191F;font:800 26px Nunito;box-shadow:0 4px 16px #16191f33"><img src="${origin}/brand/mark-96.png" width="44" height="44" style="border-radius:11px">${BRAND}</div>`;

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
  const file = url.pathname === '/og-font.woff2' ? createRequire(import.meta.url).resolve('@fontsource/nunito/files/nunito-latin-800-normal.woff2') : resolve(import.meta.dirname,'../../public',`.${decodeURIComponent(url.pathname)}`);
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200,{ 'Content-Type': file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream','Access-Control-Allow-Origin': '*' });
  createReadStream(file).pipe(res);
});

for (const game of games) {
  // 16:9 cover is 1200×675; crop 45 px off the bottom. The logo sits in the cover's empty sky band.
  await shoot(`<div style="position:relative;width:1200px;height:630px;overflow:hidden"><div style="position:absolute;inset:0 0 auto 0;height:675px">${cover(game)}</div>
    <img src="${origin}/media/${game.slug}/logo.svg" style="position:absolute;left:50%;top:22px;transform:translateX(-50%);max-width:640px;max-height:150px">${brand}</div>`,resolve(out,`${game.slug}.jpg`));
}
const wordmark = `data:image/png;base64,${readFileSync(resolve(import.meta.dirname,'../../../../docs/brand/wordmark.png')).toString('base64')}`;
const tile = (game: Game,x: number,y: number) => `<div style="position:absolute;left:${x}px;top:${y}px;width:270px;height:152px;border-radius:16px;overflow:hidden;box-shadow:0 6px 20px #16191f22">${cover(game)}</div>`;
await shoot(`<div style="position:relative;width:1200px;height:630px;background:#F5F6F8;font-family:Nunito;color:#16191F">
  <img src="${wordmark}" style="position:absolute;left:44px;top:150px;width:540px">
  <div style="position:absolute;left:56px;top:300px;width:520px;font:800 31px/1.3 Nunito">${TAGLINE}</div>
  <div style="position:absolute;left:56px;top:404px;width:520px;font:700 23px/1.45 Nunito;color:#5A6272">${games.length} free games for phones, tablets<br>and computers. No ads, purchases or tracking.</div>
  ${games.slice(0,6).map((game,index) => tile(game,620+(index % 2)*286,71+Math.floor(index/2)*168)).join('')}</div>`,resolve(out,'site.jpg'));
await browser.close(); server.close();
