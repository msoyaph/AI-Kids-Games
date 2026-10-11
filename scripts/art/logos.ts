// Generates each game's transparent title logo (public/media/<slug>/logo.svg) from Nunito Black
// (SIL OFL), outlined to paths so the SVG needs no font. Styles echo each game's own title screen.
// Usage: npx tsx scripts/art/logos.ts [slug...]
import { readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import opentype from 'opentype.js';

interface Segment { text: string; fill: string | [string,string] }
interface LogoStyle { lines: Segment[][]; outline: string; outlineWidth: number; shadow: string; depth: number; tilt?: number; tracking?: number; lineGap?: number }

const styles: Record<string,LogoStyle> = {
  // In game: cream "Thea" + orange "Bonk", chunky and tilted up.
  theabonk: { lines: [[{ text: 'Thea',fill: '#fff6e8' },{ text: 'Bonk',fill: ['#ffb347','#ff7a2e'] }]],outline: '#3b2a5a',outlineWidth: 16,shadow: '#241a3d',depth: 12,tilt: -4 },
  // In game: white rounded letters with a coral edge.
  'light-crossing': { lines: [[{ text: 'Light Crossing',fill: '#ffffff' }]],outline: '#f27c7c',outlineWidth: 13,shadow: '#d95f63',depth: 9 },
  // In game: white-to-lavender rounded letters on deep indigo.
  'vanex-defense': { lines: [[{ text: 'Vanex Defense',fill: ['#ffffff','#c9b5ff'] }]],outline: '#3a1f8a',outlineWidth: 14,shadow: '#1b1446',depth: 11 },
  // In game: big yellow letters with a dark purple outline.
  'space-sky': { lines: [[{ text: 'Space Sky',fill: ['#fff07a','#ffc23d'] }]],outline: '#3a1f6e',outlineWidth: 17,shadow: '#20124d',depth: 13 },
  // In game: stacked capitals, each letter a different logo color.
  'calex-cart': { lines: [[...'CALEX'].map((text,i) => ({ text,fill: ['#ffd23f','#4ce0d2','#ff6fae','#8cff6b'][i % 4] })),[...'CART'].map((text,i) => ({ text,fill: ['#ff6fae','#8cff6b','#ffd23f','#4ce0d2'][i % 4] }))],outline: '#2a2140',outlineWidth: 14,shadow: '#2a2140',depth: 15,tracking: 6,lineGap: -18 }
};

const woff = readFileSync(resolve(import.meta.dirname,'../../node_modules/@fontsource/nunito/files/nunito-latin-900-normal.woff'));
const font = opentype.parse(woff.buffer.slice(woff.byteOffset,woff.byteOffset+woff.byteLength));
const size = 200, pad = 40;
// Lay out plain glyphs with kerning ourselves: opentype.js cannot apply some of Nunito's
// contextual substitutions, and the logos don't need them.
function layout(text: string,x: number,y: number) {
  const path = new opentype.Path(); let cursor = x;
  const glyphs = [...text].map(char => font.charToGlyph(char));
  glyphs.forEach((glyph,i) => {
    path.extend(glyph.getPath(cursor,y,size));
    cursor += (glyph.advanceWidth ?? 0)*size/font.unitsPerEm;
    const kern = glyphs[i+1] ? Number(font.getKerningValue(glyph,glyphs[i+1])) : 0;
    if (Number.isFinite(kern)) cursor += kern*size/font.unitsPerEm;
  });
  return { path,advance: cursor-x };
}
const titles: Record<string,string> = { theabonk: 'TheaBonk','light-crossing': 'Light Crossing','vanex-defense': 'Vanex Defense','space-sky': 'Space Sky','calex-cart': 'Calex Cart' };

function build(slug: string,style: LogoStyle) {
  const shapes: { d: string; fill: Segment['fill'] }[] = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const widths = style.lines.map(line => line.reduce((sum,seg) => sum+layout(seg.text,0,0).advance+(style.tracking ?? 0),0)-(style.tracking ?? 0));
  const widest = Math.max(...widths);
  style.lines.forEach((line,row) => {
    let x = (widest-widths[row])/2; const y = size*0.8+row*(size*0.86+(style.lineGap ?? 0));
    for (const seg of line) {
      const { path } = layout(seg.text,x,y);
      const box = path.getBoundingBox();
      minX = Math.min(minX,box.x1); minY = Math.min(minY,box.y1); maxX = Math.max(maxX,box.x2); maxY = Math.max(maxY,box.y2);
      shapes.push({ d: path.toPathData(1),fill: seg.fill });
      x += layout(seg.text,0,0).advance+(style.tracking ?? 0);
    }
  });
  const ow = style.outlineWidth, x0 = minX-pad-ow, y0 = minY-pad-ow, w = maxX-minX+2*(pad+ow), h = maxY-minY+2*(pad+ow)+style.depth;
  const gradients = shapes.map((shape,i) => Array.isArray(shape.fill) ? `<linearGradient id="g${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shape.fill[0]}"/><stop offset="1" stop-color="${shape.fill[1]}"/></linearGradient>` : '').join('');
  const all = shapes.map(shape => shape.d).join('');
  const cx = (minX+maxX)/2, cy = (minY+maxY)/2;
  const body = [
    `<path d="${all}" transform="translate(0 ${style.depth})" fill="${style.shadow}" stroke="${style.shadow}" stroke-width="${ow*2}" stroke-linejoin="round"/>`,
    `<path d="${all}" fill="${style.outline}" stroke="${style.outline}" stroke-width="${ow*2}" stroke-linejoin="round"/>`,
    ...shapes.map((shape,i) => `<path d="${shape.d}" fill="${Array.isArray(shape.fill) ? `url(#g${i})` : shape.fill}"/>`)
  ].join('');
  const tilt = style.tilt ? ` transform="rotate(${style.tilt} ${cx.toFixed(1)} ${cy.toFixed(1)})"` : '';
  const extra = style.tilt ? Math.abs(Math.sin(style.tilt*Math.PI/180))*w/2 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0.toFixed(1)} ${(y0-extra).toFixed(1)} ${w.toFixed(1)} ${(h+2*extra).toFixed(1)}" role="img" aria-label="${titles[slug]}"><title>${titles[slug]}</title><defs>${gradients}</defs><g${tilt}>${body}</g></svg>\n`;
}

const only = process.argv.slice(2);
for (const [slug,style] of Object.entries(styles)) {
  if (only.length && !only.includes(slug)) continue;
  const file = resolve(import.meta.dirname,'../../public/media',slug,'logo.svg');
  writeFileSync(file,build(slug,style));
  console.log(`logo: ${file}`);
}
