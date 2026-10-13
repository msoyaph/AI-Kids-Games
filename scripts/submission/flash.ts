// Flash safety (WCAG 2.3.1, "three flashes"): no area of the screen may flash more than 3 times in
// any second. The counter is games/vanex-defense/tests/e2e/flash.spec.ts's, shared here: a flash is
// a pair of opposing changes in relative luminance of 0.1 or more where the darker state is below
// 0.8. Frames come from the browser's screencast, reduced to 8×6 blocks.
import sharp from 'sharp';

export interface Frame { t: number; l: number[] }
export const COLUMNS = 8, ROWS = 6;

export function maxFlashesPerSecond(frames: Frame[]): { max: number; block: number; at: number } {
  let worst = { max: 0,block: -1,at: 0 };
  const blocks = frames[0]?.l.length ?? 0;
  for (let b = 0; b < blocks; b++) {
    const times: number[] = [];
    let dir = 0, lo = frames[0]!.l[b]!, hi = lo, ref = lo;
    for (const f of frames) {
      const L = f.l[b]!;
      if (dir === 0) {
        lo = Math.min(lo,L); hi = Math.max(hi,L);
        if (L-lo >= 0.1 && lo < 0.8) [dir,ref] = [1,L];
        else if (hi-L >= 0.1 && L < 0.8) [dir,ref] = [-1,L];
        if (dir) times.push(f.t);
      } else if (dir === 1) {
        if (L > ref) ref = L;
        else if (ref-L >= 0.1 && L < 0.8) { [dir,ref] = [-1,L]; times.push(f.t); }
      } else {
        if (L < ref) ref = L;
        else if (L-ref >= 0.1 && ref < 0.8) { [dir,ref] = [1,L]; times.push(f.t); }
      }
    }
    for (let i = 0; i < times.length; i++) {
      let n = 0;
      while (i+n < times.length && times[i+n]! < times[i]!+1) n++;
      const flashes = Math.floor(n/2);
      if (flashes > worst.max) worst = { max: flashes,block: b,at: times[i]!-frames[0]!.t };
    }
  }
  return worst;
}

const linear = (c: number) => { const v = c/255; return v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4; };
/** A screen image (any format sharp reads) → mean relative luminance of each of the 8×6 blocks. */
export async function blockLuminance(image: Buffer): Promise<number[]> {
  const { data } = await sharp(image).resize(COLUMNS*4,ROWS*4,{ fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const sums = new Array(COLUMNS*ROWS).fill(0);
  for (let y = 0; y < ROWS*4; y++) for (let x = 0; x < COLUMNS*4; x++) {
    const i = (y*COLUMNS*4+x)*3;
    sums[Math.floor(y/4)*COLUMNS+Math.floor(x/4)] += 0.2126*linear(data[i]!)+0.7152*linear(data[i+1]!)+0.0722*linear(data[i+2]!);
  }
  return sums.map(sum => sum/16);
}
