import { Rng } from '../../core/rng';
import type { FarStyle } from '../../data/themes';
import { blob, circle, ellipse, glowDot, ink, linear, poly, radial, type Ctx } from '../canvas';
import { C, rgba, shade } from '../palette';

/** Horizontally seamless silhouette strip (period = w). Bottom is filled solid. */
export function drawSilhouette(ctx: Ctx, style: FarStyle, color: string, w: number, h: number, seed: number): void {
  const rng = new Rng(seed);
  ctx.fillStyle = color;
  const outline = rgba(shade(color, -0.35), 0.6);
  const wave = (x: number, amp: number[], freq: number[], phase: number[]) => {
    let y = 0;
    for (let i = 0; i < amp.length; i++) y += amp[i] * Math.sin(((x / w) * Math.PI * 2 * freq[i]) + phase[i]);
    return y;
  };
  const phases = [rng.range(0, 6), rng.range(0, 6), rng.range(0, 6)];
  switch (style) {
    case 'mountains':
    case 'volcano':
    case 'cliffs':
    case 'dunes':
    case 'craters': {
      const amp = style === 'dunes' ? [h * 0.08, h * 0.04, h * 0.02] : style === 'craters' ? [h * 0.05, h * 0.03, h * 0.015] : [h * 0.16, h * 0.08, h * 0.04];
      const freq = style === 'dunes' ? [2, 5, 9] : style === 'cliffs' ? [3, 7, 13] : [2, 4, 9];
      const p = new Path2D();
      p.moveTo(0, h);
      for (let x = 0; x <= w; x += 4) {
        let y = h * 0.55 + wave(x, amp, freq, phases);
        if (style === 'cliffs') y = Math.round(y / (h * 0.08)) * (h * 0.08);
        if (style === 'mountains') y -= Math.abs(Math.sin((x / w) * Math.PI * 6 + phases[0])) * h * 0.12;
        p.lineTo(x, y);
      }
      p.lineTo(w, h);
      p.closePath();
      ctx.fill(p);
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3;
      ctx.stroke(p);
      if (style === 'volcano') {
        const vx = w * 0.4;
        ink(ctx, poly([vx - w * 0.22, h, vx - w * 0.04, h * 0.18, vx + w * 0.04, h * 0.18, vx + w * 0.22, h]), shade(color, -0.08), 3);
        ctx.fillStyle = rgba('#ffffff', 0.25);
        ctx.fill(ellipse(vx, h * 0.18, w * 0.04, h * 0.02));
      }
      if (style === 'craters') {
        for (let i = 0; i < 6; i++) {
          const x = (i + 0.5) * (w / 6) + rng.range(-30, 30);
          const y = h * 0.72 + rng.range(-10, 20);
          ctx.fillStyle = rgba(shade(color, -0.3), 0.5);
          ctx.fill(ellipse(x, y, rng.range(30, 60), rng.range(8, 14)));
        }
      }
      if (style === 'mountains') {
        ctx.fillStyle = rgba('#ffffff', 0.18);
        for (let i = 0; i < 3; i++) ctx.fill(ellipse(w * (0.2 + i * 0.3), h * 0.42, w * 0.04, h * 0.02));
      }
      break;
    }
    case 'spires':
    case 'crystals':
    case 'towers': {
      const base = new Path2D();
      base.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) base.lineTo(x, h * 0.75 + wave(x, [h * 0.04], [3], phases));
      base.lineTo(w, h);
      base.closePath();
      ctx.fill(base);
      const n = 9;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * (w / n) + rng.range(-20, 20);
        const top = h * rng.range(0.15, 0.55);
        const bw = rng.range(18, 40);
        if (style === 'towers') {
          ink(ctx, poly([x - bw / 2, h, x - bw * 0.3, top + 20, x, top, x + bw * 0.3, top + 20, x + bw / 2, h]), shade(color, rng.range(-0.1, 0.1)), 3);
          glowDot(ctx, x, top + 30, 8, C.yellow);
          ink(ctx, circle(x, top - 6, 8), C.pink, 2.5);
        } else {
          ink(ctx, poly([x - bw / 2, h, x - bw * 0.15, top, x + bw * 0.15, top - 10, x + bw / 2, h]), shade(color, rng.range(-0.12, 0.12)), 3);
          if (style === 'crystals') {
            ctx.fillStyle = rgba('#ffffff', 0.35);
            ctx.fill(poly([x - bw * 0.1, top + 6, x, top - 2, x, h * 0.8, x - bw * 0.2, h * 0.8]));
          }
        }
      }
      break;
    }
    case 'domes': {
      const base = new Path2D();
      base.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) base.lineTo(x, h * 0.72 + wave(x, [h * 0.03], [4], phases));
      base.lineTo(w, h);
      base.closePath();
      ctx.fill(base);
      for (let i = 0; i < 5; i++) {
        const x = (i + 0.5) * (w / 5) + rng.range(-30, 30);
        const r = rng.range(30, 70);
        const p = new Path2D();
        p.arc(x, h * 0.74, r, Math.PI, 0);
        p.closePath();
        ink(ctx, p, radial(ctx, x - r * 0.3, h * 0.74 - r * 0.6, 2, r * 1.2, [[0, rgba('#ffffff', 0.7)], [1, rgba(shade(color, 0.3), 0.6)]]), 3);
      }
      break;
    }
    case 'clouds': {
      for (let i = 0; i < 7; i++) {
        const x = (i + 0.5) * (w / 7) + rng.range(-20, 20);
        const y = h * rng.range(0.35, 0.8);
        const r = rng.range(40, 80);
        const pts: number[] = [];
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2;
          pts.push(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 0.55);
        }
        ink(ctx, blob(pts), rgba(color, 0.9), 3);
      }
      ctx.fillStyle = color;
      ctx.fillRect(0, h * 0.85, w, h * 0.15);
      break;
    }
  }
}

export function drawSkyGradient(ctx: Ctx, w: number, h: number, top: string, bottom: string, haze?: string): void {
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [[0, top], [1, bottom]]);
  ctx.fillRect(0, 0, w, h);
  if (haze) {
    ctx.fillStyle = linear(ctx, 0, h * 0.5, 0, h, [[0, rgba(haze, 0)], [1, rgba(haze, 0.5)]]);
    ctx.fillRect(0, 0, w, h);
  }
}
