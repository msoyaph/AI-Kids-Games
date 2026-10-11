import { css, darken, lighten, mixColor } from '../../core/math';
import { ELEMENTS } from '../../data/elements';
import type { TowerDef } from '../../data/towers';
import {
  ballGradient,
  circle,
  ellipse,
  elementIcon,
  fillStroke,
  gemShape,
  glowDot,
  polygon,
  roundRect,
  shine,
  softShadow,
  starPath,
  type Ctx,
} from './paint';

export const TOWER_BASE_SIZE = 78;
export const TOWER_HEAD_SIZE = 76;

const RIM_BY_LEVEL = [0x8d8aa6, 0xc9d3e6, 0xffcf4a, 0x9ff3ff];

/** Stone platform with element-coloured inlay and level gems. */
export function drawTowerBase(ctx: Ctx, def: TowerDef, level: number): void {
  const S = TOWER_BASE_SIZE;
  const cx = S / 2;
  const cy = S / 2;
  const r = 27;
  softShadow(ctx, cx + 3, cy + 6, r + 7, r + 4, 0.42);

  // Outer rim (material improves with level)
  const rim = RIM_BY_LEVEL[level - 1]!;
  const sides = def.kind === 'basic' ? 8 : def.kind === 'element' ? 6 : 10;
  polygon(ctx, cx, cy, sides, r + 3, -Math.PI / 2 + Math.PI / sides);
  fillStroke(ctx, ballGradient(ctx, cx, cy, r + 3, rim), darken(rim, 0.55), 2.2);

  // Inner plate coloured by element(s)
  const els = def.elements.map((e) => ELEMENTS[e]);
  let plate = 0x6a6487;
  if (els.length === 1) plate = mixColor(els[0]!.color, 0x45405e, 0.45);
  if (els.length === 2) plate = mixColor(mixColor(els[0]!.color, els[1]!.color, 0.5), 0x45405e, 0.45);
  if (def.kind === 'basic') plate = mixColor(def.look.body, 0x5b5470, 0.5);
  circle(ctx, cx, cy, r - 3);
  fillStroke(ctx, ballGradient(ctx, cx, cy, r - 3, plate), darken(plate, 0.5), 1.5);

  if (els.length === 2) {
    // split ring showing both elements
    ctx.lineWidth = 4;
    ctx.strokeStyle = css(els[0]!.color);
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
    ctx.strokeStyle = css(els[1]!.color);
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, Math.PI * 1.5, Math.PI * 2.5);
    ctx.stroke();
  } else if (els.length === 1) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = css(els[0]!.color, 0.9);
    circle(ctx, cx, cy, r - 1);
    ctx.stroke();
  }

  // Level 4: crystal glow ring
  if (level >= 4) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(160,240,255,0.55)';
    ctx.lineWidth = 3;
    circle(ctx, cx, cy, r + 5.5);
    ctx.stroke();
    ctx.restore();
  }

  // Level gems along the bottom of the rim
  for (let i = 0; i < level; i++) {
    const a = Math.PI / 2 + (i - (level - 1) / 2) * 0.36;
    const gx = cx + Math.cos(a) * (r + 1.5);
    const gy = cy + Math.sin(a) * (r + 1.5);
    gemShape(ctx, gx, gy, 4.2, level >= 4 ? 0x8ff3ff : 0xffd23f, 0.9);
  }
}

/** Element icons engraved on element/combo plates (shape cue for colour-blind players). */
function engrave(ctx: Ctx, def: TowerDef, cx: number, cy: number, r: number): void {
  const els = def.elements.map((e) => ELEMENTS[e]);
  if (els.length === 1) elementIcon(ctx, els[0]!.icon, cx, cy, r, els[0]!.color);
  if (els.length === 2) {
    elementIcon(ctx, els[0]!.icon, cx - r * 0.75, cy, r * 0.8, els[0]!.color);
    elementIcon(ctx, els[1]!.icon, cx + r * 0.75, cy, r * 0.8, els[1]!.color);
  }
}

/**
 * Tower "head". Rotating heads face +x (angle 0); the renderer rotates them
 * toward targets. Size grows a little with level.
 */
export function drawTowerHead(ctx: Ctx, def: TowerDef, level: number): void {
  const S = TOWER_HEAD_SIZE;
  const k = 0.84 + level * 0.06;
  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.scale(k, k);
  const body = def.look.body;
  const acc = def.look.accent;
  const out = darken(body, 0.6);
  const els = def.elements.map((e) => ELEMENTS[e]);
  const e0 = els[0];
  const e1 = els[1] ?? els[0];

  switch (def.look.shape) {
    case 'post': {
      // wooden turret with a crossbow
      circle(ctx, 0, 0, 15);
      fillStroke(ctx, ballGradient(ctx, 0, 0, 15, body), out, 2);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.strokeStyle = css(darken(body, 0.3), 0.7);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
        ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
        ctx.stroke();
      }
      // bow
      ctx.strokeStyle = css(darken(body, 0.45));
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(2, 0, 16, -1.1, 1.1);
      ctx.stroke();
      ctx.strokeStyle = '#f4ead2';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(2 + Math.cos(-1.1) * 16, Math.sin(-1.1) * 16);
      ctx.lineTo(-4, 0);
      ctx.lineTo(2 + Math.cos(1.1) * 16, Math.sin(1.1) * 16);
      ctx.stroke();
      // arrow
      roundRect(ctx, -6, -1.6, 26, 3.2, 1.5);
      fillStroke(ctx, '#e9d7a8', 0x5a3a1a, 1);
      ctx.beginPath();
      ctx.moveTo(26, 0);
      ctx.lineTo(19, -4.5);
      ctx.lineTo(19, 4.5);
      ctx.closePath();
      fillStroke(ctx, css(acc), darken(acc, 0.5), 1.2);
      if (level >= 3) {
        circle(ctx, 0, 0, 4.5);
        fillStroke(ctx, ballGradient(ctx, 0, 0, 4.5, acc), darken(acc, 0.5), 1);
      }
      break;
    }
    case 'cannon': {
      roundRect(ctx, 0, -7, 26, 14, 5);
      fillStroke(ctx, vGradient2(ctx, -7, 7, lighten(body, 0.35), darken(body, 0.25)), out, 2);
      roundRect(ctx, 20, -8.5, 8, 17, 3);
      fillStroke(ctx, css(acc), darken(acc, 0.5), 1.6);
      circle(ctx, 0, 0, 15);
      fillStroke(ctx, ballGradient(ctx, 0, 0, 15, body), out, 2.2);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        circle(ctx, Math.cos(a) * 10, Math.sin(a) * 10, 1.8);
        ctx.fillStyle = css(darken(body, 0.4));
        ctx.fill();
      }
      circle(ctx, 0, 0, 6);
      fillStroke(ctx, ballGradient(ctx, 0, 0, 6, acc), darken(acc, 0.5), 1.2);
      break;
    }
    case 'spire': {
      // brazier bowl with dancing flame (non-rotating)
      polygon(ctx, 0, 2, 8, 17, Math.PI / 8);
      fillStroke(ctx, ballGradient(ctx, 0, 2, 17, body), out, 2);
      circle(ctx, 0, 2, 11);
      fillStroke(ctx, css(darken(body, 0.45)), out, 1.5);
      glowDot(ctx, 0, -2, 22, acc, 0.75);
      elementIcon(ctx, 'flame', 0, -5, 13 + level, e0?.color ?? acc);
      break;
    }
    case 'fountain': {
      circle(ctx, 0, 0, 18);
      fillStroke(ctx, ballGradient(ctx, 0, 0, 18, 0xd8e2f0), 0x4a5a78, 2);
      circle(ctx, 0, 0, 14);
      const g = ctx.createRadialGradient(-4, -4, 1, 0, 0, 14);
      g.addColorStop(0, css(lighten(acc, 0.4)));
      g.addColorStop(1, css(body));
      fillStroke(ctx, g, darken(body, 0.4), 1.2);
      for (let i = 0; i < 3 + level; i++) {
        const a = i * 2.1;
        const rr = 3 + (i % 3);
        circle(ctx, Math.cos(a) * 8, Math.sin(a) * 8, rr);
        fillStroke(ctx, 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.9)', 1);
      }
      elementIcon(ctx, 'drop', 0, -1, 8 + level, e0?.color ?? body);
      break;
    }
    case 'bloom': {
      // flower with thorn launcher pointing +x
      const petals = 6;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ellipse(ctx, 12, 0, 9, 6);
        fillStroke(ctx, ballGradient(ctx, 12, 0, 9, acc), darken(acc, 0.5), 1.5);
        ctx.restore();
      }
      circle(ctx, 0, 0, 10);
      fillStroke(ctx, ballGradient(ctx, 0, 0, 10, body), out, 2);
      // thorn
      ctx.beginPath();
      ctx.moveTo(24, 0);
      ctx.lineTo(6, -4);
      ctx.lineTo(6, 4);
      ctx.closePath();
      fillStroke(ctx, css(lighten(body, 0.25)), out, 1.4);
      if (e1 && e1 !== e0) elementIcon(ctx, e1.icon, -2, 0, 5.5, e1.color);
      else if (e0) elementIcon(ctx, e0.icon, -2, 0, 5.5, e0.color);
      break;
    }
    case 'prism': {
      polygon(ctx, 0, 0, 6, 19, 0);
      fillStroke(ctx, ballGradient(ctx, 0, 0, 19, body), out, 2);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 19, Math.sin(a) * 19);
        ctx.lineTo(Math.cos(a + Math.PI / 3) * 19, Math.sin(a + Math.PI / 3) * 19);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.25)' : 'rgba(120,70,0,0.12)';
        ctx.fill();
      }
      glowDot(ctx, 0, 0, 16, acc, 0.9);
      elementIcon(ctx, 'star', 0, 0, 8 + level, e0?.color ?? acc);
      break;
    }
    case 'lantern': {
      // square lantern roof seen from above, glowing core
      glowDot(ctx, 0, 0, 24, acc, 0.6);
      ctx.save();
      ctx.rotate(Math.PI / 4);
      roundRect(ctx, -15, -15, 30, 30, 6);
      fillStroke(ctx, ballGradient(ctx, 0, 0, 18, body), out, 2);
      ctx.strokeStyle = css(lighten(body, 0.35), 0.8);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-15, -15);
      ctx.lineTo(15, 15);
      ctx.moveTo(15, -15);
      ctx.lineTo(-15, 15);
      ctx.stroke();
      ctx.restore();
      circle(ctx, 0, 0, 9);
      fillStroke(ctx, ballGradient(ctx, 0, 0, 9, acc), darken(acc, 0.5), 1.4);
      if (e1 && e1 !== e0) {
        elementIcon(ctx, e0!.icon, -6, 0, 6, e0!.color);
        elementIcon(ctx, e1.icon, 6, 0, 6, e1.color);
      } else if (e0) elementIcon(ctx, e0.icon, 0, 0, 7.5, e0.color);
      break;
    }
    case 'rock': {
      ctx.beginPath();
      const pts = [
        [-18, -6],
        [-10, -17],
        [6, -18],
        [18, -8],
        [19, 8],
        [8, 18],
        [-9, 17],
        [-19, 6],
      ];
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x!, y!) : ctx.moveTo(x!, y!)));
      ctx.closePath();
      fillStroke(ctx, ballGradient(ctx, 0, 0, 20, body), out, 2.2);
      ctx.strokeStyle = css(acc, 0.9);
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-8, -10);
      ctx.lineTo(-2, -2);
      ctx.lineTo(-7, 6);
      ctx.moveTo(-2, -2);
      ctx.lineTo(9, 1);
      ctx.lineTo(12, 9);
      ctx.stroke();
      glowDot(ctx, 0, 0, 10 + level * 2, acc, 0.45);
      elementIcon(ctx, 'hex', 0, 0, 6 + level, e0?.color ?? body);
      break;
    }
    case 'vent': {
      circle(ctx, 0, 0, 18);
      fillStroke(ctx, ballGradient(ctx, 0, 0, 18, body), out, 2);
      for (let i = -2; i <= 2; i++) {
        roundRect(ctx, -12, i * 5 - 1.5, 24, 3, 1.5);
        ctx.fillStyle = css(darken(body, 0.5));
        ctx.fill();
      }
      glowDot(ctx, 0, 0, 14, acc, 0.5);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.6;
        circle(ctx, Math.cos(a) * 14, Math.sin(a) * 14, 3.5);
        fillStroke(ctx, ballGradient(ctx, Math.cos(a) * 14, Math.sin(a) * 14, 3.5, i % 2 ? e0!.color : e1!.color), out, 1);
      }
      engrave(ctx, def, 0, 0, 6);
      break;
    }
    case 'tree': {
      // canopy blobs
      const blobs = [
        [0, 0, 15],
        [-10, -8, 10],
        [10, -8, 10],
        [-11, 8, 10],
        [11, 8, 10],
      ];
      for (const [x, y, r] of blobs) {
        circle(ctx, x!, y!, r!);
        fillStroke(ctx, ballGradient(ctx, x!, y!, r!, body), out, 1.8);
      }
      for (let i = 0; i < 3 + level; i++) {
        const a = i * 1.9 + 0.4;
        const rr = 9 + (i % 2) * 4;
        if (def.id === 'raingarden') elementIcon(ctx, 'drop', Math.cos(a) * rr, Math.sin(a) * rr, 3.5, acc, true);
        else {
          circle(ctx, Math.cos(a) * rr, Math.sin(a) * rr, 2.6);
          fillStroke(ctx, css(acc), darken(acc, 0.5), 0.8);
        }
      }
      if (def.rotates) {
        // ironbark branch launcher
        roundRect(ctx, 4, -3.5, 22, 7, 3);
        fillStroke(ctx, css(lighten(body, 0.15)), out, 1.6);
      }
      engrave(ctx, def, 0, 0, 5.5);
      break;
    }
    case 'orb': {
      polygon(ctx, 0, 0, 8, 17, Math.PI / 8);
      fillStroke(ctx, ballGradient(ctx, 0, 0, 17, body), out, 2);
      if (def.rotates) {
        // emitter lens pointing +x
        roundRect(ctx, 6, -5, 18, 10, 4);
        fillStroke(ctx, ballGradient(ctx, 14, 0, 10, darken(body, 0.2)), out, 1.6);
        circle(ctx, 24, 0, 4.5);
        fillStroke(ctx, ballGradient(ctx, 24, 0, 4.5, acc), darken(acc, 0.5), 1.2);
      }
      glowDot(ctx, 0, 0, 22, acc, 0.7);
      circle(ctx, 0, 0, 10);
      if (def.id === 'eclipse') {
        fillStroke(ctx, ballGradient(ctx, 0, 0, 10, 0xffe66b), 0x6a4a00, 1.5);
        circle(ctx, 3.5, -2, 8);
        ctx.fillStyle = css(0x2a1a50);
        ctx.fill();
      } else {
        fillStroke(ctx, ballGradient(ctx, 0, 0, 10, acc), darken(acc, 0.45), 1.5);
        starPath(ctx, 0, 0, 8, 15, 10.5, 0);
        ctx.strokeStyle = css(lighten(acc, 0.5), 0.8);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      break;
    }
    case 'mortar': {
      circle(ctx, 0, 0, 17);
      fillStroke(ctx, ballGradient(ctx, 0, 0, 17, body), out, 2);
      roundRect(ctx, -2, -9, 22, 18, 8);
      fillStroke(ctx, vGradient2(ctx, -9, 9, lighten(body, 0.3), darken(body, 0.3)), out, 2);
      ellipse(ctx, 19, 0, 5, 8);
      fillStroke(ctx, ballGradient(ctx, 19, 0, 8, acc), darken(acc, 0.5), 1.4);
      glowDot(ctx, 19, 0, 10, acc, 0.6);
      engrave(ctx, def, -6, 0, 5);
      break;
    }
    case 'totem': {
      circle(ctx, 0, 0, 19);
      fillStroke(ctx, ballGradient(ctx, 0, 0, 19, lighten(body, 0.2)), out, 1.8);
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        circle(ctx, Math.cos(a) * 15, Math.sin(a) * 15, 1.6);
        ctx.fillStyle = css(darken(body, 0.3), 0.7);
        ctx.fill();
      }
      roundRect(ctx, -10, -11, 20, 22, 6);
      fillStroke(ctx, ballGradient(ctx, 0, 0, 13, body), out, 2);
      // carved friendly face
      ctx.fillStyle = css(darken(body, 0.55));
      circle(ctx, -4.5, -3, 2.4);
      ctx.fill();
      circle(ctx, 4.5, -3, 2.4);
      ctx.fill();
      ctx.strokeStyle = css(darken(body, 0.55));
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 2, 4, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      engrave(ctx, def, 0, 15, 4);
      glowDot(ctx, 0, 0, 20, acc, 0.25);
      break;
    }
    case 'flower': {
      const petals = 10;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ellipse(ctx, 14, 0, 8, 4.5);
        fillStroke(ctx, ballGradient(ctx, 14, 0, 8, acc), darken(acc, 0.45), 1.2);
        ctx.restore();
      }
      circle(ctx, 0, 0, 10.5);
      fillStroke(ctx, ballGradient(ctx, 0, 0, 10.5, body), out, 1.8);
      for (let i = 0; i < 12; i++) {
        const a = i * 2.4;
        const rr = (i / 12) * 8;
        circle(ctx, Math.cos(a) * rr, Math.sin(a) * rr, 1.1);
        ctx.fillStyle = css(darken(body, 0.45));
        ctx.fill();
      }
      engrave(ctx, def, 0, 0, 4.5);
      break;
    }
    case 'crystal': {
      const shards = [
        [0, -4, 9, 20, 0],
        [-10, 4, 6, 14, -0.5],
        [10, 4, 6, 14, 0.5],
        [-4, 10, 5, 11, -0.2],
        [5, 11, 5, 10, 0.25],
      ];
      for (const [x, y, w, h, rot] of shards) {
        ctx.save();
        ctx.translate(x!, y!);
        ctx.rotate(rot!);
        ctx.beginPath();
        ctx.moveTo(0, -h!);
        ctx.lineTo(w!, -h! * 0.35);
        ctx.lineTo(w! * 0.6, h! * 0.4);
        ctx.lineTo(-w! * 0.6, h! * 0.4);
        ctx.lineTo(-w!, -h! * 0.35);
        ctx.closePath();
        const g = ctx.createLinearGradient(-w!, -h!, w!, h!);
        g.addColorStop(0, css(lighten(acc, 0.6)));
        g.addColorStop(0.5, css(acc));
        g.addColorStop(1, css(e1 ? e1.color : body));
        fillStroke(ctx, g, darken(body, 0.5), 1.4);
        ctx.restore();
      }
      glowDot(ctx, 0, 0, 22, acc, 0.45);
      engrave(ctx, def, 0, 17, 4.5);
      break;
    }
    case 'well': {
      circle(ctx, 0, 0, 19);
      fillStroke(ctx, ballGradient(ctx, 0, 0, 19, 0x9b93b8), 0x3a3456, 2);
      circle(ctx, 0, 0, 14.5);
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 14.5);
      g.addColorStop(0, css(darken(body, 0.6)));
      g.addColorStop(1, css(body));
      fillStroke(ctx, g, darken(body, 0.5), 1.2);
      ctx.strokeStyle = css(acc, 0.85);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        for (let t = 0; t < 1; t += 0.05) {
          const a = t * Math.PI * 1.6 + (i * Math.PI * 2) / 3;
          const rr = 2 + t * 11;
          const x = Math.cos(a) * rr;
          const y = Math.sin(a) * rr;
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      glowDot(ctx, 0, 0, 10, acc, 0.6);
      engrave(ctx, def, 0, 17, 4);
      break;
    }
  }
  // Level 3+ sparkle crown
  if (level >= 3) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < level - 1; i++) {
      const a = -Math.PI / 2 + (i - (level - 2) / 2) * 0.55;
      starPath(ctx, Math.cos(a) * 21, Math.sin(a) * 21, 4, 3.2, 1.2, 0);
      ctx.fillStyle = 'rgba(255,250,220,0.9)';
      ctx.fill();
    }
    ctx.restore();
  }
  shine(ctx, -6, -9, 7, 4, 0.35);
  ctx.restore();
}

function vGradient2(ctx: Ctx, y0: number, y1: number, top: number, bottom: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, css(top));
  g.addColorStop(1, css(bottom));
  return g;
}

/** A full composite tower icon (base + head) for the DOM UI. */
export function drawTowerIcon(ctx: Ctx, def: TowerDef, level: number, size: number): void {
  const k = size / TOWER_BASE_SIZE;
  ctx.save();
  ctx.scale(k, k);
  drawTowerBase(ctx, def, level);
  ctx.translate((TOWER_BASE_SIZE - TOWER_HEAD_SIZE) / 2, (TOWER_BASE_SIZE - TOWER_HEAD_SIZE) / 2 - 3);
  if (def.rotates) {
    ctx.translate(TOWER_HEAD_SIZE / 2, TOWER_HEAD_SIZE / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.translate(-TOWER_HEAD_SIZE / 2, -TOWER_HEAD_SIZE / 2);
  }
  drawTowerHead(ctx, def, level);
  ctx.restore();
}
