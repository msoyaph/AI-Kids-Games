/**
 * Canvas2D painting helpers shared by all procedural art. Everything here is
 * run once at bake time, never per frame.
 */
import { css, darken, lighten } from '../../core/math';
import type { ElementIcon } from '../../data/elements';

export type Ctx = CanvasRenderingContext2D;

export function softShadow(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, alpha = 0.35): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(10,5,30,${alpha})`);
  g.addColorStop(0.6, `rgba(10,5,30,${alpha * 0.55})`);
  g.addColorStop(1, 'rgba(10,5,30,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Radial "ball" gradient lit from the top-left. */
export function ballGradient(ctx: Ctx, cx: number, cy: number, r: number, color: number): CanvasGradient {
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r * 1.05);
  g.addColorStop(0, css(lighten(color, 0.55)));
  g.addColorStop(0.45, css(color));
  g.addColorStop(1, css(darken(color, 0.35)));
  return g;
}

export function vGradient(ctx: Ctx, y0: number, y1: number, top: number, bottom: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, css(top));
  g.addColorStop(1, css(bottom));
  return g;
}

export function circle(ctx: Ctx, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
}

export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function polygon(ctx: Ctx, cx: number, cy: number, sides: number, r: number, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function starPath(ctx: Ctx, cx: number, cy: number, points: number, rOuter: number, rInner: number, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = rot + (i / (points * 2)) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Fill the current path then stroke it with a dark outline. */
export function fillStroke(ctx: Ctx, fill: string | CanvasGradient, stroke: number | string, lw: number): void {
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = typeof stroke === 'number' ? css(stroke) : stroke;
    ctx.stroke();
  }
}

/** Glossy white highlight blob. */
export function shine(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, alpha = 0.55, rot = -0.5): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.scale(1, ry / rx);
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function glowDot(ctx: Ctx, cx: number, cy: number, r: number, color: number, alpha = 0.8): void {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, css(lighten(color, 0.6), alpha));
  g.addColorStop(0.35, css(color, alpha * 0.6));
  g.addColorStop(1, css(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

// ------------------------------------------------------------------ faces

export interface FaceOpts {
  eyeR: number;
  spread: number;
  mood?: 'happy' | 'cheeky' | 'grumpy' | 'sleepy';
  blush?: boolean;
  pupil?: number;
}

/** Big cute eyes + smile. (cx, cy) = point between the eyes. */
export function cuteFace(ctx: Ctx, cx: number, cy: number, o: FaceOpts): void {
  const { eyeR, spread } = o;
  const mood = o.mood ?? 'happy';
  for (const side of [-1, 1]) {
    const ex = cx + side * spread;
    // white
    ctx.fillStyle = '#ffffff';
    ellipse(ctx, ex, cy, eyeR, eyeR * 1.15);
    ctx.fill();
    ctx.lineWidth = Math.max(1, eyeR * 0.22);
    ctx.strokeStyle = 'rgba(30,15,50,0.85)';
    ctx.stroke();
    // pupil
    const pr = eyeR * (o.pupil ?? 0.58);
    ctx.fillStyle = '#21123d';
    ellipse(ctx, ex + side * eyeR * 0.08, cy + eyeR * 0.12, pr, pr * 1.12);
    ctx.fill();
    // sparkle
    ctx.fillStyle = '#ffffff';
    circle(ctx, ex - pr * 0.35, cy - pr * 0.3, pr * 0.38);
    ctx.fill();
    circle(ctx, ex + pr * 0.35, cy + pr * 0.45, pr * 0.16);
    ctx.fill();
    if (mood === 'grumpy') {
      ctx.strokeStyle = '#21123d';
      ctx.lineWidth = eyeR * 0.35;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - side * eyeR * 1.0, cy - eyeR * 1.35);
      ctx.lineTo(ex + side * eyeR * 0.7, cy - eyeR * 0.95);
      ctx.stroke();
    }
    if (mood === 'sleepy') {
      ctx.fillStyle = 'rgba(0,0,0,0.0)';
    }
  }
  if (o.blush !== false) {
    ctx.fillStyle = 'rgba(255,110,150,0.45)';
    ellipse(ctx, cx - spread * 1.55, cy + eyeR * 1.25, eyeR * 0.6, eyeR * 0.35);
    ctx.fill();
    ellipse(ctx, cx + spread * 1.55, cy + eyeR * 1.25, eyeR * 0.6, eyeR * 0.35);
    ctx.fill();
  }
  // mouth
  ctx.strokeStyle = '#21123d';
  ctx.lineWidth = Math.max(1, eyeR * 0.3);
  ctx.lineCap = 'round';
  ctx.beginPath();
  const my = cy + eyeR * 1.45;
  if (mood === 'cheeky') {
    ctx.arc(cx + eyeR * 0.2, my - eyeR * 0.3, eyeR * 0.65, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#ff6b8a';
    ellipse(ctx, cx + eyeR * 0.4, my + eyeR * 0.35, eyeR * 0.28, eyeR * 0.22);
    ctx.fill();
  } else if (mood === 'grumpy') {
    ctx.arc(cx, my + eyeR * 0.5, eyeR * 0.55, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  } else {
    ctx.arc(cx, my - eyeR * 0.35, eyeR * 0.6, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.stroke();
  }
}

// ---------------------------------------------------------- element icons

/**
 * Draws an element icon centred at (cx, cy) with radius r. Every element has
 * a unique silhouette so colour is never the only cue.
 */
export function elementIcon(ctx: Ctx, icon: ElementIcon, cx: number, cy: number, r: number, color: number, outline = true): void {
  const dark = darken(color, 0.72);
  const lw = outline ? Math.max(1.1, r * 0.15) : 0;
  // crisp two-tone "cut crystal" fill: lit upper-left, shaded lower-right
  const fill = (): CanvasGradient => {
    const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    g.addColorStop(0, css(lighten(color, 0.55)));
    g.addColorStop(0.48, css(lighten(color, 0.1)));
    g.addColorStop(0.52, css(color));
    g.addColorStop(1, css(darken(color, 0.38)));
    return g;
  };
  const edge = (x0: number, y0: number, x1: number, y1: number): void => {
    ctx.strokeStyle = css(lighten(color, 0.75), 0.85);
    ctx.lineWidth = Math.max(0.8, r * 0.09);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };
  ctx.save();
  switch (icon) {
    case 'flame': {
      // angular three-tongue flame
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.05, cy - r);
      ctx.lineTo(cx + r * 0.42, cy - r * 0.28);
      ctx.lineTo(cx + r * 0.62, cy - r * 0.62);
      ctx.lineTo(cx + r * 0.82, cy + r * 0.2);
      ctx.lineTo(cx + r * 0.45, cy + r * 0.9);
      ctx.lineTo(cx - r * 0.45, cy + r * 0.9);
      ctx.lineTo(cx - r * 0.82, cy + r * 0.15);
      ctx.lineTo(cx - r * 0.52, cy - r * 0.42);
      ctx.lineTo(cx - r * 0.3, cy - r * 0.08);
      ctx.closePath();
      fillStroke(ctx, fill(), dark, lw);
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.2);
      ctx.lineTo(cx + r * 0.32, cy + r * 0.38);
      ctx.lineTo(cx + r * 0.18, cy + r * 0.72);
      ctx.lineTo(cx - r * 0.18, cy + r * 0.72);
      ctx.lineTo(cx - r * 0.32, cy + r * 0.38);
      ctx.closePath();
      ctx.fillStyle = css(lighten(color, 0.7));
      ctx.fill();
      break;
    }
    case 'drop': {
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.7, cy + r * 0.12);
      ctx.arc(cx, cy + r * 0.32, r * 0.72, -0.28, Math.PI + 0.28);
      ctx.closePath();
      fillStroke(ctx, fill(), dark, lw);
      edge(cx - r * 0.12, cy - r * 0.62, cx - r * 0.45, cy + r * 0.05);
      break;
    }
    case 'leaf': {
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.9, cy + r * 0.9);
      ctx.lineTo(cx - r * 0.78, cy - r * 0.12);
      ctx.lineTo(cx - r * 0.2, cy - r * 0.78);
      ctx.lineTo(cx + r * 0.92, cy - r * 0.92);
      ctx.lineTo(cx + r * 0.78, cy + r * 0.2);
      ctx.lineTo(cx + r * 0.12, cy + r * 0.8);
      ctx.closePath();
      fillStroke(ctx, fill(), dark, lw);
      edge(cx - r * 0.7, cy + r * 0.7, cx + r * 0.6, cy - r * 0.6);
      break;
    }
    case 'star': {
      starPath(ctx, cx, cy + r * 0.06, 5, r * 1.04, r * 0.44);
      fillStroke(ctx, fill(), dark, lw);
      edge(cx, cy - r * 0.55, cx, cy + r * 0.05);
      break;
    }
    case 'moon': {
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.94, Math.PI * 0.32, Math.PI * 1.68, false);
      ctx.arc(cx + r * 0.42, cy - r * 0.08, r * 0.72, Math.PI * 1.42, Math.PI * 0.62, true);
      ctx.closePath();
      fillStroke(ctx, fill(), dark, lw);
      starPath(ctx, cx + r * 0.5, cy - r * 0.18, 4, r * 0.3, r * 0.09);
      ctx.fillStyle = css(lighten(color, 0.75));
      ctx.fill();
      break;
    }
    case 'hex': {
      polygon(ctx, cx, cy, 6, r * 0.96, Math.PI / 6);
      fillStroke(ctx, fill(), dark, lw);
      polygon(ctx, cx, cy, 6, r * 0.52, Math.PI / 6);
      ctx.strokeStyle = css(darken(color, 0.35), 0.9);
      ctx.lineWidth = Math.max(0.8, r * 0.1);
      ctx.stroke();
      edge(cx - r * 0.78, cy - r * 0.45, cx - r * 0.05, cy - r * 0.86);
      break;
    }
  }
  ctx.restore();
}

/** A soft coloured badge disc with an element icon on top. */
export function elementBadge(ctx: Ctx, icon: ElementIcon, cx: number, cy: number, r: number, color: number): void {
  circle(ctx, cx, cy, r);
  fillStroke(ctx, ballGradient(ctx, cx, cy, r, 0xffffff), darken(color, 0.45), Math.max(1, r * 0.14));
  elementIcon(ctx, icon, cx, cy + r * 0.04, r * 0.68, color, true);
}

/** Five-point star for ratings / sparkles. */
export function ratingStar(ctx: Ctx, cx: number, cy: number, r: number, filled: boolean): void {
  starPath(ctx, cx, cy + r * 0.06, 5, r, r * 0.48);
  if (filled) fillStroke(ctx, ballGradient(ctx, cx, cy, r, 0xffd23f), 0x9a5b00, r * 0.14);
  else fillStroke(ctx, 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.55)', r * 0.12);
}

export function gemShape(ctx: Ctx, cx: number, cy: number, r: number, color: number, lw = r * 0.12): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.85, cy - r * 0.25);
  ctx.lineTo(cx + r * 0.55, cy + r * 0.95);
  ctx.lineTo(cx - r * 0.55, cy + r * 0.95);
  ctx.lineTo(cx - r * 0.85, cy - r * 0.25);
  ctx.closePath();
  fillStroke(ctx, ballGradient(ctx, cx, cy, r, color), darken(color, 0.5), lw);
  ctx.strokeStyle = css(lighten(color, 0.6), 0.8);
  ctx.lineWidth = lw * 0.6;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.85, cy - r * 0.25);
  ctx.lineTo(cx, cy + r * 0.05);
  ctx.lineTo(cx + r * 0.85, cy - r * 0.25);
  ctx.moveTo(cx, cy + r * 0.05);
  ctx.lineTo(cx, cy + r * 0.95);
  ctx.stroke();
  shine(ctx, cx - r * 0.3, cy - r * 0.45, r * 0.25, r * 0.15, 0.9);
}

export function coinShape(ctx: Ctx, cx: number, cy: number, r: number): void {
  circle(ctx, cx, cy, r);
  fillStroke(ctx, ballGradient(ctx, cx, cy, r, 0xffc928), 0x9a5b00, r * 0.14);
  circle(ctx, cx, cy, r * 0.62);
  ctx.strokeStyle = 'rgba(160,95,0,0.6)';
  ctx.lineWidth = r * 0.1;
  ctx.stroke();
  starPath(ctx, cx, cy + r * 0.04, 4, r * 0.38, r * 0.14);
  ctx.fillStyle = '#fff6c4';
  ctx.fill();
}

export function heartShape(ctx: Ctx, cx: number, cy: number, r: number, color = 0xff4f7b): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.85);
  ctx.bezierCurveTo(cx - r * 1.3, cy - r * 0.05, cx - r * 0.75, cy - r * 1.05, cx, cy - r * 0.45);
  ctx.bezierCurveTo(cx + r * 0.75, cy - r * 1.05, cx + r * 1.3, cy - r * 0.05, cx, cy + r * 0.85);
  ctx.closePath();
  fillStroke(ctx, ballGradient(ctx, cx, cy, r, color), darken(color, 0.5), r * 0.14);
  shine(ctx, cx - r * 0.4, cy - r * 0.35, r * 0.25, r * 0.16, 0.85);
}
