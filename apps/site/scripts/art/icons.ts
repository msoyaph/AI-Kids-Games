// Generates favicons and app icons from public/favicon.svg: favicon.ico (32×32 PNG in an ICO),
// apple-touch-icon.png (180), icon-192.png, icon-512.png and a padded maskable icon.
// Usage: npx tsx scripts/art/icons.ts
import { readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
const pub = (file: string) => resolve(import.meta.dirname,'../../public',file);
const svg = readFileSync(pub('favicon.svg'));
const png = (size: number) => sharp(svg,{ density: 72*size/40*4 }).resize(size,size).png({ compressionLevel: 9 }).toBuffer();
const ico = (data: Buffer,size: number) => { const head = Buffer.alloc(22); head.writeUInt16LE(1,2); head.writeUInt16LE(1,4); head[6] = size; head[7] = size; head.writeUInt16LE(1,10); head.writeUInt16LE(32,12); head.writeUInt32LE(data.length,14); head.writeUInt32LE(22,18); return Buffer.concat([head,data]); };
writeFileSync(pub('favicon.ico'),ico(await png(32),32));
writeFileSync(pub('apple-touch-icon.png'),await sharp(await png(180)).flatten({ background: '#0B7A50' }).png().toBuffer());
writeFileSync(pub('icon-192.png'),await png(192));
writeFileSync(pub('icon-512.png'),await png(512));
// Maskable: the mark on a full-bleed green square with a safe-zone margin.
writeFileSync(pub('icon-maskable-512.png'),await sharp({ create: { width: 512,height: 512,channels: 4,background: '#0B7A50' } }).composite([{ input: await png(360),gravity: 'center' }]).png().toBuffer());
console.log('icons written');
