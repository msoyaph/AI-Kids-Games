/**
 * A tiny PNG writer for review sheets (node only): PixelCanvas → .png, scaled up with nearest
 * neighbour, plus a 3×5 digit font for labels.
 */
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { PixelCanvas, T } from '../src/art/pixelcanvas';

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
const crc32 = (buf: Uint8Array) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(data)]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

export function writePng(path: string, pc: PixelCanvas, scale = 1, background = 0x2a2840): void {
  const w = pc.w * scale, h = pc.h * scale;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const c0 = pc.px[Math.floor(y / scale) * pc.w + Math.floor(x / scale)]!;
      const c = c0 === T ? background : c0;
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = (c >> 16) & 255; raw[o + 1] = (c >> 8) & 255; raw[o + 2] = c & 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  writeFileSync(path, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())]));
}

const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
export function drawNumber(pc: PixelCanvas, n: number, x: number, y: number, c = 0xffffff): void {
  [...String(n)].forEach((d, i) => {
    const bits = DIGITS[Number(d)]!;
    for (let k = 0; k < 15; k++) if (bits[k] === '1') pc.set(x + i * 4 + (k % 3), y + Math.floor(k / 3), c);
  });
}
