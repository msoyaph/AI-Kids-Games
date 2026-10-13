/**
 * Draws the game on a canvas. All art is made in code: no image, font or sound files.
 * The score and timer are HTML (see index.html), so the canvas alone makes a clean preview.
 */
import { PLAYER_R, WORLD, type State } from './sim';

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

export function draw(ctx: CanvasRenderingContext2D, s: State, now: number, reducedMotion: boolean) {
  const { width, height } = ctx.canvas;
  // letterbox the 16:9 world into the canvas
  const scale = Math.min(width / WORLD.w, height / WORLD.h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#1d2a5c');
  sky.addColorStop(1, '#3b2f6b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  ctx.setTransform(scale, 0, 0, scale, (width - WORLD.w * scale) / 2, (height - WORLD.h * scale) / 2);

  // soft hills
  ctx.fillStyle = '#2a4a5e';
  ctx.beginPath();
  ctx.moveTo(0, WORLD.h);
  for (let x = 0; x <= WORLD.w; x += 40) ctx.lineTo(x, WORLD.h - 120 - Math.sin(x / 210) * 40);
  ctx.lineTo(WORLD.w, WORLD.h);
  ctx.fill();

  const t = reducedMotion ? 0 : now / 1000;
  for (const st of s.stars) {
    ctx.fillStyle = '#ffd95a';
    ctx.strokeStyle = '#fff4c2';
    ctx.lineWidth = 4;
    star(ctx, st.x, st.y + Math.sin(t * 2 + st.id) * 6, st.r, st.spin + t * 0.6);
    ctx.fill();
    ctx.stroke();
  }

  // the firefly: a glow, a round body, two eyes looking where it flies
  const p = s.player;
  const glow = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, PLAYER_R * 2.2);
  glow.addColorStop(0, 'rgba(255, 245, 160, 0.55)');
  glow.addColorStop(1, 'rgba(255, 245, 160, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_R * 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8fe3a8';
  ctx.beginPath(); ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2); ctx.fill();
  const ex = Math.cos(p.facing) * 10, ey = Math.sin(p.facing) * 10;
  for (const side of [-1, 1]) {
    const ox = p.x + ex - Math.sin(p.facing) * 12 * side, oy = p.y + ey + Math.cos(p.facing) * 12 * side;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ox, oy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1f2e'; ctx.beginPath(); ctx.arc(ox + ex * 0.3, oy + ey * 0.3, 4.5, 0, Math.PI * 2); ctx.fill();
  }
}
