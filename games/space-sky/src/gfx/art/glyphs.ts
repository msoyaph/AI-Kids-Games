import { blob, circle, ellipse, ink, poly, radial, roundRect, softStar, star, type Ctx } from '../canvas';
import { C, rgba, shade } from '../palette';

/**
 * Small vector pictures used on stickers, badges and codex cards.
 * Each glyph is drawn centered at (cx, cy) fitting inside radius r.
 */
export type GlyphId =
  | 'star' | 'heart' | 'moon' | 'planet' | 'ringed' | 'rocket' | 'alien' | 'comet' | 'sun' | 'cloud'
  | 'rover' | 'mountain' | 'snowflake' | 'rock' | 'crater' | 'volcano' | 'swirl' | 'drop' | 'cliff'
  | 'geyser' | 'crystal' | 'bubble' | 'wind' | 'beacon' | 'trophy' | 'medal' | 'coin' | 'fuel'
  | 'wrench' | 'book' | 'flag' | 'boot' | 'magnet' | 'telescope' | 'satellite' | 'gift' | 'bolt'
  | 'robot' | 'helmet' | 'map' | 'clock' | 'rings' | 'shield' | 'glimmer' | 'bunny' | 'flower' | 'wormhole' | 'calendar';

export function drawGlyph(ctx: Ctx, g: GlyphId, cx: number, cy: number, r: number, color: string = C.yellow): void {
  const lw = Math.max(1.5, r * 0.09);
  switch (g) {
    case 'star':
      ink(ctx, softStar(cx, cy + r * 0.05, 5, r * 0.95, r * 0.45), color, lw);
      break;
    case 'heart': {
      const p = new Path2D();
      p.moveTo(cx, cy + r * 0.8);
      p.bezierCurveTo(cx - r * 1.1, cy + r * 0.05, cx - r * 0.75, cy - r * 0.85, cx, cy - r * 0.35);
      p.bezierCurveTo(cx + r * 0.75, cy - r * 0.85, cx + r * 1.1, cy + r * 0.05, cx, cy + r * 0.8);
      ink(ctx, p, color, lw);
      break;
    }
    case 'moon': {
      const p = new Path2D();
      p.arc(cx, cy, r * 0.85, Math.PI * 0.3, Math.PI * 1.7, false);
      p.arc(cx + r * 0.35, cy - r * 0.1, r * 0.62, Math.PI * 1.55, Math.PI * 0.45, true);
      p.closePath();
      ink(ctx, p, color, lw);
      break;
    }
    case 'planet':
      ink(ctx, circle(cx, cy, r * 0.8), color, lw);
      ctx.fillStyle = rgba(C.ink, 0.25);
      ctx.fill(ellipse(cx - r * 0.2, cy + r * 0.25, r * 0.3, r * 0.15));
      ctx.fill(ellipse(cx + r * 0.3, cy - r * 0.25, r * 0.18, r * 0.12));
      break;
    case 'ringed': {
      ctx.lineWidth = lw * 2.4;
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.0, r * 0.3, -0.35, Math.PI, Math.PI * 2);
      ctx.stroke();
      ink(ctx, circle(cx, cy, r * 0.6), color, lw);
      ctx.lineWidth = lw * 2.4;
      ctx.strokeStyle = C.ink;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.0, r * 0.3, -0.35, 0, Math.PI);
      ctx.stroke();
      ctx.lineWidth = lw * 1.1;
      ctx.strokeStyle = C.cream;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.0, r * 0.3, -0.35, 0, Math.PI);
      ctx.stroke();
      break;
    }
    case 'rocket': {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(0.6);
      ink(ctx, poly([-r * 0.25, r * 0.35, -r * 0.55, r * 0.75, -r * 0.2, r * 0.6]), C.red, lw);
      ink(ctx, poly([r * 0.25, r * 0.35, r * 0.55, r * 0.75, r * 0.2, r * 0.6]), C.red, lw);
      const p = new Path2D();
      p.moveTo(0, -r);
      p.bezierCurveTo(r * 0.45, -r * 0.6, r * 0.4, r * 0.3, r * 0.25, r * 0.65);
      p.lineTo(-r * 0.25, r * 0.65);
      p.bezierCurveTo(-r * 0.4, r * 0.3, -r * 0.45, -r * 0.6, 0, -r);
      ink(ctx, p, color === C.yellow ? C.white : color, lw);
      ink(ctx, circle(0, -r * 0.15, r * 0.18), C.cyan, lw * 0.8);
      ctx.restore();
      break;
    }
    case 'alien': {
      ink(ctx, ellipse(cx, cy + r * 0.05, r * 0.75, r * 0.7), color === C.yellow ? C.teal : color, lw);
      for (const s of [-1, 1]) {
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(cx + s * r * 0.3, cy - r * 0.55);
        ctx.lineTo(cx + s * r * 0.5, cy - r * 0.95);
        ctx.stroke();
        ink(ctx, circle(cx + s * r * 0.5, cy - r * 0.95, r * 0.12), C.pink, lw * 0.7);
      }
      ink(ctx, ellipse(cx - r * 0.3, cy - r * 0.05, r * 0.16, r * 0.2), C.white, lw * 0.7);
      ink(ctx, ellipse(cx + r * 0.3, cy - r * 0.05, r * 0.16, r * 0.2), C.white, lw * 0.7);
      ink(ctx, ellipse(cx, cy - r * 0.25, r * 0.12, r * 0.15), C.white, lw * 0.7);
      ctx.fillStyle = C.ink;
      ctx.fill(circle(cx - r * 0.28, cy - r * 0.02, r * 0.07));
      ctx.fill(circle(cx + r * 0.32, cy - r * 0.02, r * 0.07));
      ctx.fill(circle(cx, cy - r * 0.22, r * 0.06));
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.25, r * 0.22, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
      break;
    }
    case 'comet': {
      ctx.fillStyle = rgba(C.cyan, 0.6);
      ctx.fill(poly([cx + r * 0.25, cy - r * 0.45, cx - r * 0.95, cy + r * 0.85, cx + r * 0.45, cy + r * 0.05]));
      ctx.fillStyle = rgba('#ffffff', 0.7);
      ctx.fill(poly([cx + r * 0.3, cy - r * 0.3, cx - r * 0.7, cy + r * 0.6, cx + r * 0.35, cy - r * 0.05]));
      ink(ctx, circle(cx + r * 0.4, cy - r * 0.35, r * 0.38), color === C.yellow ? '#dff6ff' : color, lw);
      break;
    }
    case 'sun': {
      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < 10; i++) {
        ctx.rotate((Math.PI * 2) / 10);
        ink(ctx, poly([-r * 0.14, -r * 0.6, 0, -r * 1.0, r * 0.14, -r * 0.6]), C.orange, lw * 0.8);
      }
      ctx.restore();
      ink(ctx, circle(cx, cy, r * 0.6), C.yellow, lw);
      break;
    }
    case 'cloud':
      ink(ctx, blob([cx - r * 0.9, cy + r * 0.3, cx - r * 0.7, cy - r * 0.3, cx - r * 0.2, cy - r * 0.55, cx + r * 0.3, cy - r * 0.6, cx + r * 0.8, cy - r * 0.2, cx + r * 0.9, cy + r * 0.35, cx, cy + r * 0.55]), color === C.yellow ? '#fff1c2' : color, lw);
      break;
    case 'rover': {
      ink(ctx, roundRect(cx - r * 0.75, cy - r * 0.35, r * 1.5, r * 0.6, r * 0.15), color === C.yellow ? C.orange : color, lw);
      ink(ctx, roundRect(cx - r * 0.2, cy - r * 0.75, r * 0.4, r * 0.35, r * 0.08), C.steel, lw);
      ink(ctx, circle(cx, cy - r * 0.58, r * 0.1), C.cyan, lw * 0.6);
      for (const x of [-0.5, 0, 0.5]) ink(ctx, circle(cx + x * r, cy + r * 0.45, r * 0.24), C.dark, lw);
      break;
    }
    case 'mountain':
      ink(ctx, poly([cx - r, cy + r * 0.7, cx - r * 0.2, cy - r * 0.75, cx + r * 0.25, cy - r * 0.1, cx + r * 0.45, cy - r * 0.35, cx + r, cy + r * 0.7]), color === C.yellow ? '#e46a4a' : color, lw);
      ink(ctx, poly([cx - r * 0.42, cy - r * 0.3, cx - r * 0.2, cy - r * 0.75, cx + r * 0.02, cy - r * 0.38, cx - r * 0.2, cy - r * 0.45]), C.white, lw * 0.6);
      break;
    case 'snowflake': {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.lineCap = 'round';
      for (const [w, col] of [[lw * 3, C.ink], [lw * 1.6, color === C.yellow ? '#bfefff' : color]] as Array<[number, string]>) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate((i * Math.PI) / 3);
          ctx.beginPath();
          ctx.moveTo(0, -r * 0.9);
          ctx.lineTo(0, r * 0.9);
          for (const s of [-1, 1]) {
            ctx.moveTo(0, s * r * 0.5);
            ctx.lineTo(r * 0.25, s * r * 0.75);
            ctx.moveTo(0, s * r * 0.5);
            ctx.lineTo(-r * 0.25, s * r * 0.75);
          }
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
      break;
    }
    case 'rock':
      ink(ctx, blob([cx - r * 0.8, cy + r * 0.2, cx - r * 0.5, cy - r * 0.55, cx + r * 0.2, cy - r * 0.7, cx + r * 0.85, cy - r * 0.1, cx + r * 0.6, cy + r * 0.6, cx - r * 0.3, cy + r * 0.7]), color === C.yellow ? C.gray : color, lw);
      ctx.fillStyle = rgba(C.ink, 0.25);
      ctx.fill(circle(cx - r * 0.2, cy, r * 0.15));
      ctx.fill(circle(cx + r * 0.3, cy + r * 0.25, r * 0.1));
      break;
    case 'crater':
      ink(ctx, circle(cx, cy, r * 0.85), color === C.yellow ? '#c9c3b8' : color, lw);
      for (const [x, y, rr] of [[-0.3, -0.2, 0.25], [0.35, 0.15, 0.2], [-0.1, 0.45, 0.14]]) {
        ink(ctx, circle(cx + x * r, cy + y * r, rr * r), shade(color === C.yellow ? '#c9c3b8' : color, -0.25), lw * 0.6);
      }
      break;
    case 'volcano':
      ink(ctx, poly([cx - r, cy + r * 0.75, cx - r * 0.25, cy - r * 0.3, cx + r * 0.25, cy - r * 0.3, cx + r, cy + r * 0.75]), '#a0522d', lw);
      ink(ctx, blob([cx - r * 0.3, cy - r * 0.35, cx - r * 0.45, cy - r * 0.8, cx, cy - r * 1.0, cx + r * 0.45, cy - r * 0.8, cx + r * 0.3, cy - r * 0.35]), C.orange, lw * 0.8);
      ctx.fillStyle = C.yellow;
      ctx.fill(circle(cx, cy - r * 0.6, r * 0.15));
      break;
    case 'swirl': {
      ink(ctx, circle(cx, cy, r * 0.85), color === C.yellow ? '#e9a46a' : color, lw);
      ctx.strokeStyle = C.white;
      ctx.lineWidth = lw * 1.2;
      ctx.beginPath();
      for (let i = 0; i < 40; i++) {
        const a = i * 0.32;
        const rr = (i / 40) * r * 0.65;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr * 0.75;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      break;
    }
    case 'drop': {
      const p = new Path2D();
      p.moveTo(cx, cy - r * 0.95);
      p.bezierCurveTo(cx + r * 0.3, cy - r * 0.45, cx + r * 0.75, cy, cx + r * 0.7, cy + r * 0.3);
      p.arc(cx, cy + r * 0.3, r * 0.7, 0, Math.PI);
      p.bezierCurveTo(cx - r * 0.75, cy, cx - r * 0.3, cy - r * 0.45, cx, cy - r * 0.95);
      ink(ctx, p, color === C.yellow ? C.orange : color, lw);
      ctx.fillStyle = rgba('#ffffff', 0.6);
      ctx.fill(ellipse(cx - r * 0.25, cy + r * 0.15, r * 0.12, r * 0.2, 0.3));
      break;
    }
    case 'cliff':
      ink(ctx, poly([cx - r, cy + r * 0.8, cx - r, cy - r * 0.8, cx - r * 0.1, cy - r * 0.8, cx - r * 0.05, cy + r * 0.1, cx + r, cy + r * 0.1, cx + r, cy + r * 0.8]), color === C.yellow ? C.gray : color, lw);
      ctx.strokeStyle = rgba(C.ink, 0.35);
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.7, cy - r * 0.4);
      ctx.lineTo(cx - r * 0.3, cy - r * 0.4);
      ctx.moveTo(cx - r * 0.8, cy + r * 0.2);
      ctx.lineTo(cx - r * 0.4, cy + r * 0.2);
      ctx.stroke();
      break;
    case 'geyser':
      ink(ctx, ellipse(cx, cy + r * 0.7, r * 0.8, r * 0.22), '#d8e6f0', lw);
      ink(ctx, blob([cx - r * 0.2, cy + r * 0.65, cx - r * 0.35, cy - r * 0.1, cx - r * 0.55, cy - r * 0.7, cx, cy - r, cx + r * 0.55, cy - r * 0.7, cx + r * 0.35, cy - r * 0.1, cx + r * 0.2, cy + r * 0.65]), color === C.yellow ? '#e6f7ff' : color, lw);
      break;
    case 'crystal':
      ink(ctx, poly([cx, cy - r, cx + r * 0.55, cy - r * 0.3, cx + r * 0.35, cy + r * 0.85, cx - r * 0.35, cy + r * 0.85, cx - r * 0.55, cy - r * 0.3]), color === C.yellow ? '#c89bff' : color, lw);
      ctx.strokeStyle = rgba('#ffffff', 0.7);
      ctx.lineWidth = lw * 0.7;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx - r * 0.1, cy + r * 0.85);
      ctx.moveTo(cx - r * 0.55, cy - r * 0.3);
      ctx.lineTo(cx + r * 0.55, cy - r * 0.3);
      ctx.stroke();
      break;
    case 'bubble':
      ink(ctx, circle(cx, cy, r * 0.85), radial(ctx, cx - r * 0.3, cy - r * 0.3, 1, r, [[0, '#ffffff'], [0.4, rgba(color === C.yellow ? C.cyan : color, 0.5)], [1, rgba(color === C.yellow ? C.purple : color, 0.8)]]), lw);
      ctx.fillStyle = rgba('#ffffff', 0.9);
      ctx.fill(ellipse(cx - r * 0.35, cy - r * 0.35, r * 0.18, r * 0.1, -0.7));
      break;
    case 'wind': {
      ctx.lineCap = 'round';
      for (const [w, col] of [[lw * 2.8, C.ink], [lw * 1.4, color === C.yellow ? '#dff6ff' : color]] as Array<[number, string]>) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.9, cy - r * 0.3);
        ctx.lineTo(cx + r * 0.3, cy - r * 0.3);
        ctx.arc(cx + r * 0.3, cy - r * 0.55, r * 0.25, Math.PI / 2, -Math.PI, true);
        ctx.moveTo(cx - r * 0.9, cy + r * 0.1);
        ctx.lineTo(cx + r * 0.55, cy + r * 0.1);
        ctx.arc(cx + r * 0.55, cy + r * 0.35, r * 0.25, -Math.PI / 2, Math.PI, false);
        ctx.moveTo(cx - r * 0.7, cy + r * 0.5);
        ctx.lineTo(cx, cy + r * 0.5);
        ctx.stroke();
      }
      break;
    }
    case 'beacon':
      ink(ctx, poly([cx - r * 0.45, cy + r * 0.9, cx - r * 0.25, cy - r * 0.4, cx + r * 0.25, cy - r * 0.4, cx + r * 0.45, cy + r * 0.9]), C.white, lw);
      ctx.fillStyle = C.red;
      ctx.fillRect(cx - r * 0.38, cy + r * 0.25, r * 0.76, r * 0.18);
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = r * 0.6;
      ink(ctx, softStar(cx, cy - r * 0.65, 6, r * 0.4, r * 0.2), color, lw * 0.8);
      ctx.restore();
      break;
    case 'trophy':
      ink(ctx, roundRect(cx - r * 0.4, cy + r * 0.6, r * 0.8, r * 0.3, r * 0.06), C.brown, lw);
      ink(ctx, roundRect(cx - r * 0.1, cy + r * 0.2, r * 0.2, r * 0.45, 2), color, lw);
      for (const s of [-1, 1]) {
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = lw * 2.2;
        ctx.beginPath();
        ctx.arc(cx + s * r * 0.55, cy - r * 0.35, r * 0.22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
      {
        const p = new Path2D();
        p.moveTo(cx - r * 0.6, cy - r * 0.75);
        p.lineTo(cx + r * 0.6, cy - r * 0.75);
        p.quadraticCurveTo(cx + r * 0.6, cy + r * 0.25, cx, cy + r * 0.25);
        p.quadraticCurveTo(cx - r * 0.6, cy + r * 0.25, cx - r * 0.6, cy - r * 0.75);
        ink(ctx, p, color, lw);
      }
      ink(ctx, star(cx, cy - r * 0.3, 5, r * 0.22, r * 0.1), C.white, lw * 0.5);
      break;
    case 'medal':
      ink(ctx, poly([cx - r * 0.5, cy - r, cx - r * 0.15, cy - r, cx + r * 0.1, cy - r * 0.2, cx - r * 0.25, cy - r * 0.2]), C.blue, lw);
      ink(ctx, poly([cx + r * 0.5, cy - r, cx + r * 0.15, cy - r, cx - r * 0.1, cy - r * 0.2, cx + r * 0.25, cy - r * 0.2]), C.red, lw);
      ink(ctx, circle(cx, cy + r * 0.3, r * 0.6), color, lw);
      ink(ctx, softStar(cx, cy + r * 0.32, 5, r * 0.32, r * 0.15), shade(color, 0.4), lw * 0.5);
      break;
    case 'coin':
      ink(ctx, circle(cx, cy, r * 0.85), C.gold, lw);
      ink(ctx, circle(cx, cy, r * 0.62), C.yellow, lw * 0.5);
      ink(ctx, softStar(cx, cy + r * 0.03, 5, r * 0.45, r * 0.2), C.orange, lw * 0.5);
      break;
    case 'fuel':
      ink(ctx, roundRect(cx - r * 0.45, cy - r * 0.75, r * 0.9, r * 1.55, r * 0.2), color === C.yellow ? C.lime : color, lw);
      ink(ctx, roundRect(cx - r * 0.2, cy - r * 0.95, r * 0.4, r * 0.22, 2), C.steel, lw * 0.8);
      ctx.fillStyle = rgba('#ffffff', 0.85);
      ctx.fill(poly([cx + r * 0.05, cy - r * 0.45, cx - r * 0.2, cy + r * 0.1, cx, cy + r * 0.1, cx - r * 0.08, cy + r * 0.5, cx + r * 0.22, cy - r * 0.05, cx + r * 0.02, cy - r * 0.05]));
      break;
    case 'wrench': {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.8);
      const p = new Path2D();
      p.addPath(roundRect(-r * 0.13, -r * 0.4, r * 0.26, r * 1.25, r * 0.1));
      ink(ctx, p, C.steel, lw);
      const head = new Path2D();
      head.arc(0, -r * 0.55, r * 0.38, 0, Math.PI * 2);
      ink(ctx, head, C.steel, lw);
      ctx.fillStyle = color === C.yellow ? C.purple : color;
      ctx.fillRect(-r * 0.12, -r * 0.98, r * 0.24, r * 0.38);
      ctx.restore();
      break;
    }
    case 'book':
      ink(ctx, roundRect(cx - r * 0.8, cy - r * 0.65, r * 0.78, r * 1.3, r * 0.1), color === C.yellow ? C.blue : color, lw);
      ink(ctx, roundRect(cx + r * 0.02, cy - r * 0.65, r * 0.78, r * 1.3, r * 0.1), color === C.yellow ? C.blue : color, lw);
      ctx.fillStyle = C.white;
      ctx.fillRect(cx - r * 0.65, cy - r * 0.5, r * 0.55, r * 1.0);
      ctx.fillRect(cx + r * 0.12, cy - r * 0.5, r * 0.55, r * 1.0);
      ctx.fillStyle = C.yellow;
      ctx.fill(star(cx - r * 0.38, cy - r * 0.05, 5, r * 0.2, r * 0.09));
      break;
    case 'flag':
      ctx.fillStyle = C.ink;
      ctx.fillRect(cx - r * 0.6, cy - r * 0.9, r * 0.12, r * 1.8);
      ink(ctx, poly([cx - r * 0.5, cy - r * 0.85, cx + r * 0.8, cy - r * 0.55, cx - r * 0.5, cy - r * 0.15]), color === C.yellow ? C.red : color, lw);
      break;
    case 'boot':
      ink(ctx, blob([cx - r * 0.5, cy - r * 0.8, cx + r * 0.1, cy - r * 0.8, cx + r * 0.15, cy + r * 0.2, cx + r * 0.85, cy + r * 0.35, cx + r * 0.85, cy + r * 0.75, cx - r * 0.55, cy + r * 0.75]), color === C.yellow ? C.white : color, lw);
      ctx.fillStyle = C.gray;
      ctx.fillRect(cx - r * 0.55, cy + r * 0.55, r * 1.35, r * 0.15);
      break;
    case 'magnet':
      ctx.lineCap = 'butt';
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = r * 0.55;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.5, Math.PI, 0, true);
      ctx.lineTo(cx + r * 0.5, cy - r * 0.6);
      ctx.moveTo(cx - r * 0.5, cy);
      ctx.lineTo(cx - r * 0.5, cy - r * 0.6);
      ctx.stroke();
      ctx.strokeStyle = color === C.yellow ? C.red : color;
      ctx.lineWidth = r * 0.35;
      ctx.stroke();
      ctx.fillStyle = C.white;
      ctx.fillRect(cx - r * 0.68, cy - r * 0.85, r * 0.36, r * 0.25);
      ctx.fillRect(cx + r * 0.32, cy - r * 0.85, r * 0.36, r * 0.25);
      break;
    case 'telescope':
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.5);
      ink(ctx, roundRect(-r * 0.9, -r * 0.2, r * 1.6, r * 0.4, r * 0.1), color === C.yellow ? C.blue : color, lw);
      ink(ctx, roundRect(r * 0.55, -r * 0.28, r * 0.35, r * 0.56, r * 0.08), C.steel, lw);
      ctx.restore();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw * 1.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy + r * 0.1);
      ctx.lineTo(cx - r * 0.4, cy + r * 0.9);
      ctx.moveTo(cx, cy + r * 0.1);
      ctx.lineTo(cx + r * 0.4, cy + r * 0.9);
      ctx.stroke();
      break;
    case 'satellite':
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(0.6);
      ink(ctx, roundRect(-r, -r * 0.25, r * 0.6, r * 0.5, 2), C.blue, lw);
      ink(ctx, roundRect(r * 0.4, -r * 0.25, r * 0.6, r * 0.5, 2), C.blue, lw);
      ink(ctx, roundRect(-r * 0.3, -r * 0.35, r * 0.6, r * 0.7, r * 0.1), color === C.yellow ? C.steel : color, lw);
      ctx.restore();
      break;
    case 'gift':
      ink(ctx, roundRect(cx - r * 0.75, cy - r * 0.35, r * 1.5, r * 1.1, r * 0.1), color === C.yellow ? C.pink : color, lw);
      ink(ctx, roundRect(cx - r * 0.85, cy - r * 0.6, r * 1.7, r * 0.35, r * 0.08), color === C.yellow ? C.pink : color, lw);
      ctx.fillStyle = C.yellow;
      ctx.fillRect(cx - r * 0.12, cy - r * 0.6, r * 0.24, r * 1.35);
      ink(ctx, ellipse(cx - r * 0.25, cy - r * 0.75, r * 0.25, r * 0.15, 0.4), C.yellow, lw * 0.7);
      ink(ctx, ellipse(cx + r * 0.25, cy - r * 0.75, r * 0.25, r * 0.15, -0.4), C.yellow, lw * 0.7);
      break;
    case 'bolt':
      ink(ctx, poly([cx + r * 0.2, cy - r, cx - r * 0.55, cy + r * 0.15, cx - r * 0.05, cy + r * 0.15, cx - r * 0.25, cy + r, cx + r * 0.55, cy - r * 0.2, cx + r * 0.05, cy - r * 0.2]), color, lw);
      break;
    case 'robot':
      ink(ctx, roundRect(cx - r * 0.7, cy - r * 0.55, r * 1.4, r * 1.2, r * 0.35), color === C.yellow ? C.steel : color, lw);
      ink(ctx, roundRect(cx - r * 0.5, cy - r * 0.3, r, r * 0.55, r * 0.2), C.ink, 0);
      ctx.fillStyle = C.cyan;
      ctx.fill(circle(cx - r * 0.22, cy - r * 0.05, r * 0.12));
      ctx.fill(circle(cx + r * 0.22, cy - r * 0.05, r * 0.12));
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.55);
      ctx.lineTo(cx, cy - r * 0.85);
      ctx.stroke();
      ink(ctx, circle(cx, cy - r * 0.9, r * 0.12), C.red, lw * 0.7);
      break;
    case 'helmet':
      ink(ctx, circle(cx, cy, r * 0.85), color === C.yellow ? C.white : color, lw);
      ink(ctx, roundRect(cx - r * 0.55, cy - r * 0.4, r * 1.1, r * 0.7, r * 0.3), radial(ctx, cx - r * 0.2, cy - r * 0.2, 1, r * 0.8, [[0, '#e9fdff'], [1, C.blue]]), lw * 0.8);
      ctx.fillStyle = rgba('#ffffff', 0.8);
      ctx.fill(ellipse(cx - r * 0.25, cy - r * 0.2, r * 0.15, r * 0.08, -0.4));
      break;
    case 'map':
      ink(ctx, poly([cx - r * 0.9, cy - r * 0.6, cx - r * 0.3, cy - r * 0.8, cx + r * 0.3, cy - r * 0.6, cx + r * 0.9, cy - r * 0.8, cx + r * 0.9, cy + r * 0.6, cx + r * 0.3, cy + r * 0.8, cx - r * 0.3, cy + r * 0.6, cx - r * 0.9, cy + r * 0.8]), color === C.yellow ? C.cream : color, lw);
      ctx.strokeStyle = C.red;
      ctx.setLineDash([r * 0.12, r * 0.1]);
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.6, cy + r * 0.4);
      ctx.quadraticCurveTo(cx, cy - r * 0.6, cx + r * 0.45, cy);
      ctx.stroke();
      ctx.setLineDash([]);
      ink(ctx, star(cx + r * 0.5, cy, 5, r * 0.2, r * 0.09), C.red, lw * 0.4);
      break;
    case 'clock':
      ink(ctx, circle(cx, cy, r * 0.85), color === C.yellow ? C.white : color, lw);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw * 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - r * 0.55);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * 0.4, cy + r * 0.1);
      ctx.stroke();
      break;
    case 'rings':
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = lw * 2.4;
        ctx.beginPath();
        ctx.ellipse(cx - r * 0.5 + i * r * 0.5, cy, r * 0.28, r * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = [C.cyan, C.yellow, C.pink][i];
        ctx.lineWidth = lw * 1.2;
        ctx.stroke();
      }
      break;
    case 'shield': {
      const p = new Path2D();
      p.moveTo(cx, cy - r * 0.9);
      p.lineTo(cx + r * 0.75, cy - r * 0.55);
      p.quadraticCurveTo(cx + r * 0.7, cy + r * 0.55, cx, cy + r * 0.95);
      p.quadraticCurveTo(cx - r * 0.7, cy + r * 0.55, cx - r * 0.75, cy - r * 0.55);
      p.closePath();
      ink(ctx, p, color === C.yellow ? C.cyan : color, lw);
      ink(ctx, softStar(cx, cy, 5, r * 0.35, r * 0.16), C.white, lw * 0.5);
      break;
    }
    case 'glimmer':
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = r * 0.5;
      ink(ctx, softStar(cx, cy, 4, r * 0.95, r * 0.3, 0), color === C.yellow ? '#fff7b3' : color, lw);
      ctx.restore();
      ctx.fillStyle = C.ink;
      ctx.fill(circle(cx - r * 0.12, cy - r * 0.02, r * 0.06));
      ctx.fill(circle(cx + r * 0.12, cy - r * 0.02, r * 0.06));
      break;
    case 'bunny':
      for (const s of [-1, 1]) ink(ctx, ellipse(cx + s * r * 0.28, cy - r * 0.55, r * 0.15, r * 0.4, s * 0.2), C.white, lw);
      ink(ctx, ellipse(cx, cy + r * 0.15, r * 0.65, r * 0.55), C.white, lw);
      ctx.fillStyle = C.ink;
      ctx.fill(circle(cx - r * 0.22, cy + r * 0.05, r * 0.07));
      ctx.fill(circle(cx + r * 0.22, cy + r * 0.05, r * 0.07));
      ctx.fillStyle = C.pink;
      ctx.fill(circle(cx, cy + r * 0.2, r * 0.07));
      break;
    case 'flower':
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ink(ctx, circle(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5, r * 0.35), color === C.yellow ? C.pink : color, lw);
      }
      ink(ctx, circle(cx, cy, r * 0.3), C.yellow, lw);
      break;
    case 'wormhole': {
      for (let i = 0; i < 5; i++) {
        const rr = r * (0.95 - i * 0.17);
        ctx.fillStyle = [C.violet, C.purple, C.pink, C.cyan, '#ffffff'][i];
        ctx.fill(ellipse(cx + i * r * 0.04, cy, rr, rr * 0.85));
      }
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = lw;
      ctx.stroke(ellipse(cx, cy, r * 0.95, r * 0.95 * 0.85));
      break;
    }
    case 'calendar':
      ink(ctx, roundRect(cx - r * 0.8, cy - r * 0.7, r * 1.6, r * 1.5, r * 0.15), C.white, lw);
      ink(ctx, roundRect(cx - r * 0.8, cy - r * 0.7, r * 1.6, r * 0.45, r * 0.15), color === C.yellow ? C.red : color, lw);
      ctx.fillStyle = C.ink;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ctx.fill(circle(cx - r * 0.45 + i * r * 0.45, cy + r * 0.05 + j * r * 0.38, r * 0.09));
      break;
    default:
      ink(ctx, circle(cx, cy, r * 0.8), color, lw);
  }
}
