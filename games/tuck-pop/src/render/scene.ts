/**
 * Everything on the canvas: background, board, tray, the dragged piece, ghost, effects and the
 * streak meter. PixiJS's WebGLRenderer is used directly with only the pieces this game needs
 * (sprites; no Pixi Graphics, Text, Assets or events), and every texture comes from atlas.ts.
 * It renders only when something changed.
 */
import 'pixi.js/unsafe-eval';
import { Container, Sprite, WebGLRenderer, type Texture } from 'pixi.js';
import type { Theme } from '../data/themes';
import { CRACKED, STONE, type Game, type Slot } from '../sim/game';
import type { Piece } from '../sim/pieces';
import { backgroundCanvas, boardCanvas, buildAtlas, textureOf, type Atlas, type ItemKind, type Look } from './atlas';
import { Fx } from './fx';
import { trayFit, type Layout, type Rect } from './layout';
import { canvas, rounded } from './paint';
import { ease, tween } from './tween';
import { setWordResolution } from './words';

const make = (tex?: Texture) => { const s = new Sprite(tex); s.anchor.set(0.5); return s; };

class PieceSprites {
  readonly root = new Container();
  readonly shadows: Sprite[] = []; readonly blocks: Sprite[] = []; readonly symbols: Sprite[] = [];
  piece: Piece | null = null; color = 0;
  constructor(withShadow: boolean) {
    for (let i = 0; i < 9; i++) {
      if (withShadow) { const sh = make(); this.shadows.push(sh); this.root.addChild(sh); }
    }
    for (let i = 0; i < 9; i++) { const b = make(); this.blocks.push(b); this.root.addChild(b); }
    for (let i = 0; i < 9; i++) { const s = make(); this.symbols.push(s); this.root.addChild(s); }
  }
  /** Lays the piece out around (0, 0) with cell size `c` (CSS px). */
  set(piece: Piece | null, color: number, atlas: Atlas, c: number, symbols: boolean) {
    this.piece = piece; this.color = color;
    const k = c / atlas.cell;
    for (let i = 0; i < 9; i++) {
      const cell = piece?.cells[i];
      const b = this.blocks[i]!, s = this.symbols[i]!, sh = this.shadows[i];
      if (!piece || !cell) { b.visible = false; s.visible = false; if (sh) sh.visible = false; continue; }
      const x = (cell[1] - (piece.w - 1) / 2) * c, y = (cell[0] - (piece.h - 1) / 2) * c;
      b.texture = atlas.block[color]!; b.visible = true; b.position.set(x, y); b.scale.set(k);
      s.texture = atlas.symbol[color]!; s.visible = symbols; s.position.set(x, y); s.scale.set(k);
      if (sh) { sh.texture = atlas.shadow; sh.visible = true; sh.position.set(x + c * 0.1, y + c * 0.16); sh.scale.set(k); }
    }
  }
}

export interface View { theme: Theme; look: Look; symbols: boolean; item: ItemKind }

export class Scene {
  renderer!: WebGLRenderer;
  readonly stage = new Container();
  private world = new Container();
  private bg = new Sprite();
  private panel = new Sprite();
  private cellLayer = new Container();
  readonly cells: Sprite[] = []; private symbols: Sprite[] = []; private items: Sprite[] = [];
  private hints: Sprite[] = []; private ghosts: Sprite[] = [];
  /** Separate sprites for clearing cells, so the board can already show the next state underneath. */
  private sweepers: Sprite[] = []; private flyers: Sprite[] = [];
  private slotGlow = new Sprite();
  readonly slots: PieceSprites[] = [new PieceSprites(false), new PieceSprites(false), new PieceSprites(false)];
  readonly bonus = new PieceSprites(false);
  readonly drag = new PieceSprites(true);
  private pips: Sprite[] = [];
  private glow = new Sprite();
  /** The home screen's drifting blocks. */
  private deco = new Container();
  private decoBits: { s: Sprite; x: number; y: number; phase: number; speed: number; spin: number }[] = [];
  private time = 0;
  reducedDeco = false;
  fx!: Fx;
  atlas!: Atlas;
  layout!: Layout;
  view!: View;
  dpr = 1;
  dirty = true;
  lost = false;
  /** Frames actually drawn (the test hook reports it). */
  frames = 0;
  /** True on a software WebGL renderer, or after the frame-rate governor found the device slow. */
  software = false;
  private bgTex: Texture | null = null; private panelTex: Texture | null = null; private glowTex: Texture | null = null;

  async init(canvasEl: HTMLCanvasElement, layout: Layout, view: View, dpr: number) {
    this.renderer = new WebGLRenderer();
    await this.renderer.init({ canvas: canvasEl, width: layout.w, height: layout.h, resolution: dpr, autoDensity: true, antialias: false, background: view.theme.bg[0], skipExtensionImports: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.dpr = dpr; this.layout = layout; this.view = view;
    // A software renderer (no GPU) draws every pixel on the CPU: keep the canvas at 1× there.
    try {
      const gl = (this.renderer as unknown as { gl: WebGLRenderingContext }).gl;
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      this.software = /swiftshader|llvmpipe|software|softpipe/i.test(String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)));
    } catch { this.software = false; }
    canvasEl.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; });
    canvasEl.addEventListener('webglcontextrestored', () => { this.lost = false; this.rebuild(); });
    this.stage.addChild(this.bg, this.deco, this.world);
    for (let i = 0; i < 14; i++) { const sp = make(); this.deco.addChild(sp); this.decoBits.push({ s: sp, x: 0, y: 0, phase: i * 1.7, speed: 0.25 + (i % 5) * 0.06, spin: ((i % 3) - 1) * 0.15 }); }
    this.deco.visible = false;
    for (let i = 0; i < 64; i++) {
      const b = make(); b.visible = false; this.cells.push(b);
      const s = make(); s.visible = false; this.symbols.push(s);
      const it = make(); it.visible = false; this.items.push(it);
      const h = make(); h.visible = false; this.hints.push(h);
      const gh = make(); gh.visible = false; this.ghosts.push(gh);
      const sw = make(); sw.visible = false; this.sweepers.push(sw);
      const fl = make(); fl.visible = false; this.flyers.push(fl);
    }
    this.cellLayer.addChild(...this.cells, ...this.symbols, ...this.items, ...this.sweepers, ...this.flyers);
    const hintLayer = new Container(); hintLayer.addChild(...this.hints);
    const ghostLayer = new Container(); ghostLayer.addChild(...this.ghosts);
    for (let i = 0; i < 7; i++) { const p = make(); this.pips.push(p); }
    this.glow.anchor.set(0.5);
    this.world.addChild(this.panel, this.cellLayer, ghostLayer, hintLayer, this.slotGlow, ...this.slots.map(s => s.root), this.bonus.root, ...this.pips, this.glow);
    this.rebuild();
    this.world.addChild(this.fx.layer, this.drag.root, this.fx.wordLayer);
    this.drag.root.visible = false;
  }

  /** (Re)draws every texture for the current theme, look and size. */
  rebuild() {
    const { layout: l, view: v, dpr } = this;
    this.atlas = buildAtlas(v.theme, l.cell, dpr, v.look);
    if (this.fx) this.fx.setAtlas(this.atlas); else this.fx = new Fx(this.atlas);
    setWordResolution(dpr);
    this.bgTex?.destroy(true); this.panelTex?.destroy(true); this.glowTex?.destroy(true);
    this.bgTex = textureOf(backgroundCanvas(v.theme, Math.ceil(l.w), Math.ceil(l.h)), 1);
    this.bg.texture = this.bgTex; this.bg.position.set(0, 0); this.bg.width = l.w; this.bg.height = l.h;
    this.panelTex = textureOf(boardCanvas(v.theme, l.cell, dpr, v.look), dpr);
    this.panel.texture = this.panelTex; this.panel.position.set(l.board.x - l.cell * 0.2, l.board.y - l.cell * 0.2);
    const [gc, gctx] = canvas(64, 64); const g = gctx.createRadialGradient(32, 32, 4, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,235,0.9)'); g.addColorStop(1, 'rgba(255,250,210,0)'); gctx.fillStyle = g; gctx.fillRect(0, 0, 64, 64);
    this.glowTex = textureOf(gc, 1); this.glow.texture = this.glowTex; this.glow.position.set(l.board.x + l.board.w / 2, l.board.y + l.board.h / 2); this.glow.width = l.board.w * 1.5; this.glow.height = l.board.h * 1.5; this.glow.alpha = 0;
    this.slotGlow.texture = slotTexture(l.slots[0], dpr, v.theme.accent); this.slotGlow.anchor.set(0.5); this.slotGlow.visible = false;
    for (let i = 0; i < 64; i++) {
      const x = l.board.x + (i % 8 + 0.5) * l.cell, y = l.board.y + (Math.floor(i / 8) + 0.5) * l.cell;
      for (const s of [this.cells[i]!, this.symbols[i]!, this.items[i]!, this.hints[i]!, this.ghosts[i]!, this.sweepers[i]!, this.flyers[i]!]) { s.position.set(x, y); s.scale.set(1); }
      this.hints[i]!.texture = this.atlas.hint; this.ghosts[i]!.texture = this.atlas.ghost;
    }
    const gap = Math.min(l.streak.w / 8, 26);
    this.layoutDeco();
    this.pips.forEach((p, i) => { p.texture = this.atlas.ring; p.position.set(l.streak.x + l.streak.w / 2 + (i - 3) * gap, l.streak.y + l.streak.h / 2); p.scale.set(0.3); });
    this.dirty = true;
  }

  resize(layout: Layout, dpr: number) {
    this.layout = layout; this.dpr = dpr;
    this.renderer.resolution = dpr;
    this.renderer.resize(layout.w, layout.h);
    this.rebuild();
  }

  /** Hides the board and tray (the home screen shows the background and a few drifting blocks). */
  showWorld(on: boolean) { if (this.world.visible !== on) { this.world.visible = on; this.deco.visible = !on; this.dirty = true; } }

  /** The menu's box on the home screen: drifting blocks never sit behind it. */
  private decoAvoid: { x: number; y: number; w: number; h: number } | null = null;
  avoidDeco(r: { x: number; y: number; w: number; h: number } | null) { this.decoAvoid = r; this.layoutDeco(); this.dirty = true; }

  private layoutDeco() {
    const l = this.layout, size = Math.max(36, Math.min(l.w, l.h) * 0.09);
    const portrait = l.h >= l.w;
    this.decoBits.forEach((d, i) => {
      // only in bands the menu never covers: top and bottom on a tall screen, the sides on a wide one
      // seven per band, evenly spaced along it with a little jitter
      const first = i % 2 === 0, k = Math.floor(i / 2), along = (k + 0.5) / 7 + (((i * 0.618) % 1) - 0.5) * 0.06, across = ((i * 0.382 + 0.17) % 1);
      if (portrait) { d.x = l.w * (0.05 + along * 0.9); d.y = first ? l.h * (0.03 + across * 0.12) : l.h * (0.87 + across * 0.1); }
      else { d.x = first ? l.w * (0.04 + across * 0.12) : l.w * (0.84 + across * 0.12); d.y = l.h * (0.05 + along * 0.9); }
      d.s.texture = this.atlas.block[1 + (i % 6)]!; d.s.scale.set((size / this.atlas.cell) * (0.7 + (i % 3) * 0.2)); d.s.alpha = 0.85; d.s.rotation = d.spin;
      const a = this.decoAvoid, m = size;
      d.s.visible = !a || !(d.x > a.x - m && d.x < a.x + a.w + m && d.y > a.y - m && d.y < a.y + a.h + m);
      d.s.position.set(d.x, d.y);
    });
  }

  setView(view: View) { this.view = view; this.renderer.background.color = view.theme.bg[0]; this.rebuild(); }

  /** Shows the board exactly as the game has it. */
  syncBoard(g: Game) {
    const a = this.atlas;
    for (let i = 0; i < 64; i++) {
      const color = g.colors[i]!, b = this.cells[i]!, s = this.symbols[i]!, it = this.items[i]!;
      b.visible = color > 0; s.visible = color > 0 && color < STONE && this.view.symbols;
      if (color) { b.texture = a.block[color]!; b.scale.set(1); b.alpha = 1; b.rotation = 0; if (color < STONE) s.texture = a.symbol[color]!; }
      const item = (i < 32 ? (g.itemLo >>> i) & 1 : (g.itemHi >>> (i - 32)) & 1) === 1;
      it.visible = item; if (item) { it.texture = a.item[this.view.item]; it.scale.set(0.9); }
    }
    this.dirty = true;
  }

  /** Shows the tray (and the Single block when there is one). `hidden` slots are being dragged. */
  syncTray(g: Game, hidden = -1) {
    const l = this.layout;
    g.tray.forEach((slot, k) => {
      const v = this.slots[k]!, r = l.slots[k]!;
      const p = k === hidden ? null : slot?.piece ?? null;
      v.set(p, slot?.color ?? 0, this.atlas, p ? trayFit(l, r, p.w, p.h) : l.trayCell, this.view.symbols);
      v.root.position.set(r.x + r.w / 2, r.y + r.h / 2); v.root.scale.set(1); v.root.alpha = 1;
    });
    const b = this.bonusRect();
    this.bonus.set(hidden === 3 ? null : g.bonus?.piece ?? null, g.bonus?.color ?? 0, this.atlas, l.trayCell * 1.2, this.view.symbols);
    this.bonus.root.position.set(b.x + b.w / 2, b.y + b.h / 2);
    this.dirty = true;
  }

  /** Where the Single block sits: between the board and the tray (portrait) or above the tray (landscape). */
  bonusRect(): Rect {
    const l = this.layout, s = 56;
    return l.portrait ? { x: l.board.x + l.board.w - s, y: l.tray.y - s * 0.55, w: s, h: s } : { x: l.tray.x + l.tray.w / 2 - s / 2, y: l.tray.y - s - 4, w: s, h: s };
  }

  selectSlot(k: number | null) {
    const r = k === null ? null : k === 3 ? this.bonusRect() : this.layout.slots[k]!;
    this.slotGlow.visible = !!r;
    if (r) { this.slotGlow.position.set(r.x + r.w / 2, r.y + r.h / 2); this.slotGlow.scale.set(k === 3 ? Math.min(r.w / this.layout.slots[0].w, r.h / this.layout.slots[0].h) : 1); }
    this.dirty = true;
  }

  /** The ghost where a piece would land, and a glow on the lines it would clear. */
  showGhost(piece: Piece | null, pos: number, rows = 0, cols = 0) {
    for (let i = 0; i < 64; i++) { this.ghosts[i]!.visible = false; this.hints[i]!.visible = false; }
    if (piece && pos >= 0) {
      for (const [dr, dc] of piece.cells) this.ghosts[(piece.pr[pos]! + dr) * 8 + piece.pc[pos]! + dc]!.visible = true;
      for (let i = 0; i < 64; i++) if ((rows >> Math.floor(i / 8)) & 1 || (cols >> (i % 8)) & 1) this.hints[i]!.visible = true;
    }
    this.dirty = true;
  }

  /** Streak pips above the board: lit for the streak, fading as dry moves use up its life. */
  streak(streak: number, dry: number) {
    const k = Math.min(26, this.layout.streak.w / 8) / this.atlas.cell;
    this.pips.forEach((p, i) => { const on = i < Math.min(7, streak); p.texture = on ? this.atlas.sparkle : this.atlas.ring; p.alpha = on ? (dry === 0 ? 1 : dry === 1 ? 0.75 : 0.5) : 0.4; p.scale.set(on ? k * 1.25 : k * 0.62); });
    this.dirty = true;
  }

  /** The dragged piece at board size, following (x, y) (its center). */
  startDrag(slot: Slot) { this.drag.set(slot.piece, slot.color, this.atlas, this.layout.cell, this.view.symbols); this.drag.root.visible = true; this.dirty = true; }
  moveDrag(x: number, y: number, scale = 1) { this.drag.root.position.set(x, y); this.drag.root.scale.set(scale); this.dirty = true; }
  endDrag() { this.drag.root.visible = false; this.dirty = true; }

  /** Squash-and-settle on freshly placed cells. */
  squash(cells: number[], reduced: boolean) {
    if (reduced) return;
    for (const i of cells) { const b = this.cells[i]!; tween(0.22, k => { const s = 1 + Math.sin(k * Math.PI) * 0.12; b.scale.set(s, 2 - s); this.dirty = true; }, { ease: ease.out }); }
  }

  /** Cleared cells: a sweep along each line (shrink and fade, staggered from where the piece landed) with sparkles; collected gems float up. */
  sweep(cleared: { index: number; color: number }[], collected: number[], fromR: number, fromC: number, reduced: boolean, onDone: () => void) {
    const l = this.layout;
    for (const i of collected) {
      const f = this.flyers[i]!, home = this.cellCenter(i);
      f.texture = this.atlas.item[this.view.item]; f.visible = true; f.alpha = 1;
      tween(reduced ? 0.2 : 0.7, k => { f.position.set(home.x, home.y - k * l.cell * 1.6); f.scale.set(0.9 + Math.sin(k * Math.PI) * 0.5); f.alpha = 1 - k * k; this.dirty = true; }, { ease: ease.out, done: () => { f.visible = false; f.position.set(home.x, home.y); } });
    }
    if (!cleared.length) { onDone(); return; }
    let left = cleared.length;
    for (const { index, color } of cleared) {
      const b = this.sweepers[index]!;
      b.texture = this.atlas.block[color] ?? this.atlas.block[1]!; b.visible = true; b.alpha = 1; b.scale.set(1);
      const d = Math.abs(Math.floor(index / 8) - fromR) + Math.abs((index % 8) - fromC);
      tween(reduced ? 0.12 : 0.28, k => { b.scale.set(1 + k * 0.15 - k * k * 1.05); b.alpha = 1 - k; this.dirty = true; }, {
        delay: reduced ? 0 : d * 0.035, ease: ease.inOut,
        done: () => {
          b.visible = false; b.scale.set(1);
          this.fx.sparkles(l.board.x + (index % 8 + 0.5) * l.cell, l.board.y + (Math.floor(index / 8) + 0.5) * l.cell, l.cell, 3);
          if (--left === 0) onDone();
        },
      });
    }
  }

  /** Stones crack in place. */
  crack(cells: number[]) { for (const i of cells) { const b = this.cells[i]!; b.texture = this.atlas.block[CRACKED]!; tween(0.25, k => { b.rotation = Math.sin(k * Math.PI * 4) * 0.08 * (1 - k); this.dirty = true; }); } }

  /** Advances effects, then draws if anything changed. */
  frame(dt: number, animating: boolean) {
    let busy = this.fx.update(dt);
    if (this.deco.visible && !this.reducedDeco) {
      this.time += dt; busy = true;
      for (const d of this.decoBits) { d.s.position.set(d.x + Math.sin(this.time * d.speed + d.phase) * 10, d.y + Math.cos(this.time * d.speed * 0.8 + d.phase) * 14); d.s.rotation = d.spin + Math.sin(this.time * d.speed * 0.5 + d.phase) * 0.12; }
    }
    this.glow.alpha = this.fx.glow;
    this.world.position.set(this.fx.shakeX, this.fx.shakeY);
    if (!this.lost && (this.dirty || busy || animating)) { this.renderer.render(this.stage); this.dirty = false; this.frames++; }
  }

  /** Where the dragged piece is (CSS px), for the test hook. */
  dragState() { const r = this.drag.root; return { visible: r.visible, x: r.position.x, y: r.position.y, scale: r.scale.x }; }

  /** Board-cell center in CSS px. */
  cellCenter(i: number) { const l = this.layout; return { x: l.board.x + (i % 8 + 0.5) * l.cell, y: l.board.y + (Math.floor(i / 8) + 0.5) * l.cell }; }
}

function slotTexture(r: Rect, dpr: number, accent: string): Texture {
  const pad = 6, [c, ctx] = canvas((r.w + pad * 2) * dpr, (r.h + pad * 2) * dpr);
  ctx.scale(dpr, dpr);
  rounded(ctx, pad + 4, pad + 4, r.w - 8, r.h - 8, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = accent; ctx.stroke();
  return textureOf(c, dpr);
}
