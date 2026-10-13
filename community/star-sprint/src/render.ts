/**
 * Draws the game on a canvas. All art is made in code: no image, font or sound files.
 * The score and timer are HTML (see index.html), so the canvas alone makes a clean preview.
 */
import { PLAYER_R, skySpeed, WORLD, type State } from './sim';

export function resize(canvas: HTMLCanvasElement) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, spin: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = spin + (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** A sleepy cloud: soft puffs with closed eyes and a tiny "z". */
function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#e9ecff';
  for (const [dx, dy, k] of [[-0.7, 0.15, 0.6], [0, -0.15, 0.8], [0.7, 0.15, 0.6], [0, 0.3, 0.7]] as const) {
    ctx.beginPath(); ctx.arc(x + dx * r, y + dy * r, r * k, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#5b6394'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(x + side * r * 0.28, y + r * 0.05, r * 0.12, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  ctx.fillStyle = '#9aa3d9'; ctx.font = `700 ${Math.round(r * 0.45)}px system-ui, sans-serif`; ctx.fillText('z', x + r * 0.75, y - r * 0.55);
}

/** Far-away twinkles that drift by slowly, for a sense of speed (still when motion is reduced). */
const DUST = Array.from({ length: 40 }, (_, i) => ({ x: (i * 977) % WORLD.w, y: (i * 613) % WORLD.h, r: 1.5 + (i % 3) }));

export function draw(ctx: CanvasRenderingContext2D, s: State, now: number, reducedMotion: boolean) {
  const { width, height } = ctx.canvas;
  // letterbox the 16:9 world into the canvas
  const scale = Math.min(width / WORLD.w, height / WORLD.h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#16224f');
  sky.addColorStop(1, '#3a2a66');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  ctx.setTransform(scale, 0, 0, scale, (width - WORLD.w * scale) / 2, (height - WORLD.h * scale) / 2);

  const t = reducedMotion ? 0 : now / 1000;
  const drift = reducedMotion ? 0 : (s.time * skySpeed(s) * 0.15) % WORLD.w;
  ctx.fillStyle = 'rgba(207, 214, 255, 0.45)';
  for (const d of DUST) { ctx.beginPath(); ctx.arc((d.x - drift + WORLD.w) % WORLD.w, d.y, d.r, 0, Math.PI * 2); ctx.fill(); }

  for (const thing of s.things) {
    if (thing.kind === 'cloud') { cloud(ctx, thing.x, thing.y + Math.sin(t * 1.5 + thing.id) * 5, thing.r); continue; }
    ctx.fillStyle = '#ffd95a';
    ctx.strokeStyle = '#fff4c2';
    ctx.lineWidth = 4;
    star(ctx, thing.x, thing.y, thing.r, thing.spin + t * 1.2);
    ctx.fill();
    ctx.stroke();
  }

  // the comet: a soft tail of fading puffs, a round glowing head and two eyes looking ahead
  const p = s.player, drowsy = s.sleepy > 0;
  for (let i = 6; i >= 1; i--) {
    ctx.fillStyle = `rgba(255, 196, 120, ${0.08 * (7 - i)})`;
    ctx.beginPath(); ctx.arc(p.x - i * 26, p.y - p.tilt * i * 18, PLAYER_R * (1 - i * 0.1), 0, Math.PI * 2); ctx.fill();
  }
  const glow = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, PLAYER_R * 2);
  glow.addColorStop(0, 'rgba(255, 220, 150, 0.5)');
  glow.addColorStop(1, 'rgba(255, 220, 150, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_R * 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = drowsy ? '#f3c98b' : '#ffb35c';
  ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2); ctx.fill();
  for (const side of [-1, 1]) {
    const ox = p.x + 12, oy = p.y + side * 13;
    if (drowsy) { ctx.strokeStyle = '#3b2a1b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(ox - 8, oy); ctx.lineTo(ox + 8, oy); ctx.stroke(); continue; }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ox, oy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1f2e'; ctx.beginPath(); ctx.arc(ox + 3, oy + p.tilt * 6, 4.5, 0, Math.PI * 2); ctx.fill();
  }
}
