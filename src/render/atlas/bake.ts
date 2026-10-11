import { CanvasSource, Rectangle, Texture } from 'pixi.js';
import { ELEMENT_ORDER, ELEMENTS, type ElementId } from '../../data/elements';
import { ENEMIES, ENEMY_IDS, type EnemyDef } from '../../data/enemies';
import { SPEC_LEVEL, TOWER_IDS, TOWERS, type ProjectileStyle, type TowerId } from '../../data/towers';
import { AtlasBuilder, frameToCanvas, type BakedAtlas } from './packer';
import { drawEnemy, drawShield, enemyBox } from './drawEnemies';
import {
  drawBeam,
  drawBolt,
  drawCastle,
  drawCellMark,
  drawChevron,
  drawCoin,
  drawElementToken,
  drawGem,
  drawGlow,
  drawHeart,
  drawPortal,
  drawProjectile,
  drawPuff,
  drawField,
  drawRect,
  drawRing,
  drawSelectRing,
  drawShadow,
  drawSoftDot,
  drawSparkle,
  drawStunStar,
  drawTuft,
  drawShard,
  PROJECTILE_SIZE,
} from './drawFx';
import { drawTowerBase, drawTowerHead, drawTowerIcon, TOWER_BASE_SIZE, TOWER_HEAD_SIZE } from './drawTowers';

export interface Atlas {
  baked: BakedAtlas;
  tex: Record<string, Texture>;
  /** Get a texture by name (falls back to a white pixel so bad names are visible but never crash). */
  get(name: string): Texture;
  /** The single texture source holding every particle texture. */
  fxSource: CanvasSource;
}

export const enemyTexName = (id: string, el: ElementId | null, frame = 0): string =>
  `e_${id}${el ? '_' + el : ''}${frame ? '_f' + frame : ''}`;
export const towerBaseName = (id: string, lv: number): string => `tb_${id}_${lv}`;
/** Head texture; levels 3–4 of element/combo towers depend on the chosen spec (no spec yet = path A look). */
export const towerHeadName = (id: TowerId, lv: number, spec = -1): string =>
  lv >= SPEC_LEVEL && TOWERS[id].specs ? `th_${id}_${lv}_s${spec === 1 ? 1 : 0}` : `th_${id}_${lv}`;
export const projectileName = (s: ProjectileStyle): string => `p_${s}`;

function addEnemy(b: AtlasBuilder, def: EnemyDef, el: ElementId | null): void {
  const { w, h } = enemyBox(def);
  const frames = def.look === 'wisp' || def.look === 'drone' ? 2 : 1;
  for (let f = 0; f < frames; f++) {
    b.add({
      name: enemyTexName(def.id, el, f),
      w,
      h,
      ax: 0.5,
      ay: 0.58,
      draw: (ctx, ww, hh) => drawEnemy(ctx, def, el, ww, hh, f),
    });
  }
}

export function registerSprites(b: AtlasBuilder): void {
  // Towers: base + head per level
  for (const id of TOWER_IDS) {
    const def = TOWERS[id];
    for (let lv = 1; lv <= 4; lv++) {
      b.add({ name: towerBaseName(id, lv), w: TOWER_BASE_SIZE, h: TOWER_BASE_SIZE, draw: (ctx) => drawTowerBase(ctx, def, lv) });
      if (lv >= SPEC_LEVEL && def.specs) {
        for (const sp of [0, 1]) b.add({ name: towerHeadName(id, lv, sp), w: TOWER_HEAD_SIZE, h: TOWER_HEAD_SIZE, draw: (ctx) => drawTowerHead(ctx, def, lv, sp) });
      } else b.add({ name: towerHeadName(id, lv), w: TOWER_HEAD_SIZE, h: TOWER_HEAD_SIZE, draw: (ctx) => drawTowerHead(ctx, def, lv) });
    }
  }
  // Enemies (+ element variants)
  for (const id of ENEMY_IDS) {
    const def = ENEMIES[id];
    addEnemy(b, def, null);
    if (def.elemental) for (const el of ELEMENT_ORDER) addEnemy(b, def, el);
  }
  for (const el of ELEMENT_ORDER) {
    b.add({ name: `shield_${el}`, w: 64, h: 64, draw: (ctx, w) => drawShield(ctx, el, w) });
    b.add({ name: `el_${el}`, w: 40, h: 40, draw: (ctx, w) => drawElementToken(ctx, w, el) });
  }
  // Projectiles
  for (const style of Object.keys(PROJECTILE_SIZE) as ProjectileStyle[]) {
    const s = PROJECTILE_SIZE[style];
    b.add({ name: projectileName(style), w: s, h: s, draw: (ctx, w) => drawProjectile(ctx, style, w) });
  }
  b.add({ name: 'hpbar', w: 32, h: 7, ax: 0, ay: 0.5, draw: (ctx, w, h) => drawRect(ctx, w, h, 3.5) });
  b.add({ name: 'shadow', w: 48, h: 20, draw: (ctx, w, h) => drawShadow(ctx, w, h) });
  b.add({ name: 'chevron', w: 18, h: 18, draw: (ctx, w) => drawChevron(ctx, w) });
  b.add({ name: 'beam', w: 32, h: 20, ax: 0, ay: 0.5, draw: (ctx, w, h) => drawBeam(ctx, w, h) });
  b.add({ name: 'bolt', w: 96, h: 26, ax: 0, ay: 0.5, draw: (ctx, w, h) => drawBolt(ctx, w, h) });
  b.add({ name: 'castle', w: 150, h: 160, ax: 0.5, ay: 0.82, draw: (ctx, w, h) => drawCastle(ctx, w, h) });
  b.add({ name: 'portal', w: 72, h: 72, draw: (ctx, w) => drawPortal(ctx, w) });
  b.add({ name: 'select', w: 96, h: 96, draw: (ctx, w) => drawSelectRing(ctx, w) });
  b.add({ name: 'cell_ok', w: 64, h: 64, draw: (ctx, w) => drawCellMark(ctx, w, true) });
  b.add({ name: 'cell_bad', w: 64, h: 64, draw: (ctx, w) => drawCellMark(ctx, w, false) });
  b.add({ name: 'tuft', w: 24, h: 20, ax: 0.5, ay: 1, draw: (ctx, w, h) => drawTuft(ctx, w, h) });
}

/**
 * Particle textures live on their own page: a ParticleContainer can only draw
 * from a single texture source.
 */
export function registerParticleSprites(b: AtlasBuilder): void {
  b.add({ name: 'glow', w: 96, h: 96, draw: (ctx, w) => drawGlow(ctx, w) });
  b.add({ name: 'dot', w: 16, h: 16, draw: (ctx, w) => drawSoftDot(ctx, w) });
  b.add({ name: 'sparkle', w: 28, h: 28, draw: (ctx, w) => drawSparkle(ctx, w) });
  b.add({ name: 'puff', w: 56, h: 56, draw: (ctx, w) => drawPuff(ctx, w) });
  b.add({ name: 'field', w: 96, h: 96, draw: (ctx, w) => drawField(ctx, w) });
  b.add({ name: 'ring', w: 128, h: 128, draw: (ctx, w) => drawRing(ctx, w, 3) });
  b.add({ name: 'coin', w: 22, h: 22, draw: (ctx, w) => drawCoin(ctx, w) });
  b.add({ name: 'heart', w: 24, h: 24, draw: (ctx, w) => drawHeart(ctx, w) });
  b.add({ name: 'gem', w: 30, h: 30, draw: (ctx, w) => drawGem(ctx, w) });
  b.add({ name: 'stun', w: 14, h: 14, draw: (ctx, w) => drawStunStar(ctx, w) });
  b.add({ name: 'white', w: 8, h: 8, draw: (ctx, w, h) => drawRect(ctx, w, h, 0) });
  b.add({ name: 'shard', w: 22, h: 9, draw: (ctx, w, h) => drawShard(ctx, w, h) });
  for (const el of ELEMENT_ORDER) b.add({ name: `pel_${el}`, w: 20, h: 20, draw: (ctx, w) => drawElementToken(ctx, w, el) });
}

export async function bakeAtlas(scale: number, maxTexture: number, onProgress?: (p: number) => void): Promise<Atlas> {
  const pageSize = Math.min(2048, maxTexture);
  const builder = new AtlasBuilder(scale, pageSize);
  registerSprites(builder);
  const fxBuilder = new AtlasBuilder(scale, Math.min(1024, pageSize));
  registerParticleSprites(fxBuilder);
  const baked = await builder.bake((p) => onProgress?.(p * 0.9));
  const fx = await fxBuilder.bake((p) => onProgress?.(0.9 + p * 0.1));
  // merge the fx page in as the last page
  const fxPage = baked.pages.length;
  baked.pages.push(...fx.pages);
  for (const [name, f] of fx.frames) baked.frames.set(name, { ...f, page: f.page + fxPage });

  const sources = baked.pages.map(
    (canvas) =>
      new CanvasSource({
        resource: canvas,
        resolution: scale,
        autoGenerateMipmaps: true,
        scaleMode: 'linear',
        alphaMode: 'premultiply-alpha-on-upload',
      }),
  );
  const tex: Record<string, Texture> = {};
  for (const [name, f] of baked.frames) {
    tex[name] = new Texture({
      source: sources[f.page]!,
      frame: new Rectangle(f.x, f.y, f.w, f.h),
      defaultAnchor: { x: f.ax, y: f.ay },
      label: name,
    });
  }
  const fallback = tex['white'] ?? Texture.WHITE;
  return {
    baked,
    tex,
    get: (name: string) => tex[name] ?? fallback,
    fxSource: sources[fxPage]!,
  };
}

// ------------------------------------------------------------ DOM icons

const iconCache = new Map<string, string>();

/** A data-URL portrait for DOM UI, cropped from the baked atlas. */
export function atlasIconUrl(atlas: Atlas, name: string, sizePx = 96): string {
  const key = `${name}@${sizePx}`;
  let url = iconCache.get(key);
  if (!url) {
    url = frameToCanvas(atlas.baked, name, sizePx).toDataURL('image/png');
    iconCache.set(key, url);
  }
  return url;
}

/** Composite tower portrait (base + head) as a data URL. */
export function towerIconUrl(id: keyof typeof TOWERS, level = 1, sizePx = 96, spec = -1): string {
  const key = `tower_${id}_${level}_${spec}@${sizePx}`;
  let url = iconCache.get(key);
  if (!url) {
    const c = document.createElement('canvas');
    c.width = c.height = sizePx;
    const ctx = c.getContext('2d')!;
    drawTowerIcon(ctx, TOWERS[id], level, sizePx, level >= SPEC_LEVEL ? Math.max(0, spec) : -1);
    url = c.toDataURL('image/png');
    iconCache.set(key, url);
  }
  return url;
}

export function elementIconUrl(atlas: Atlas, el: ElementId, sizePx = 64): string {
  return atlasIconUrl(atlas, `el_${el}`, sizePx);
}

export function elementColorCss(el: ElementId): string {
  const c = ELEMENTS[el].color;
  return `#${c.toString(16).padStart(6, '0')}`;
}
