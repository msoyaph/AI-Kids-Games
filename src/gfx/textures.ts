import { Texture } from 'pixi.js';
import { BODIES, BODY_BY_ID } from '../data/bodies';
import { PARTS } from '../data/parts';
import type { RocketLoadout } from '../data/types';
import { AtlasBuilder, bakeSingle, rebakeSingle, type SpriteDef } from './atlas';
import { blob, circle, ellipse, glowDot, ink, lumpyCircle, poly, radial, roundRect, softStar, star, cuteFace, linear, type Ctx } from './canvas';
import { drawGlyph } from './art/glyphs';
import { drawNebula, drawPlanet, drawStarTile } from './art/planets';
import { drawFlame, drawRocket, ROCKET_H, ROCKET_W } from './art/rocket';
import { C, rgba, shade } from './palette';
import { Rng } from '../core/rng';
import { drawTuggy } from './art/characters';

/** All baked textures, by name. */
const TEX: Record<string, Texture> = {};
let bakeRes = 1;

export function tex(name: string): Texture {
  const t = TEX[name];
  if (!t) {
    if (import.meta.env.DEV) console.warn('Missing texture', name);
    return Texture.WHITE;
  }
  return t;
}

export function hasTex(name: string): boolean {
  return !!TEX[name];
}

export function getBakeRes(): number {
  return bakeRes;
}

/** Sprites shared by many scenes. Baked once at startup. */
function coreSprites(): SpriteDef[] {
  const defs: SpriteDef[] = [];
  const add = (name: string, w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void, ax = 0.5, ay = 0.5) =>
    defs.push({ name, w, h, draw, ax, ay });

  // Particles (white, tinted at runtime).
  add('dot', 32, 32, (c, w) => glowDot(c, w / 2, w / 2, w / 2, '#ffffff'));
  add('spark', 40, 40, (c, w) => {
    c.fillStyle = radial(c, w / 2, w / 2, 0, w / 2, [[0, '#ffffff'], [0.3, rgba('#ffffff', 0.5)], [1, rgba('#ffffff', 0)]]);
    c.fill(star(w / 2, w / 2, 4, w / 2, w / 10, 0));
  });
  add('puff', 48, 48, (c, w) => {
    c.fillStyle = radial(c, w / 2, w / 2, 0, w / 2, [[0, rgba('#ffffff', 0.9)], [0.6, rgba('#ffffff', 0.5)], [1, rgba('#ffffff', 0)]]);
    c.fill(circle(w / 2, w / 2, w / 2));
  });
  add('square', 8, 8, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 8, 8);
  });
  add('confetti', 14, 8, (c) => {
    c.fillStyle = '#ffffff';
    c.fill(roundRect(0, 0, 14, 8, 2));
  });
  add('ringDot', 48, 48, (c, w) => {
    c.lineWidth = 4;
    c.strokeStyle = '#ffffff';
    c.stroke(circle(w / 2, w / 2, w / 2 - 4));
  });

  // Collectibles.
  add('coin', 44, 44, (c, w) => {
    const r = w / 2 - 3;
    c.save();
    c.shadowColor = C.yellow;
    c.shadowBlur = 6;
    ink(c, circle(w / 2, w / 2, r), C.gold, 3);
    c.restore();
    c.lineWidth = 3;
    c.strokeStyle = C.ink;
    c.stroke(circle(w / 2, w / 2, r));
    ink(c, circle(w / 2, w / 2, r * 0.72), C.yellow, 0);
    ink(c, softStar(w / 2, w / 2 + 1, 5, r * 0.55, r * 0.26), C.orange, 2);
    c.fillStyle = rgba('#ffffff', 0.8);
    c.fill(ellipse(w * 0.36, w * 0.32, 4, 2.5, -0.6));
  });
  add('fuel', 46, 58, (c, w, h) => {
    c.save();
    c.shadowColor = C.lime;
    c.shadowBlur = 8;
    ink(c, roundRect(6, 10, w - 12, h - 14, 9), linear(c, 6, 0, w - 6, 0, [[0, shade(C.lime, 0.3)], [1, shade(C.green, -0.1)]]), 3);
    c.restore();
    c.lineWidth = 3;
    c.strokeStyle = C.ink;
    c.stroke(roundRect(6, 10, w - 12, h - 14, 9));
    ink(c, roundRect(w / 2 - 8, 3, 16, 9, 3), C.steel, 2.5);
    c.fillStyle = C.white;
    c.fill(poly([w / 2 + 3, 18, w / 2 - 8, 34, w / 2 - 1, 34, w / 2 - 4, 48, w / 2 + 8, 30, w / 2 + 1, 30]));
  });
  add('shieldOrb', 48, 48, (c, w) => {
    glowDot(c, w / 2, w / 2, w / 2, C.cyan);
    drawGlyph(c, 'shield', w / 2, w / 2, w * 0.3, C.cyan);
  });
  add('glimmer', 48, 48, (c, w) => {
    glowDot(c, w / 2, w / 2, w / 2, '#fff2a8');
    drawGlyph(c, 'glimmer', w / 2, w / 2, w * 0.3, '#fff7b3');
  });
  add('sample', 44, 44, (c, w) => {
    glowDot(c, w / 2, w / 2, w / 2, C.cyan);
    drawGlyph(c, 'rock', w / 2, w / 2, w * 0.3, '#d9d2c5');
  });

  // Asteroids.
  for (let i = 0; i < 6; i++) {
    add(`asteroid${i}`, 100, 100, (c, w) => {
      const rng = new Rng(100 + i);
      const base = [C.gray, '#a08f80', '#8c8a9e', '#b39a86', '#9a8f84', '#a6a0b8'][i];
      const p = lumpyCircle(w / 2, w / 2, w * 0.42, 9, 0.18, () => rng.next());
      ink(c, p, radial(c, w * 0.38, w * 0.36, 2, w * 0.55, [[0, shade(base, 0.3)], [0.6, base], [1, shade(base, -0.35)]]), 3.5);
      c.save();
      c.clip(p);
      for (let k = 0; k < 4; k++) {
        const cx = rng.range(w * 0.25, w * 0.75);
        const cy = rng.range(w * 0.25, w * 0.75);
        const r = rng.range(5, 11);
        c.fillStyle = rgba(shade(base, -0.4), 0.6);
        c.fill(circle(cx, cy, r));
        c.fillStyle = rgba(shade(base, 0.3), 0.5);
        c.fill(ellipse(cx - 1.5, cy - 2, r * 0.7, r * 0.55));
      }
      c.restore();
      // A sleepy face on two of them: friendly, not scary.
      if (i === 1 || i === 4) cuteFace(c, w / 2, w / 2 + 4, 11, { mood: 'sleepy', blush: C.pink });
    });
  }

  // Comet.
  add('cometHead', 72, 72, (c, w) => {
    glowDot(c, w / 2, w / 2, w / 2, C.cyan);
    ink(c, lumpyCircle(w / 2, w / 2, w * 0.22, 8, 0.15, () => 0.5), '#e6f7ff', 3);
  });
  add('cometTail', 256, 64, (c, w, h) => {
    const g = linear(c, 0, 0, w, 0, [[0, rgba('#bff6ff', 0.85)], [0.4, rgba(C.cyan, 0.45)], [1, rgba(C.purple, 0)]]);
    c.fillStyle = g;
    const p = new Path2D();
    p.moveTo(0, h * 0.3);
    p.quadraticCurveTo(w * 0.5, 0, w, h * 0.1);
    p.lineTo(w, h * 0.9);
    p.quadraticCurveTo(w * 0.5, h, 0, h * 0.7);
    p.closePath();
    c.fill(p);
  }, 0, 0.5);

  // Flight helpers.
  add('gate', 140, 140, (c, w) => {
    const r = w / 2 - 10;
    c.lineWidth = 14;
    c.strokeStyle = C.ink;
    c.stroke(circle(w / 2, w / 2, r));
    c.lineWidth = 8;
    c.strokeStyle = '#ffffff';
    c.stroke(circle(w / 2, w / 2, r));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      glowDot(c, w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r, 8, '#ffffff');
    }
  });
  add('arrow', 64, 64, (c, w) => {
    const p = poly([w * 0.92, w / 2, w * 0.28, w * 0.12, w * 0.42, w / 2, w * 0.28, w * 0.88]);
    c.save();
    c.shadowColor = C.yellow;
    c.shadowBlur = 8;
    ink(c, p, C.yellow, 4);
    c.restore();
  });
  add('marker', 56, 70, (c, w) => {
    const p = new Path2D();
    p.moveTo(w / 2, 66);
    p.bezierCurveTo(6, 36, 4, 8, w / 2, 6);
    p.bezierCurveTo(w - 4, 8, w - 6, 36, w / 2, 66);
    ink(c, p, C.yellow, 4);
    ink(c, circle(w / 2, 26, 9), C.white, 3);
  }, 0.5, 1);
  add('scanRing', 128, 128, (c, w) => {
    c.setLineDash([12, 10]);
    c.lineWidth = 5;
    c.strokeStyle = '#ffffff';
    c.stroke(circle(w / 2, w / 2, w / 2 - 6));
  });
  add('satellite', 90, 60, (c, w, h) => {
    ink(c, roundRect(2, h / 2 - 12, 30, 24, 3), C.blue, 3);
    ink(c, roundRect(w - 32, h / 2 - 12, 30, 24, 3), C.blue, 3);
    c.strokeStyle = rgba('#ffffff', 0.5);
    c.lineWidth = 1.5;
    for (const x0 of [2, w - 32]) for (let k = 1; k < 3; k++) {
      c.beginPath();
      c.moveTo(x0 + k * 10, h / 2 - 12);
      c.lineTo(x0 + k * 10, h / 2 + 12);
      c.stroke();
    }
    ink(c, roundRect(w / 2 - 14, h / 2 - 18, 28, 36, 8), C.steel, 3);
    ink(c, circle(w / 2, h / 2 - 2, 6), C.cyan, 2);
    c.strokeStyle = C.ink;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(w / 2, h / 2 - 18);
    c.lineTo(w / 2 + 6, 4);
    c.stroke();
    glowDot(c, w / 2 + 6, 4, 5, C.red);
  });

  // Tuggy the tow-bot.
  add('tuggy', 110, 110, (c, w, h) => drawTuggy(c, w, h));
  add('hook', 26, 26, (c, w) => {
    c.lineWidth = 5;
    c.strokeStyle = C.ink;
    c.beginPath();
    c.arc(w / 2, w / 2 + 2, 8, 0, Math.PI * 1.2);
    c.stroke();
    c.lineWidth = 3;
    c.strokeStyle = C.steel;
    c.stroke();
  });

  // Engine flames, one per engine style.
  for (const p of PARTS) {
    if (p.slot !== 'engine' || !p.flame) continue;
    add(`flame_${p.style}`, 36, 84, (c, w, h) => drawFlame(c, w, h, p.flame![0], p.flame![1]), 0.5, 0);
  }

  // Small world bits.
  add('pad', 200, 40, (c, w, h) => {
    ink(c, roundRect(4, 10, w - 8, h - 14, 10), C.dark, 3);
    ink(c, roundRect(14, 4, w - 28, 14, 6), C.steel, 3);
    for (let i = 0; i < 5; i++) glowDot(c, 30 + i * ((w - 60) / 4), 11, 7, i % 2 ? C.yellow : C.lime);
  }, 0.5, 0.2);
  add('starBig', 80, 80, (c, w) => {
    c.save();
    c.shadowColor = C.yellow;
    c.shadowBlur = 12;
    ink(c, softStar(w / 2, w / 2 + 2, 5, w * 0.42, w * 0.2), C.yellow, 4);
    c.restore();
  });
  return defs;
}

/** Bakes all startup textures. */
export async function bakeCore(res: number, onProgress: (p: number) => void): Promise<void> {
  bakeRes = res;
  const atlas = new AtlasBuilder(res);
  atlas.addAll(coreSprites());
  Object.assign(TEX, await atlas.build(onProgress));
  // Seamless star layers for parallax backgrounds (full textures so they can repeat).
  TEX.stars0 = bakeSingle(512, 512, 1, (c, w, h) => drawStarTile(c, w, h, 11, 160, 1.3, false), 0, 0);
  TEX.stars1 = bakeSingle(512, 512, Math.min(res, 2), (c, w, h) => drawStarTile(c, w, h, 22, 55, 2.2, true), 0, 0);
  TEX.stars2 = bakeSingle(512, 512, Math.min(res, 2), (c, w, h) => drawStarTile(c, w, h, 33, 14, 3.4, true), 0, 0);
}

/** Planet textures are baked lazily (only the ones a scene needs). */
export function planetTex(bodyId: string): Texture {
  const key = `planet_${bodyId}`;
  if (TEX[key]) return TEX[key];
  const body = BODY_BY_ID[bodyId] ?? BODIES[0];
  const size = body.look.rings ? 320 : 256;
  const res = Math.min(2, bakeRes * (body.radius > 200 ? 1.25 : 1));
  TEX[key] = bakeSingle(size, size, res, (c, w, h) => drawPlanet(c, body.look, w, h));
  return TEX[key];
}

/** Radius of the planet disc inside its texture, as a fraction of texture size. */
export function planetDiscFraction(bodyId: string): number {
  const body = BODY_BY_ID[bodyId];
  return body?.look.rings ? 0.25 : 0.41;
}

export function nebulaTex(key: string, colors: string[]): Texture {
  const name = `nebula_${key}`;
  if (TEX[name]) return TEX[name];
  TEX[name] = bakeSingle(512, 512, 1, (c, w, h) => drawNebula(c, w, h, colors, colors.length * 31 + key.length));
  return TEX[name];
}

let rocketTexture: Texture | null = null;
let rocketBlinkTexture: Texture | null = null;

/** The player's rocket, re-baked whenever the loadout changes. */
export function rocketTex(loadout: RocketLoadout, blink = false): Texture {
  if (!rocketTexture) {
    rocketTexture = bakeSingle(ROCKET_W, ROCKET_H, Math.min(2, bakeRes), (c) => drawRocket(c, loadout, 0));
    rocketBlinkTexture = bakeSingle(ROCKET_W, ROCKET_H, Math.min(2, bakeRes), (c) => drawRocket(c, loadout, 1));
  }
  return blink ? rocketBlinkTexture! : rocketTexture;
}

export function updateRocketTex(loadout: RocketLoadout): void {
  if (!rocketTexture) {
    rocketTex(loadout);
    return;
  }
  rebakeSingle(rocketTexture, (c) => drawRocket(c, loadout, 0));
  rebakeSingle(rocketBlinkTexture!, (c) => drawRocket(c, loadout, 1));
}

/** Register a lazily baked texture under a name (used by scene-specific art). */
export function ensureTex(name: string, w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void, ax = 0.5, ay = 0.5, res = bakeRes): Texture {
  if (!TEX[name]) TEX[name] = bakeSingle(w, h, Math.min(2, res), draw, ax, ay);
  return TEX[name];
}

/** Bake a whole group of scene sprites into one atlas (e.g. a level's tiles). */
export async function ensureAtlas(key: string, defs: SpriteDef[]): Promise<void> {
  if (TEX[`__atlas_${key}`]) return;
  const atlas = new AtlasBuilder(bakeRes, 2048);
  atlas.addAll(defs);
  Object.assign(TEX, await atlas.build());
  TEX[`__atlas_${key}`] = Texture.WHITE;
}

// Re-export so art modules don't need extra imports for simple shapes.
export { blob };
