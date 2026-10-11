import { C, rgba, shade } from './palette';

export type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/** Fill a path then stroke it with the ink outline. */
export function ink(ctx: Ctx, path: Path2D, fill: string | CanvasGradient | CanvasPattern, lw = 3, stroke: string = C.ink): void {
  ctx.fillStyle = fill;
  ctx.fill(path);
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = stroke;
    ctx.stroke(path);
  }
}

export function circle(x: number, y: number, r: number): Path2D {
  const p = new Path2D();
  p.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2);
  return p;
}

export function ellipse(x: number, y: number, rx: number, ry: number, rot = 0): Path2D {
  const p = new Path2D();
  p.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
  return p;
}

export function roundRect(x: number, y: number, w: number, h: number, r: number): Path2D {
  const p = new Path2D();
  const rr = Math.min(r, w / 2, h / 2);
  p.moveTo(x + rr, y);
  p.lineTo(x + w - rr, y);
  p.arcTo(x + w, y, x + w, y + rr, rr);
  p.lineTo(x + w, y + h - rr);
  p.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  p.lineTo(x + rr, y + h);
  p.arcTo(x, y + h, x, y + h - rr, rr);
  p.lineTo(x, y + rr);
  p.arcTo(x, y, x + rr, y, rr);
  p.closePath();
  return p;
}

export function star(cx: number, cy: number, spikes: number, outer: number, inner: number, rot = -Math.PI / 2): Path2D {
  const p = new Path2D();
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + i * step;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.closePath();
  return p;
}

/** Rounded star (softer corners for a friendlier look). */
export function softStar(cx: number, cy: number, spikes: number, outer: number, inner: number, rot = -Math.PI / 2): Path2D {
  const p = new Path2D();
  const step = Math.PI / spikes;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + i * step;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  const n = pts.length;
  const mid = (i: number): [number, number] => {
    const a = pts[i % n];
    const b = pts[(i + 1) % n];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  const m0 = mid(n - 1);
  p.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const m = mid(i);
    p.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  p.closePath();
  return p;
}

export function poly(points: number[]): Path2D {
  const p = new Path2D();
  for (let i = 0; i < points.length; i += 2) {
    if (i === 0) p.moveTo(points[i], points[i + 1]);
    else p.lineTo(points[i], points[i + 1]);
  }
  p.closePath();
  return p;
}

/** Smooth closed blob through points using quadratic midpoints. */
export function blob(points: number[]): Path2D {
  const p = new Path2D();
  const n = points.length / 2;
  const mx = (i: number) => (points[(i % n) * 2] + points[((i + 1) % n) * 2]) / 2;
  const my = (i: number) => (points[(i % n) * 2 + 1] + points[((i + 1) % n) * 2 + 1]) / 2;
  p.moveTo(mx(n - 1), my(n - 1));
  for (let i = 0; i < n; i++) p.quadraticCurveTo(points[i * 2], points[i * 2 + 1], mx(i), my(i));
  p.closePath();
  return p;
}

/** Random-ish round blob with `n` lobes. */
export function lumpyCircle(cx: number, cy: number, r: number, n: number, wobble: number, rand: () => number): Path2D {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 - wobble + rand() * wobble * 2);
    pts.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  return blob(pts);
}

export function radial(ctx: Ctx, x: number, y: number, r0: number, r1: number, stops: Array<[number, string]>, x1 = x, y1 = y): CanvasGradient {
  const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x1, y1, Math.max(0.01, r1));
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

export function linear(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: Array<[number, string]>): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** Soft glossy highlight in the upper-left of a shape (call while path is the clip). */
export function gloss(ctx: Ctx, x: number, y: number, w: number, h: number, alpha = 0.55): void {
  ctx.save();
  ctx.fillStyle = rgba('#ffffff', alpha);
  ctx.beginPath();
  ctx.ellipse(x + w * 0.32, y + h * 0.26, w * 0.2, h * 0.11, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Shaded fill: base color with lighter top-left and darker bottom-right. */
export function shadedFill(ctx: Ctx, cx: number, cy: number, r: number, color: string): CanvasGradient {
  return radial(ctx, cx - r * 0.35, cy - r * 0.4, r * 0.05, r * 1.25, [
    [0, shade(color, 0.35)],
    [0.55, color],
    [1, shade(color, -0.35)],
  ], cx, cy);
}

/** Soft round glow dot (used for particles, lights). */
export function glowDot(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = radial(ctx, cx, cy, 0, r, [
    [0, rgba('#ffffff', 1)],
    [0.25, rgba(color, 0.9)],
    [1, rgba(color, 0)],
  ]);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Simple cute face (two eyes and a smile) used by many characters. */
export function cuteFace(ctx: Ctx, cx: number, cy: number, s: number, opts: { eye?: string; blush?: string; mood?: 'happy' | 'wow' | 'think' | 'sleepy' } = {}): void {
  const eye = opts.eye ?? C.ink;
  const mood = opts.mood ?? 'happy';
  const ex = s * 0.38;
  ctx.fillStyle = eye;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    if (mood === 'sleepy') {
      ctx.lineWidth = s * 0.09;
      ctx.strokeStyle = eye;
      ctx.lineCap = 'round';
      ctx.arc(cx + sx * ex, cy - s * 0.05, s * 0.13, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      continue;
    }
    ctx.ellipse(cx + sx * ex, cy - s * 0.1, s * 0.13, s * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + sx * ex - s * 0.04, cy - s * 0.16, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = eye;
  }
  if (opts.blush) {
    ctx.fillStyle = rgba(opts.blush, 0.55);
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + sx * s * 0.62, cy + s * 0.12, s * 0.13, s * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = eye;
  ctx.lineWidth = s * 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 'wow') {
    ctx.fillStyle = eye;
    ctx.ellipse(cx, cy + s * 0.25, s * 0.1, s * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === 'think') {
    ctx.moveTo(cx - s * 0.15, cy + s * 0.25);
    ctx.lineTo(cx + s * 0.15, cy + s * 0.2);
    ctx.stroke();
  } else {
    ctx.arc(cx, cy + s * 0.08, s * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
}
