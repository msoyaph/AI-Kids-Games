import { Rng } from '../../core/rng';
import { circle, ellipse, glowDot, lumpyCircle, radial, type Ctx } from '../canvas';
import { C, rgba, shade } from '../palette';

/** Visual recipe for a planet, moon, star or invented world. */
export interface PlanetLook {
  style: 'rocky' | 'cratered' | 'earth' | 'gas' | 'ice' | 'sun' | 'lava' | 'cloudy' | 'desert' | 'icy-moon' | 'haze' | 'alien' | 'dwarf';
  base: string;
  second: string;
  third?: string;
  glow?: string;
  rings?: { color: string; tilt: number; width: number };
  spot?: { color: string; x: number; y: number; w: number; h: number };
  polarCaps?: boolean;
  heart?: boolean;
  seed: number;
}

/** Draws a planet centered in a w*h box, radius = min(w,h)/2 minus glow margin. */
export function drawPlanet(ctx: Ctx, look: PlanetLook, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;
  const ringScale = look.rings ? 1.9 : 1;
  const r = (Math.min(w, h) / 2) * (look.rings ? 0.5 : 0.82) * (look.style === 'sun' ? 0.78 : 1);
  void ringScale;
  const rng = new Rng(look.seed);
  // Outer glow / atmosphere.
  if (look.glow) {
    ctx.fillStyle = radial(ctx, cx, cy, r * 0.9, r * (look.style === 'sun' ? 1.6 : 1.22), [
      [0, rgba(look.glow, look.style === 'sun' ? 0.8 : 0.55)],
      [1, rgba(look.glow, 0)],
    ]);
    ctx.fillRect(0, 0, w, h);
  }
  if (look.rings) drawRingHalf(ctx, look, cx, cy, r, true);

  ctx.save();
  const body = circle(cx, cy, r);
  ctx.clip(body);
  ctx.fillStyle = radial(ctx, cx - r * 0.35, cy - r * 0.35, r * 0.1, r * 1.3, [
    [0, shade(look.base, 0.3)],
    [0.6, look.base],
    [1, shade(look.base, -0.2)],
  ], cx, cy);
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  switch (look.style) {
    case 'gas':
    case 'ice':
    case 'cloudy': {
      const bands = look.style === 'gas' ? 9 : look.style === 'cloudy' ? 6 : 5;
      for (let i = 0; i < bands; i++) {
        const y = cy - r + (i + 0.5) * ((r * 2) / bands) + rng.range(-4, 4);
        const thick = ((r * 2) / bands) * rng.range(0.35, 0.7);
        const col = i % 2 === 0 ? look.second : look.third ?? shade(look.base, 0.15);
        ctx.fillStyle = rgba(col, look.style === 'ice' ? 0.35 : 0.75);
        ctx.beginPath();
        ctx.moveTo(cx - r * 1.1, y);
        const waves = 4;
        for (let k = 0; k <= waves; k++) {
          const x = cx - r * 1.1 + (k / waves) * r * 2.2;
          ctx.quadraticCurveTo(x - r * 0.25, y + rng.range(-6, 6), x, y + rng.range(-3, 3));
        }
        ctx.lineTo(cx + r * 1.1, y + thick);
        for (let k = waves; k >= 0; k--) {
          const x = cx - r * 1.1 + (k / waves) * r * 2.2;
          ctx.quadraticCurveTo(x + r * 0.25, y + thick + rng.range(-6, 6), x, y + thick + rng.range(-3, 3));
        }
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'earth': {
      ctx.fillStyle = look.second;
      for (let i = 0; i < 5; i++) {
        const a = rng.range(0, Math.PI * 2);
        const d = rng.range(0, r * 0.75);
        ctx.fill(lumpyCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rng.range(r * 0.18, r * 0.38), 9, 0.35, () => rng.next()));
      }
      ctx.fillStyle = rgba('#ffffff', 0.75);
      for (let i = 0; i < 6; i++) {
        ctx.fill(ellipse(cx + rng.range(-r, r), cy + rng.range(-r, r), rng.range(r * 0.15, r * 0.35), rng.range(r * 0.04, r * 0.08), rng.range(-0.3, 0.3)));
      }
      break;
    }
    case 'cratered':
    case 'rocky':
    case 'desert':
    case 'dwarf':
    case 'icy-moon': {
      if (look.style === 'desert' || look.style === 'rocky') {
        ctx.fillStyle = rgba(look.second, 0.5);
        for (let i = 0; i < 6; i++) {
          ctx.fill(lumpyCircle(cx + rng.range(-r, r), cy + rng.range(-r, r), rng.range(r * 0.15, r * 0.35), 8, 0.4, () => rng.next()));
        }
      }
      if (look.style === 'icy-moon') {
        ctx.strokeStyle = rgba(look.second, 0.8);
        ctx.lineWidth = Math.max(1.5, r * 0.025);
        for (let i = 0; i < 10; i++) {
          ctx.beginPath();
          let x = cx + rng.range(-r, r);
          let y = cy + rng.range(-r, r);
          ctx.moveTo(x, y);
          for (let k = 0; k < 4; k++) {
            x += rng.range(-r * 0.3, r * 0.3);
            y += rng.range(-r * 0.15, r * 0.15);
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      const craters = look.style === 'cratered' ? 14 : look.style === 'icy-moon' ? 3 : 7;
      for (let i = 0; i < craters; i++) {
        const cr = rng.range(r * 0.06, r * 0.2);
        const x = cx + rng.range(-r * 0.9, r * 0.9);
        const y = cy + rng.range(-r * 0.9, r * 0.9);
        ctx.fillStyle = rgba(shade(look.base, -0.35), 0.55);
        ctx.fill(circle(x, y, cr));
        ctx.fillStyle = rgba(shade(look.base, 0.35), 0.5);
        ctx.fill(ellipse(x - cr * 0.15, y - cr * 0.2, cr * 0.75, cr * 0.6));
        ctx.fillStyle = rgba(shade(look.base, -0.2), 0.6);
        ctx.fill(ellipse(x + cr * 0.05, y + cr * 0.05, cr * 0.7, cr * 0.6));
      }
      break;
    }
    case 'lava': {
      for (let i = 0; i < 12; i++) {
        const x = cx + rng.range(-r * 0.9, r * 0.9);
        const y = cy + rng.range(-r * 0.9, r * 0.9);
        const rr = rng.range(r * 0.05, r * 0.13);
        ctx.fillStyle = rgba(i % 3 === 0 ? '#3b2a1a' : look.second, 0.85);
        ctx.fill(lumpyCircle(x, y, rr, 7, 0.35, () => rng.next()));
        if (i % 3 !== 0) {
          ctx.fillStyle = rgba(C.yellow, 0.8);
          ctx.fill(circle(x, y, rr * 0.4));
        }
      }
      break;
    }
    case 'haze': {
      for (let i = 0; i < 5; i++) {
        const y = cy - r + i * r * 0.45;
        ctx.fillStyle = rgba(i % 2 ? look.second : shade(look.base, 0.15), 0.45);
        ctx.fillRect(cx - r, y, r * 2, r * 0.22);
      }
      break;
    }
    case 'alien': {
      ctx.fillStyle = look.second;
      for (let i = 0; i < 6; i++) {
        ctx.fill(lumpyCircle(cx + rng.range(-r * 0.8, r * 0.8), cy + rng.range(-r * 0.8, r * 0.8), rng.range(r * 0.12, r * 0.3), 8, 0.4, () => rng.next()));
      }
      ctx.fillStyle = rgba(look.third ?? C.yellow, 0.9);
      for (let i = 0; i < 18; i++) ctx.fill(circle(cx + rng.range(-r, r), cy + rng.range(-r, r), rng.range(1.5, 3.5)));
      break;
    }
    case 'sun': {
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = rgba(i % 2 ? look.second : '#fff6c0', 0.35);
        ctx.fill(circle(cx + rng.range(-r, r), cy + rng.range(-r, r), rng.range(r * 0.1, r * 0.25)));
      }
      break;
    }
  }
  if (look.polarCaps) {
    ctx.fillStyle = rgba('#ffffff', 0.92);
    ctx.fill(ellipse(cx, cy - r * 0.95, r * 0.45, r * 0.2));
    ctx.fill(ellipse(cx, cy + r * 0.97, r * 0.35, r * 0.14));
  }
  if (look.spot) {
    const s = look.spot;
    ctx.fillStyle = shade(s.color, -0.15);
    ctx.fill(ellipse(cx + s.x * r, cy + s.y * r, s.w * r, s.h * r));
    ctx.fillStyle = s.color;
    ctx.fill(ellipse(cx + s.x * r, cy + s.y * r, s.w * r * 0.72, s.h * r * 0.65));
  }
  if (look.heart) {
    const hx = cx + r * 0.15;
    const hy = cy + r * 0.2;
    const hr = r * 0.42;
    const p = new Path2D();
    p.moveTo(hx, hy + hr * 0.8);
    p.bezierCurveTo(hx - hr * 1.1, hy + hr * 0.05, hx - hr * 0.75, hy - hr * 0.85, hx, hy - hr * 0.35);
    p.bezierCurveTo(hx + hr * 0.75, hy - hr * 0.85, hx + hr * 1.1, hy + hr * 0.05, hx, hy + hr * 0.8);
    ctx.fillStyle = rgba('#fff3e6', 0.85);
    ctx.fill(p);
  }
  // Shadow side (day/night terminator) for a 3D look.
  if (look.style !== 'sun') {
    ctx.fillStyle = radial(ctx, cx - r * 0.45, cy - r * 0.45, r * 0.6, r * 2.1, [
      [0, rgba('#000000', 0)],
      [0.55, rgba('#0a0630', 0.1)],
      [1, rgba('#0a0630', 0.6)],
    ]);
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  // Rim light.
  ctx.lineWidth = r * 0.07;
  ctx.strokeStyle = rgba('#ffffff', look.style === 'sun' ? 0.4 : 0.22);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.96, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();
  ctx.restore();

  ctx.lineWidth = Math.max(2, r * 0.035);
  ctx.strokeStyle = look.style === 'sun' ? shade(look.base, -0.3) : C.ink;
  ctx.stroke(body);

  if (look.rings) drawRingHalf(ctx, look, cx, cy, r, false);
}

function drawRingHalf(ctx: Ctx, look: PlanetLook, cx: number, cy: number, r: number, back: boolean): void {
  const ring = look.rings!;
  const rx = r * (1.55 + ring.width * 0.35);
  const ry = rx * ring.tilt;
  ctx.save();
  ctx.beginPath();
  if (back) ctx.rect(cx - rx * 1.2, cy - ry * 1.5 - 4, rx * 2.4, ry * 1.5 + 4);
  else ctx.rect(cx - rx * 1.2, cy, rx * 2.4, ry * 1.5 + 6);
  ctx.clip();
  const bands = 4;
  for (let i = bands; i >= 0; i--) {
    const k = 1 - i * 0.09 * ring.width;
    ctx.lineWidth = r * 0.1 * ring.width;
    ctx.strokeStyle = i % 2 === 0 ? ring.color : rgba(shade(ring.color, -0.25), 0.85);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * k, ry * k, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(C.ink, 0.7);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + r * 0.05 * ring.width, ry + r * 0.05 * ring.width * ring.tilt, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Seamless tile of stars for parallax backgrounds. */
export function drawStarTile(ctx: Ctx, w: number, h: number, seed: number, count: number, maxR: number, colorful: boolean): void {
  const rng = new Rng(seed);
  const tints = ['#ffffff', '#ffffff', '#fff3c2', '#cfe8ff', '#ffd6f1'];
  for (let i = 0; i < count; i++) {
    const x = rng.range(0, w);
    const y = rng.range(0, h);
    const r = rng.range(0.6, maxR);
    const col = colorful ? rng.pick(tints) : '#ffffff';
    const alpha = rng.range(0.45, 1);
    for (const ox of [-w, 0, w]) {
      for (const oy of [-h, 0, h]) {
        const px = x + ox;
        const py = y + oy;
        if (px < -r * 3 || px > w + r * 3 || py < -r * 3 || py > h + r * 3) continue;
        if (r > maxR * 0.7) {
          ctx.globalAlpha = alpha;
          glowDot(ctx, px, py, r * 3, col);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = rgba(col, alpha);
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

/** Big soft nebula cloud. */
export function drawNebula(ctx: Ctx, w: number, h: number, colors: string[], seed: number): void {
  const rng = new Rng(seed);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const x = w * rng.range(0.2, 0.8);
    const y = h * rng.range(0.25, 0.75);
    const r = Math.min(w, h) * rng.range(0.2, 0.45);
    const col = colors[i % colors.length];
    ctx.fillStyle = radial(ctx, x, y, 0, r, [
      [0, rgba(col, 0.32)],
      [0.5, rgba(col, 0.14)],
      [1, rgba(col, 0)],
    ]);
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'source-over';
}
