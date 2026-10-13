// Favicons, app icons and the header mark from the owner's artwork (docs/brand/icon-source.webp):
//   favicon.ico (16, 32 and 48), icon-192.png, icon-512.png (the rounded square as drawn),
//   apple-touch-icon.png (180, full-bleed: iOS rounds the corners itself), icon-maskable-512.png
//   (full-bleed, the art inside the 80% safe circle), brand/mark-96.png (the header mark).
// Plus the README wordmarks: docs/brand/wordmark.png and wordmark-dark.png (light letters).
// Usage: npx tsx scripts/art/icons.ts
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const brand = (file: string) => resolve(import.meta.dirname,'../../../../docs/brand',file);
const pub = (file: string) => resolve(import.meta.dirname,'../../public',file);
mkdirSync(pub('brand'),{ recursive: true });

// The rounded square fills (40, 42)–(1211, 1212) of the 1254 px source; crop to it.
const square = await sharp(brand('icon-source.webp')).extract({ left: 40,top: 42,width: 1171,height: 1171 }).png().toBuffer();
const sized = (size: number) => sharp(square).resize(size,size,{ kernel: 'lanczos3' }).png({ compressionLevel: 9,palette: true,quality: 92,effort: 10 }).toBuffer();
/** The corners filled with a blurred, enlarged copy of the icon's own edges, so the square is full-bleed. */
async function fullBleed(size: number,artScale: number) {
  const grow = Math.round(size*1.3), offset = Math.round((grow-size)/2);
  const back = await sharp(square).resize(grow,grow).extract({ left: offset,top: offset,width: size,height: size }).blur(size/24).flatten({ background: '#4F46E5' }).png().toBuffer();
  const art = await sharp(square).resize(Math.round(size*artScale)).png().toBuffer();
  return sharp(back).composite([{ input: art,gravity: 'center' }]).png({ compressionLevel: 9,palette: true,quality: 92,effort: 10 }).toBuffer();
}
/** An ICO holding PNG images (every current browser reads these). */
function ico(images: [number,Buffer][]) {
  const head = Buffer.alloc(6+16*images.length); head.writeUInt16LE(1,2); head.writeUInt16LE(images.length,4);
  let offset = head.length;
  images.forEach(([size,data],index) => { const at = 6+16*index; head[at] = size; head[at+1] = size; head.writeUInt16LE(1,at+4); head.writeUInt16LE(32,at+6); head.writeUInt32LE(data.length,at+8); head.writeUInt32LE(offset,at+12); offset += data.length; });
  return Buffer.concat([head,...images.map(([,data]) => data)]);
}

writeFileSync(pub('favicon.ico'),ico(await Promise.all([16,32,48].map(async size => [size,await sharp(square).resize(size,size).png().toBuffer()] as [number,Buffer]))));
writeFileSync(pub('icon-192.png'),await sized(192));
writeFileSync(pub('icon-512.png'),await sized(512));
writeFileSync(pub('apple-touch-icon.png'),await fullBleed(180,1));
writeFileSync(pub('icon-maskable-512.png'),await fullBleed(512,0.82));
writeFileSync(pub('brand/mark-96.png'),await sized(96));

// README wordmarks. The dark version turns the navy letters and outlines light, for dark mode.
const wordmark = sharp(brand('wordmark-source.webp')).extract({ left: 50,top: 140,width: 1900,height: 430 }).resize(950);
writeFileSync(brand('wordmark.png'),await wordmark.clone().png({ compressionLevel: 9 }).toBuffer());
const { data,info } = await wordmark.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < data.length; i += 4) {
  const [r,g,b] = [data[i]!,data[i+1]!,data[i+2]!], x = (i/4) % info.width, y = Math.floor(i/4/info.width);
  // Navy (dark, blue-leaning) → near-white, keeping the shading; the controller's face stays navy.
  const face = x >= 100 && x <= 190 && y >= 92 && y <= 152;
  if (r+g+b < 150 && b >= r && !face) { const light = 245-(r+g+b)/6; data[i] = light; data[i+1] = light; data[i+2] = Math.min(255,light+8); }
}
writeFileSync(brand('wordmark-dark.png'),await sharp(data,{ raw: info }).png({ compressionLevel: 9 }).toBuffer());
console.log('icons, header mark and README wordmarks written');
