import { css, darken, lighten, mixColor } from '../../core/math';
import { ELEMENTS, type ElementId } from '../../data/elements';
import type { EnemyDef } from '../../data/enemies';
import { elementIcon, type Ctx } from './paint';
import { chamferRect, crystal, energyCore, facets, glint, lens, metalGradient, rivet, runeRing, strokePath, TECH } from './tech';

export const TILE = 64;

/** Logical sprite box for an enemy (room for legs, rotors, ribbons and crowns). */
export function enemyBox(def: EnemyDef): { w: number; h: number } {
  const d = def.radius * TILE * 2;
  const wide = def.look === 'wisp' || def.look === 'drone' ? 1.9 : 1.55;
  const tall = def.look === 'archon' || def.boss ? 1.7 : 1.45;
  return { w: Math.ceil(d * wide), h: Math.ceil(d * tall) };
}

export function enemyBodyColor(def: EnemyDef, el: ElementId | null): number {
  return el ? mixColor(def.color, ELEMENTS[el].color, 0.75) : def.color;
}

/** Lens colour: constructs glow cyan, or in their element colour. */
function lensColor(def: EnemyDef, el: ElementId | null): number {
  return el ? ELEMENTS[el].light : def.look === 'mender' ? 0x9cffc8 : def.boss ? TECH.danger : TECH.cyan;
}

/**
 * Draws a Shardbound construct facing right. The body centre sits at
 * (w/2, h*0.58) so the default anchor keeps the feet near the path.
 */
export function drawEnemy(ctx: Ctx, def: EnemyDef, el: ElementId | null, w: number, h: number, frame = 0): void {
  const R = def.radius * TILE;
  const cx = w / 2;
  const cy = h * 0.58;
  const col = enemyBodyColor(def, el);
  const glow = lensColor(def, el);
  const lw = Math.max(1.4, R * 0.075);

  switch (def.look) {
    case 'beetle': {
      // six jointed legs
      ctx.strokeStyle = css(TECH.ink);
      ctx.lineCap = 'round';
      ctx.lineWidth = lw * 1.5;
      for (let i = 0; i < 3; i++) {
        const lx = cx - R * 0.5 + i * R * 0.5;
        ctx.beginPath();
        ctx.moveTo(lx, cy + R * 0.2);
        ctx.lineTo(lx + R * 0.15 * (i - 1), cy + R * 0.55);
        ctx.lineTo(lx + R * 0.05 + R * 0.12 * (i - 1), cy + R * 0.82);
        ctx.stroke();
      }
      // underbelly
      ctx.beginPath();
      ctx.ellipse(cx, cy + R * 0.18, R * 0.95, R * 0.42, 0, 0, Math.PI * 2);
      ctx.fillStyle = metalGradient(ctx, cx - R, cy, cx + R, cy + R * 0.6, TECH.steelDark);
      ctx.fill();
      strokePath(ctx, TECH.ink, lw);
      // faceted carapace (three plates)
      const plates: [number, number, number][] = [
        [-0.45, 0.62, 0.52],
        [0.05, 0.7, 0.6],
        [0.52, 0.5, 0.42],
      ];
      for (const [ox, rw, rh] of plates) {
        const px = cx + ox * R;
        const py = cy - R * 0.08;
        const pts: [number, number][] = [
          [px - rw * R * 0.6, py + R * 0.12],
          [px - rw * R * 0.35, py - rh * R * 0.85],
          [px + rw * R * 0.2, py - rh * R],
          [px + rw * R * 0.6, py - rh * R * 0.35],
          [px + rw * R * 0.55, py + R * 0.12],
        ];
        facets(ctx, px - R * 0.05, py - rh * R * 0.35, pts, col, TECH.ink, lw * 0.9);
      }
      // head + sensor lenses
      chamferRect(ctx, cx + R * 0.72, cy - R * 0.22, R * 0.42, R * 0.42, R * 0.1);
      ctx.fillStyle = metalGradient(ctx, cx + R * 0.7, cy - R * 0.2, cx + R * 1.1, cy + R * 0.2, TECH.steel);
      ctx.fill();
      strokePath(ctx, TECH.ink, lw);
      lens(ctx, cx + R * 0.98, cy - R * 0.06, R * 0.11, glow);
      if (def.boss) {
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.32;
          crystal(ctx, cx - R * 0.05 + Math.cos(a) * R * 0.7, cy - R * 0.55 + Math.sin(a) * R * 0.55, R * 0.62, R * 0.2, a, lighten(col, 0.25), lw * 0.8);
        }
        energyCore(ctx, cx - R * 0.05, cy - R * 0.4, R * 0.16, glow, 2);
      }
      glint(ctx, cx - R * 0.25, cy - R * 0.62, R * 0.18, 0.85);
      break;
    }
    case 'drone': {
      const spin = frame === 0;
      // four rotor pods on angled struts
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const) {
        const px = cx + sx * R * 0.95;
        const py = cy + sy * R * 0.5;
        ctx.strokeStyle = css(TECH.ink);
        ctx.lineWidth = lw * 2.2;
        ctx.beginPath();
        ctx.moveTo(cx + sx * R * 0.35, cy + sy * R * 0.2);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.strokeStyle = css(TECH.steelLight);
        ctx.lineWidth = lw * 1.1;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(px, py, R * 0.42, R * 0.14, 0, 0, Math.PI * 2);
        ctx.fillStyle = css(TECH.trim, spin ? 0.18 : 0.32);
        ctx.fill();
        ctx.strokeStyle = css(TECH.trim, 0.6);
        ctx.lineWidth = lw * 0.6;
        ctx.stroke();
        if (spin) {
          ctx.strokeStyle = css(TECH.trim, 0.95);
          ctx.lineWidth = lw * 0.9;
          ctx.beginPath();
          ctx.moveTo(px - R * 0.4, py - R * 0.05);
          ctx.lineTo(px + R * 0.4, py + R * 0.05);
          ctx.stroke();
        }
        rivet(ctx, px, py, R * 0.07);
      }
      // hexagonal armoured chassis
      const pts: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        pts.push([cx + Math.cos(a) * R * 0.62, cy + Math.sin(a) * R * 0.48]);
      }
      facets(ctx, cx - R * 0.1, cy - R * 0.1, pts, col, TECH.ink, lw);
      chamferRect(ctx, cx + R * 0.05, cy - R * 0.14, R * 0.52, R * 0.28, R * 0.06);
      ctx.fillStyle = css(TECH.ink);
      ctx.fill();
      energyCore(ctx, cx + R * 0.38, cy, R * 0.09, glow, 2.4);
      if (def.boss) {
        // war-engine: armoured prow and exhaust
        crystal(ctx, cx + R * 0.75, cy, R * 0.7, R * 0.3, 0, lighten(col, 0.25), lw * 0.8);
        energyCore(ctx, cx - R * 0.8, cy, R * 0.18, glow, 2);
      }
      glint(ctx, cx - R * 0.25, cy - R * 0.28, R * 0.14, 0.8);
      break;
    }
    case 'golem': {
      const stone = col;
      // legs
      for (const s of [-1, 1]) {
        chamferRect(ctx, cx + s * R * 0.32 - R * 0.2, cy + R * 0.38, R * 0.4, R * 0.5, R * 0.1);
        ctx.fillStyle = metalGradient(ctx, cx - R, cy, cx + R, cy + R, darken(stone, 0.2));
        ctx.fill();
        strokePath(ctx, TECH.ink, lw);
      }
      // torso
      const tw = def.boss ? 1.6 : 1.4;
      chamferRect(ctx, cx - R * tw * 0.5, cy - R * 0.55, R * tw, R * 1.0, R * 0.22);
      ctx.fillStyle = metalGradient(ctx, cx - R, cy - R, cx + R, cy + R, stone);
      ctx.fill();
      strokePath(ctx, TECH.ink, lw * 1.1);
      // rune cracks
      ctx.strokeStyle = css(glow, 0.95);
      ctx.lineWidth = lw * 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.3, cy - R * 0.3);
      ctx.lineTo(cx - R * 0.1, cy - R * 0.05);
      ctx.lineTo(cx - R * 0.32, cy + R * 0.25);
      ctx.moveTo(cx - R * 0.1, cy - R * 0.05);
      ctx.lineTo(cx + R * 0.25, cy + R * 0.05);
      ctx.stroke();
      // fists
      for (const s of [-1, 1]) {
        const fx = cx + s * R * (tw * 0.5 + 0.12);
        const pts: [number, number][] = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          pts.push([fx + Math.cos(a) * R * 0.26, cy + R * 0.05 + Math.sin(a) * R * 0.26]);
        }
        facets(ctx, fx - R * 0.05, cy, pts, darken(stone, 0.1), TECH.ink, lw * 0.9);
      }
      // head with visor slit
      chamferRect(ctx, cx - R * 0.26, cy - R * 0.92, R * 0.52, R * 0.42, R * 0.1);
      ctx.fillStyle = metalGradient(ctx, cx - R * 0.3, cy - R, cx + R * 0.3, cy - R * 0.5, lighten(stone, 0.05));
      ctx.fill();
      strokePath(ctx, TECH.ink, lw);
      ctx.fillStyle = css(TECH.ink);
      ctx.fillRect(cx - R * 0.18, cy - R * 0.78, R * 0.4, R * 0.1);
      energyCore(ctx, cx + R * 0.1, cy - R * 0.73, R * 0.08, glow, 2.6);
      if (def.boss) {
        // iron plating + shoulder crystals
        for (const s of [-1, 1]) {
          chamferRect(ctx, cx + s * R * 0.62 - R * 0.28, cy - R * 0.72, R * 0.56, R * 0.3, R * 0.08);
          ctx.fillStyle = metalGradient(ctx, cx - R, cy - R, cx + R, cy, 0x5b6680);
          ctx.fill();
          strokePath(ctx, TECH.ink, lw);
          rivet(ctx, cx + s * R * 0.62, cy - R * 0.57, R * 0.06);
          crystal(ctx, cx + s * R * 0.78, cy - R * 0.92, R * 0.45, R * 0.16, -Math.PI / 2 + s * 0.4, TECH.cyan, lw * 0.7);
        }
      }
      glint(ctx, cx - R * 0.42, cy - R * 0.42, R * 0.14, 0.7);
      break;
    }
    case 'wisp': {
      // trailing energy ribbons (two frames)
      const sway = frame === 0 ? 1 : -1;
      for (let i = 0; i < 3; i++) {
        const oy = (i - 1) * R * 0.32;
        ctx.beginPath();
        ctx.moveTo(cx - R * 0.15, cy + oy * 0.6);
        ctx.quadraticCurveTo(cx - R * 0.8, cy + oy + sway * R * 0.25, cx - R * 1.55, cy + oy * 1.4 - sway * R * 0.1);
        ctx.strokeStyle = css(col, 0.35);
        ctx.lineWidth = R * 0.32 - i * 1;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.strokeStyle = css(lighten(col, 0.4), 0.8);
        ctx.lineWidth = R * 0.1;
        ctx.stroke();
      }
      energyCore(ctx, cx, cy, R * 0.55, col, 1.7);
      // crystal core
      const pts: [number, number][] = [
        [cx + R * 0.62, cy],
        [cx + R * 0.05, cy - R * 0.48],
        [cx - R * 0.42, cy],
        [cx + R * 0.05, cy + R * 0.48],
      ];
      facets(ctx, cx + R * 0.05, cy, pts, lighten(col, 0.2), TECH.ink, lw);
      lens(ctx, cx + R * 0.18, cy, R * 0.13, 0xffffff);
      // orbiting motes
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + frame * 0.6;
        energyCore(ctx, cx + Math.cos(a) * R * 0.8, cy + Math.sin(a) * R * 0.45, R * 0.07, lighten(col, 0.5), 2.2);
      }
      break;
    }
    case 'mender': {
      // hover pad
      ctx.beginPath();
      ctx.ellipse(cx, cy + R * 0.62, R * 0.55, R * 0.14, 0, 0, Math.PI * 2);
      ctx.fillStyle = css(glow, 0.35);
      ctx.fill();
      // ring frame
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * 0.85, R * 0.85, 0, 0, Math.PI * 2);
      ctx.strokeStyle = css(TECH.ink);
      ctx.lineWidth = R * 0.32;
      ctx.stroke();
      ctx.strokeStyle = metalGradient(ctx, cx - R, cy - R, cx + R, cy + R, TECH.steelLight);
      ctx.lineWidth = R * 0.22;
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        crystal(ctx, cx + Math.cos(a) * R * 0.85, cy + Math.sin(a) * R * 0.85, R * 0.32, R * 0.16, a, col, lw * 0.7);
      }
      energyCore(ctx, cx, cy, R * 0.4, glow, 1.8);
      // repair glyph (plus rune)
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fillRect(cx - R * 0.07, cy - R * 0.28, R * 0.14, R * 0.56);
      ctx.fillRect(cx - R * 0.28, cy - R * 0.07, R * 0.56, R * 0.14);
      break;
    }
    case 'geode': {
      // hunched rock brute: thick legs, crystal ridge along its back
      for (const s2 of [-1, 1]) {
        chamferRect(ctx, cx + s2 * R * 0.45 - R * 0.18, cy + R * 0.32, R * 0.36, R * 0.5, R * 0.08);
        ctx.fillStyle = metalGradient(ctx, cx - R, cy, cx + R, cy + R, darken(col, 0.35));
        ctx.fill();
        strokePath(ctx, TECH.ink, lw);
      }
      const pts: [number, number][] = [
        [cx - R * 0.95, cy + R * 0.42],
        [cx - R * 0.9, cy - R * 0.15],
        [cx - R * 0.5, cy - R * 0.62],
        [cx + R * 0.15, cy - R * 0.72],
        [cx + R * 0.7, cy - R * 0.38],
        [cx + R * 0.98, cy + R * 0.12],
        [cx + R * 0.8, cy + R * 0.48],
      ];
      facets(ctx, cx - R * 0.1, cy - R * 0.2, pts, col, TECH.ink, lw * 1.1);
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const bx = cx - R * 0.65 + t * R * 1.2;
        const by = cy - R * 0.55 - Math.sin(t * Math.PI) * R * 0.18;
        crystal(ctx, bx, by, R * (0.45 + Math.sin(t * Math.PI) * 0.25), R * 0.17, -Math.PI / 2 - 0.3 + t * 0.6, 0x8ff0e2, lw * 0.7);
      }
      chamferRect(ctx, cx + R * 0.55, cy - R * 0.05, R * 0.32, R * 0.2, R * 0.05);
      ctx.fillStyle = css(TECH.ink);
      ctx.fill();
      energyCore(ctx, cx + R * 0.72, cy + R * 0.05, R * 0.08, glow, 2.4);
      break;
    }
    case 'sentinel': {
      // kite-shaped armoured body
      const pts: [number, number][] = [
        [cx, cy - R * 0.95],
        [cx + R * 0.72, cy - R * 0.2],
        [cx + R * 0.35, cy + R * 0.8],
        [cx - R * 0.35, cy + R * 0.8],
        [cx - R * 0.72, cy - R * 0.2],
      ];
      facets(ctx, cx - R * 0.1, cy - R * 0.1, pts, col, TECH.ink, lw);
      chamferRect(ctx, cx - R * 0.42, cy - R * 0.2, R * 0.84, R * 0.32, R * 0.08);
      ctx.fillStyle = css(TECH.ink);
      ctx.fill();
      lens(ctx, cx + R * 0.12, cy - R * 0.04, R * 0.12, glow);
      for (const s of [-1, 1]) rivet(ctx, cx + s * R * 0.3, cy + R * 0.42, R * 0.06);
      glint(ctx, cx - R * 0.25, cy - R * 0.55, R * 0.16, 0.85);
      break;
    }
    case 'archon': {
      // Archon Null: a levitating obsidian monolith with a gold rune halo,
      // shoulder pylons and satellite shards. The live element core is drawn
      // into the slot by the renderer.
      const GOLD = 0xd9b45a;
      const lift = ctx.createLinearGradient(cx, cy + R * 0.5, cx, cy + R * 1.05);
      lift.addColorStop(0, css(glow, 0.35));
      lift.addColorStop(1, css(glow, 0));
      ctx.fillStyle = lift;
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.22, cy + R * 0.6);
      ctx.lineTo(cx + R * 0.22, cy + R * 0.6);
      ctx.lineTo(cx + R * 0.5, cy + R * 1.05);
      ctx.lineTo(cx - R * 0.5, cy + R * 1.05);
      ctx.closePath();
      ctx.fill();
      runeRing(ctx, cx, cy - R * 0.2, R * 0.92, GOLD, 16, lw * 0.9, 0.85);
      // shoulder pylons
      for (const side of [-1, 1]) {
        const pts: [number, number][] = [
          [cx + side * R * 0.48, cy - R * 0.55],
          [cx + side * R * 0.95, cy - R * 0.78],
          [cx + side * R * 1.02, cy - R * 0.1],
          [cx + side * R * 0.55, cy + R * 0.12],
        ];
        facets(ctx, cx + side * R * 0.7, cy - R * 0.4, pts, 0x3a3456, TECH.ink, lw);
        ctx.beginPath();
        ctx.moveTo(pts[1]![0], pts[1]![1]);
        ctx.lineTo(pts[2]![0], pts[2]![1]);
        ctx.strokeStyle = css(GOLD);
        ctx.lineWidth = lw * 0.9;
        ctx.stroke();
        energyCore(ctx, cx + side * R * 0.8, cy - R * 0.38, R * 0.07, glow, 2.2);
      }
      // the monolith
      const mono: [number, number][] = [
        [cx, cy - R * 1.12],
        [cx + R * 0.44, cy - R * 0.55],
        [cx + R * 0.5, cy + R * 0.22],
        [cx, cy + R * 0.82],
        [cx - R * 0.5, cy + R * 0.22],
        [cx - R * 0.44, cy - R * 0.55],
      ];
      facets(ctx, cx - R * 0.12, cy - R * 0.3, mono, 0x2c2646, TECH.ink, lw * 1.2);
      ctx.beginPath();
      mono.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      strokePath(ctx, GOLD, lw * 0.8, 0.9);
      // engraved seams
      ctx.strokeStyle = css(GOLD, 0.55);
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy - R * 0.95);
      ctx.lineTo(cx, cy - R * 0.32);
      ctx.moveTo(cx, cy + R * 0.3);
      ctx.lineTo(cx, cy + R * 0.66);
      ctx.moveTo(cx - R * 0.3, cy - R * 0.5);
      ctx.lineTo(cx - R * 0.18, cy - R * 0.2);
      ctx.moveTo(cx + R * 0.3, cy - R * 0.5);
      ctx.lineTo(cx + R * 0.18, cy - R * 0.2);
      ctx.stroke();
      // core slot
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.27, 0, Math.PI * 2);
      ctx.fillStyle = css(TECH.ink);
      ctx.fill();
      strokePath(ctx, GOLD, lw, 1);
      // satellite shards
      for (const [sx, sy, rot] of [
        [-1.12, -0.95, -2.2],
        [1.12, -0.95, -0.95],
        [-0.9, 0.55, 2.4],
        [0.9, 0.55, 0.75],
      ] as const) {
        crystal(ctx, cx + sx * R, cy + sy * R, R * 0.36, R * 0.13, rot, 0xb9a6ff, lw * 0.7);
      }
      glint(ctx, cx - R * 0.18, cy - R * 0.72, R * 0.12, 0.8);
      break;
    }
  }

  if (el && !def.boss && def.look !== 'archon') {
    // element chip (colour + shape cue)
    const E = ELEMENTS[el];
    const bx = cx - R * 0.55;
    const by = cy + R * 0.48;
    const br = Math.max(5, R * 0.3);
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = css(TECH.ink, 0.9);
    ctx.fill();
    ctx.strokeStyle = css(E.color);
    ctx.lineWidth = Math.max(1, br * 0.18);
    ctx.stroke();
    elementIcon(ctx, E.icon, bx, by, br * 0.66, E.color);
  }
}

/** Hexagonal elemental ward with the element's icon on top. */
export function drawShield(ctx: Ctx, el: ElementId, size: number): void {
  const E = ELEMENTS[el];
  const c = size / 2;
  const r = size * 0.45;
  const g = ctx.createRadialGradient(c, c, r * 0.2, c, c, r);
  g.addColorStop(0, css(E.color, 0.04));
  g.addColorStop(0.75, css(E.color, 0.18));
  g.addColorStop(1, css(E.color, 0.5));
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  // hex lattice
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = css(lighten(E.color, 0.4), 0.35);
  ctx.lineWidth = Math.max(0.8, size * 0.012);
  const hs = size * 0.11;
  for (let y = -1; y < 9; y++) {
    for (let x = -1; x < 9; x++) {
      const hx = x * hs * 1.5;
      const hy = y * hs * 1.732 + (x % 2 ? hs * 0.866 : 0);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const px = hx + Math.cos(a) * hs;
        const py = hy + Math.sin(a) * hs;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.strokeStyle = css(lighten(E.color, 0.3), 0.95);
  ctx.lineWidth = Math.max(1.4, size * 0.03);
  ctx.stroke();
  elementIcon(ctx, E.icon, c, c - r * 0.95, size * 0.13, E.color);
}
