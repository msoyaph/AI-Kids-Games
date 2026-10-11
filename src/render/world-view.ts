/**
 * WorldView renders one location:
 *  - ground: 16×16-tile chunks pre-rendered into RenderTextures (re-rendered only when dirty)
 *  - sorted: y-sorted sprites for props, buildings, objects and characters (culled)
 *  - fx: particles/effects in world space
 */
import { Container, RenderTexture, Sprite, type Renderer, type Texture } from 'pixi.js';
import { TILE } from '../core/math';
import { hash32 } from '../core/rng';
import { PROPS } from '../data/structures';
import { Ter } from '../sim/terrain';
import { SOIL_FERT_MASK, SOIL_FERT_SHIFT, SOIL_TILLED, SOIL_WATERED } from '../sim/types';
import { CHUNK, type Loc } from '../sim/world';
import type { Atlas } from './atlas';
import { TER_VARIANTS } from './art/terrain';
import { objSprite } from './sprites';

const CHUNK_PX = CHUNK * TILE;

interface ObjEntry {
  sprite: Sprite;
  key: string;
  overlay: Sprite | null;
}

export class WorldView {
  readonly root = new Container();
  readonly ground = new Container();
  readonly sorted = new Container();
  readonly fx = new Container();
  readonly top = new Container();
  private renderer: Renderer;
  private atlas: Atlas;
  private loc: Loc | null = null;
  private season = 0;
  private chunkSprites: Sprite[] = [];
  private chunkTex: RenderTexture[] = [];
  private tmp = new Container();
  private tmpPool: Sprite[] = [];
  private tmpUsed = 0;
  private staticSprites: Sprite[] = [];
  private objSprites = new Map<number, ObjEntry>();
  private spritePool: Sprite[] = [];
  private objVersion = -1;
  private layoutVersion = -1;
  private terTex: Texture[][][] = [];
  /** extra hook to resolve sprites for object kinds (set by the game for later systems) */
  objResolver: typeof objSprite = objSprite;
  /** viewport in world px for culling */
  view = { x: 0, y: 0, w: 0, h: 0 };

  constructor(renderer: Renderer, atlas: Atlas) {
    this.renderer = renderer;
    this.atlas = atlas;
    this.sorted.sortableChildren = true;
    this.root.addChild(this.ground, this.sorted, this.fx, this.top);
    for (let s = 0; s < 4; s++) {
      this.terTex[s] = [];
      for (let t = 0; t <= 22; t++) {
        this.terTex[s][t] = [];
        for (let v = 0; v < TER_VARIANTS; v++) this.terTex[s][t][v] = atlas.tryTex(`ter.${t}.${v}.s${s}`) ?? atlas.tex(`ter.0.0.s0`);
      }
    }
  }

  get current(): Loc | null {
    return this.loc;
  }

  setLoc(loc: Loc, season: number): void {
    const changed = this.loc !== loc || this.season !== season;
    this.loc = loc;
    this.season = season;
    if (!changed) return;
    this.clearAll();
    this.layoutVersion = -1;
    this.objVersion = -1;
  }

  /** Force a full redraw (season change, context restore). */
  invalidate(): void {
    if (!this.loc) return;
    this.loc.chunkDirty.fill(1);
    this.layoutVersion = -1;
    this.objVersion = -1;
  }

  private clearAll(): void {
    for (const s of this.chunkSprites) s.destroy();
    for (const t of this.chunkTex) t.destroy(true);
    this.chunkSprites = [];
    this.chunkTex = [];
    for (const s of this.staticSprites) this.release(s);
    this.staticSprites = [];
    for (const e of this.objSprites.values()) {
      this.release(e.sprite);
      if (e.overlay) this.release(e.overlay);
    }
    this.objSprites.clear();
  }

  private acquire(tex: Texture): Sprite {
    const s = this.spritePool.pop() ?? new Sprite();
    s.texture = tex;
    s.visible = true;
    s.alpha = 1;
    s.tint = 0xffffff;
    s.scale.set(1, 1);
    s.anchor.set(0.5, 1);
    this.sorted.addChild(s);
    return s;
  }
  private release(s: Sprite): void {
    s.removeFromParent();
    this.spritePool.push(s);
  }

  update(): void {
    const loc = this.loc;
    if (!loc) return;
    if (this.chunkSprites.length !== loc.cw * loc.ch) this.buildChunks(loc);
    for (let i = 0; i < loc.chunkDirty.length; i++) {
      if (loc.chunkDirty[i]) {
        loc.chunkDirty[i] = 0;
        this.renderChunk(loc, i % loc.cw, Math.floor(i / loc.cw));
      }
    }
    if (this.layoutVersion !== loc.layoutVersion) {
      this.layoutVersion = loc.layoutVersion;
      this.buildStatic(loc);
    }
    if (this.objVersion !== loc.objVersion) {
      this.objVersion = loc.objVersion;
      this.syncObjects(loc);
    }
    this.cull();
  }

  private buildChunks(loc: Loc): void {
    for (const s of this.chunkSprites) s.destroy();
    for (const t of this.chunkTex) t.destroy(true);
    this.chunkSprites = [];
    this.chunkTex = [];
    for (let cy = 0; cy < loc.ch; cy++)
      for (let cx = 0; cx < loc.cw; cx++) {
        const rt = RenderTexture.create({ width: CHUNK_PX, height: CHUNK_PX, scaleMode: 'nearest', resolution: 1 });
        const s = new Sprite(rt);
        s.x = cx * CHUNK_PX;
        s.y = cy * CHUNK_PX;
        this.ground.addChild(s);
        this.chunkSprites.push(s);
        this.chunkTex.push(rt);
      }
  }

  private tmpSprite(tex: Texture, x: number, y: number): Sprite {
    let s = this.tmpPool[this.tmpUsed];
    if (!s) {
      s = new Sprite();
      this.tmpPool.push(s);
    }
    this.tmpUsed++;
    s.texture = tex;
    s.x = x;
    s.y = y;
    s.visible = true;
    this.tmp.addChild(s);
    return s;
  }

  private renderChunk(loc: Loc, cx: number, cy: number): void {
    this.tmp.removeChildren();
    this.tmpUsed = 0;
    const s = this.season;
    const x0 = cx * CHUNK, y0 = cy * CHUNK;
    const a = this.atlas;
    for (let ty = y0; ty < Math.min(loc.h, y0 + CHUNK); ty++) {
      for (let tx = x0; tx < Math.min(loc.w, x0 + CHUNK); tx++) {
        const t = loc.ter(tx, ty);
        const v = hash32(tx, ty) % TER_VARIANTS;
        const px = (tx - x0) * TILE, py = (ty - y0) * TILE;
        let tex: Texture;
        const ts = loc.def.tileset;
        if (ts !== undefined && (t === Ter.CAVE || t === Ter.CAVEWALL)) {
          if (t === Ter.CAVEWALL && loc.ter(tx, ty + 1) === Ter.CAVE) tex = a.tex(`cavetop.${v}.m${ts}`);
          else tex = a.tex(`ter.${t}.${v}.m${ts}`);
        } else if (t === Ter.CLIFF && loc.ter(tx, ty - 1) !== Ter.CLIFF) tex = a.tex(`ter.cliftop.${v}.s${s}`);
        else tex = this.terTex[s][t]?.[v] ?? this.terTex[0][0][0];
        this.tmpSprite(tex, px, py);
        if (t === Ter.WATER || t === Ter.DEEPWATER) {
          let m = 0;
          const isW = (x: number, y: number) => {
            const n = loc.ter(x, y);
            return n === Ter.WATER || n === Ter.DEEPWATER || n === Ter.BROKENBRIDGE || n === Ter.BRIDGE || n === Ter.DOCK || !loc.inb(x, y);
          };
          if (!isW(tx, ty - 1)) m |= 1;
          if (!isW(tx + 1, ty)) m |= 2;
          if (!isW(tx, ty + 1)) m |= 4;
          if (!isW(tx - 1, ty)) m |= 8;
          if (m) this.tmpSprite(a.tex(`shore.${m}`), px, py);
          if (t === Ter.WATER) {
            // soft transition into deep water
          }
        }
        const soil = loc.soil[ty * loc.w + tx];
        if (soil & SOIL_TILLED) {
          let m = 0;
          if (loc.soilAt(tx, ty - 1) & SOIL_TILLED) m |= 1;
          if (loc.soilAt(tx + 1, ty) & SOIL_TILLED) m |= 2;
          if (loc.soilAt(tx, ty + 1) & SOIL_TILLED) m |= 4;
          if (loc.soilAt(tx - 1, ty) & SOIL_TILLED) m |= 8;
          this.tmpSprite(a.tex(`soil.${m}.${soil & SOIL_WATERED ? 1 : 0}`), px, py);
          const f = (soil & SOIL_FERT_MASK) >> SOIL_FERT_SHIFT;
          if (f) this.tmpSprite(a.tex(`fert.${f}`), px, py);
        }
        const o = loc.objs.get(ty * loc.w + tx);
        if (o && o.k === 'path') this.tmpSprite(a.tex(`floor.${o.id}`), px, py);
      }
    }
    // flat props that start inside this chunk
    for (const p of loc.def.props) {
      const pd = PROPS[p.kind];
      if (!pd?.flat) continue;
      if (p.x < x0 || p.x >= x0 + CHUNK || p.y < y0 || p.y >= y0 + CHUNK) continue;
      const tex = a.tex(pd.seasonal ? `${pd.sprite}.s${s}` : pd.sprite);
      this.tmpSprite(tex, (p.x - x0) * TILE, (p.y - y0) * TILE);
    }
    const rt = this.chunkTex[cy * loc.cw + cx];
    this.renderer.render({ container: this.tmp, target: rt, clear: true });
    this.tmp.removeChildren();
  }

  private buildStatic(loc: Loc): void {
    for (const s of this.staticSprites) this.release(s);
    this.staticSprites = [];
    const a = this.atlas, season = this.season;
    for (const p of loc.def.props) {
      const pd = PROPS[p.kind];
      if (!pd || pd.flat) continue;
      const tex = a.tex(pd.seasonal ? `${pd.sprite}.s${season}` : pd.sprite);
      const fw = pd.w ?? 1, fh = pd.h ?? 1;
      const s = this.acquire(tex);
      s.x = p.x * TILE + (fw * TILE) / 2;
      s.y = (p.y + fh) * TILE;
      s.zIndex = s.y;
      // slight variety for forest trees
      if (p.kind === 'tree' || p.kind === 'pine') {
        const h = hash32(p.x, p.y);
        s.scale.x = h & 1 ? -1 : 1;
        s.y += 0;
      }
      this.staticSprites.push(s);
    }
    for (const st of loc.structs) {
      if (!st.def) {
        if (st.sp.kind === 'plot') {
          // plot corner markers
          const pl = loc.def.plots?.[st.sp.id ?? ''];
          if (pl) {
            for (const [ox, oy] of [[0, 0], [pl.w - 1, pl.h - 1]]) {
              const s = this.acquire(a.tex('bld.plot'));
              s.x = (pl.x + ox) * TILE + TILE / 2;
              s.y = (pl.y + oy + 1) * TILE;
              s.zIndex = s.y;
              this.staticSprites.push(s);
            }
          }
        }
        continue;
      }
      const s = this.acquire(a.tex(`bld.${st.key}`));
      s.x = st.sp.x * TILE + (st.def.w * TILE) / 2;
      s.y = (st.sp.y + st.def.h) * TILE;
      s.zIndex = s.y - 1;
      this.staticSprites.push(s);
    }
  }

  private syncObjects(loc: Loc): void {
    const seen = new Set<number>();
    const season = this.season;
    for (const [i, o] of loc.objs) {
      const tx = i % loc.w, ty = Math.floor(i / loc.w);
      const os = this.objResolver(o, season, loc, tx, ty);
      if (!os || os.flat || o.k === 'path') continue;
      seen.add(i);
      const key = os.name + '|' + (os.oy ?? 0) + '|' + (os.overlay ?? '');
      let e = this.objSprites.get(i);
      if (e && e.key === key) continue;
      const tex = this.atlas.tex(os.name);
      if (!e) {
        e = { sprite: this.acquire(tex), key, overlay: null };
        this.objSprites.set(i, e);
      } else {
        e.sprite.texture = tex;
        e.key = key;
      }
      e.sprite.x = tx * TILE + (os.fw * TILE) / 2;
      e.sprite.y = (ty + os.fh) * TILE + (os.oy ?? 0);
      e.sprite.zIndex = (ty + os.fh) * TILE - 1;
      if (os.overlay) {
        if (!e.overlay) e.overlay = this.acquire(this.atlas.tex(os.overlay));
        else e.overlay.texture = this.atlas.tex(os.overlay);
        e.overlay.x = e.sprite.x;
        e.overlay.y = e.sprite.y + (os.overlayOy ?? 0);
        e.overlay.zIndex = e.sprite.zIndex + 0.5;
      } else if (e.overlay) {
        this.release(e.overlay);
        e.overlay = null;
      }
    }
    for (const [i, e] of this.objSprites) {
      if (!seen.has(i)) {
        this.release(e.sprite);
        if (e.overlay) this.release(e.overlay);
        this.objSprites.delete(i);
      }
    }
  }

  /** Get the sprite showing the object at a tile (for shake/bounce effects). */
  spriteAt(loc: Loc, x: number, y: number): Sprite | null {
    return this.objSprites.get(y * loc.w + x)?.sprite ?? null;
  }

  private cull(): void {
    const v = this.view;
    const x0 = v.x - 48, x1 = v.x + v.w + 48, y0 = v.y - 16, y1 = v.y + v.h + 96;
    const ch = this.sorted.children;
    for (let i = 0; i < ch.length; i++) {
      const s = ch[i] as Sprite;
      if (s.label === 'nocull') continue;
      s.visible = s.x > x0 && s.x < x1 && s.y > y0 && s.y < y1;
    }
    for (const s of this.chunkSprites) {
      s.visible = s.x + CHUNK_PX > v.x && s.x < v.x + v.w && s.y + CHUNK_PX > v.y && s.y < v.y + v.h;
    }
  }
}
