// Home decorating editor: floor, wall and tabletop pieces, big kid-friendly buttons, undo.
// Arrows move the cursor (or the piece you're holding); small pieces snap onto the table, desk,
// dresser or shelf under the cursor, and wall pieces slide along the walls.
import * as THREE from 'three';
import { item } from '../data/registry';
import type { Command } from '../input/input';
import type { Game } from '../sim/game';
import {
  applySurface,
  applySurfaceFromStorage,
  canPlace,
  canPlaceOnSurface,
  canPlaceWall,
  footprint,
  furnitureAt,
  homeData,
  homeSnapshot,
  isSmall,
  itemOnSlot,
  moveFurniture,
  moveSmall,
  moveWall,
  placeFromPockets,
  placeFromStorage,
  placeOnSurface,
  placeWall,
  restoreHomeSnapshot,
  roomSize,
  slotTile,
  storeFurniture,
  storeWall,
  surfaceAt,
  surfaceTop,
  wallItemAt,
  wallLength,
  WALL_NAMES,
  type ItemSource,
} from '../sim/housing';
import { rebuildRoom } from '../sim/interior';
import type { InteriorView } from '../render/interior';
import { furnitureObject } from '../render/interior';
import { btn, clear, h, type Panel, type UIManager } from './dom';
import { iconImg } from './icons';

/** What the player is carrying: something new from pockets/storage, or a placed piece being moved. */
type Held =
  | { kind: 'new'; src: ItemSource; id: string }
  | { kind: 'floor'; uid: number; id: string; ox: number; oz: number; orot: number; on?: number; slot?: number }
  | { kind: 'wall'; uid: number; id: string; owall: number; opos: number };

export const UNDO_LIMIT = 10;

export class EditorPanel implements Panel {
  name = 'editor';
  el: HTMLElement;
  modal = true;
  /** floor cursor */
  private cx = 1;
  private cz = 1;
  /** wall cursor (used while in wall mode) */
  private wall = 0;
  private wpos = 0;
  private wallMode = false;
  private rot = 0;
  private held: Held | null = null;
  private undo: string[] = [];
  private side = h('div', { class: 'editor-side scroll' });
  private status = h('div', { class: 'editor-status' });
  private bar = h('div', { class: 'editor-bar' });
  private previewKey = '';
  private listMode = false;
  private onDown: (e: PointerEvent) => void;

  constructor(private ui: UIManager, private g: Game, private view: InteriorView, private canvas: HTMLCanvasElement) {
    this.el = h(
      'div',
      { class: 'editor' },
      h('div', { class: 'panel editor-panel' }, h('h2', null, 'Decorate', h('span', { class: 'spacer' }), btn('✔ Done', () => ui.pop(this), 'primary')), this.status, this.side),
      this.bar,
    );
    const { w, d } = roomSize(g);
    this.cx = Math.floor(w / 2);
    this.cz = Math.floor(d / 2);
    this.onDown = (e) => this.pointer(e);
    canvas.addEventListener('pointerdown', this.onDown);
    this.buildBar();
    this.render();
  }

  onClose(): void {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.cancelHeld();
    this.view.cursor.visible = false;
    this.view.preview.clear();
    this.view.hidden = new Set();
    rebuildRoom(this.g);
    this.view.invalidate();
  }

  // ---------------------------------------------------------------- input

  private pointer(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.view.camera);
    const { w, d } = roomSize(this.g);
    const wantWall = this.held ? this.isWallPiece(this.held.id) : this.wallMode;
    if (wantWall) {
      // nearest wall plane hit at a sensible height
      const planes: [number, THREE.Plane][] = [
        [0, new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)],
        [1, new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)],
        [2, new THREE.Plane(new THREE.Vector3(-1, 0, 0), w)],
      ];
      let best: { wall: number; pos: number; dist: number } | null = null;
      for (const [wall, pl] of planes) {
        const hit = new THREE.Vector3();
        if (!ray.ray.intersectPlane(pl, hit) || hit.y < 0.3 || hit.y > 2.8) continue;
        const along = wall === 0 ? hit.x : hit.z;
        if (along < 0 || along > (wall === 0 ? w : d)) continue;
        const dist = hit.distanceTo(ray.ray.origin);
        if (!best || dist < best.dist) best = { wall, pos: Math.floor(along), dist };
      }
      if (!best) return;
      this.wall = best.wall;
      this.wpos = this.fitWallPos(best.wall, best.pos);
      this.confirm();
      this.sync();
      return;
    }
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return;
    const x = Math.floor(hit.x), z = Math.floor(hit.z);
    if (x < 0 || z < 0 || x >= w || z >= d) return;
    this.cx = x;
    this.cz = z;
    this.confirm();
    this.sync();
  }

  command(c: Command): boolean {
    if (c === 'tabNext' || c === 'tabPrev') {
      const items = Array.from(this.side.querySelectorAll('[data-nav]')) as HTMLElement[];
      if (!items.length) return true;
      const cur = items.findIndex((e) => e.classList.contains('focus'));
      const next = items[(cur + (c === 'tabNext' ? 1 : items.length - 1) + (cur < 0 ? 1 : 0)) % items.length]!;
      this.ui.focus(next);
      this.listMode = true;
      return true;
    }
    if (c === 'action') return true;
    if (c === 'confirm' && this.listMode) {
      const f = this.el.querySelector('.focus') as HTMLElement | null;
      this.listMode = false;
      if (f) {
        f.click();
        return true;
      }
    }
    if (c === 'up' || c === 'down' || c === 'left' || c === 'right') {
      this.listMode = false;
      this.step(c === 'left' ? -1 : c === 'right' ? 1 : 0, c === 'up' ? -1 : c === 'down' ? 1 : 0);
      return true;
    }
    switch (c) {
      case 'confirm':
        this.confirm();
        break;
      case 'rotate':
      case 'toolRing':
        this.rotate();
        break;
      case 'store':
      case 'inventory':
        this.store();
        break;
      case 'undo':
        this.doUndo();
        break;
      case 'fine':
        this.toggleWalls();
        break;
      case 'back':
      case 'pause':
        if (this.held) this.cancelHeld();
        else this.ui.pop(this);
        break;
      default:
        return false;
    }
    this.sync();
    return true;
  }

  // ---------------------------------------------------------------- actions

  private isWallPiece(id: string): boolean {
    return item(id).furn?.layer === 'wall';
  }

  private fitWallPos(wall: number, pos: number): number {
    const width = this.held ? (item(this.held.id).furn?.w ?? 1) : 1;
    return Math.max(0, Math.min(wallLength(this.g, wall) - width, pos));
  }

  /** Arrow keys / buttons. In wall mode the cursor walks around the three walls as one strip. */
  private step(dx: number, dz: number): void {
    const { w, d } = roomSize(this.g);
    const wallCursor = this.held ? this.isWallPiece(this.held.id) : this.wallMode;
    if (wallCursor) {
      // strip: left wall (front→back), back wall (left→right), right wall (back→front)
      const width = this.held ? (item(this.held.id).furn?.w ?? 1) : 1;
      const strip: [number, number][] = [];
      for (let z = d - width; z >= 0; z--) strip.push([1, z]);
      for (let x = 0; x <= w - width; x++) strip.push([0, x]);
      for (let z = 0; z <= d - width; z++) strip.push([2, z]);
      let k = strip.findIndex(([wl, p]) => wl === this.wall && p === this.wpos);
      if (k < 0) k = d;
      const delta = dx !== 0 ? dx : this.wall === 1 ? -dz : this.wall === 2 ? dz : dx || -dz;
      k = Math.max(0, Math.min(strip.length - 1, k + delta));
      [this.wall, this.wpos] = strip[k]!;
    } else {
      this.cx = Math.max(0, Math.min(w - 1, this.cx + dx));
      this.cz = Math.max(0, Math.min(d - 1, this.cz + dz));
    }
    this.sync();
  }

  private snapshot(): void {
    this.undo.push(homeSnapshot(this.g));
    if (this.undo.length > UNDO_LIMIT) this.undo.shift();
  }

  private doUndo(): void {
    if (this.held && this.held.kind !== 'new') this.cancelHeld();
    this.held = null;
    const snap = this.undo.pop();
    if (!snap) {
      this.g.emit('sfx', { name: 'error' });
      return;
    }
    restoreHomeSnapshot(this.g, snap);
    this.g.emit('sfx', { name: 'pickup' });
    rebuildRoom(this.g);
    this.render();
  }

  /** Where the held piece would go right now: a surface slot, the floor, or a wall spot. */
  private target(): { kind: 'surface'; parent: number; slot: number } | { kind: 'floor' } | { kind: 'wall' } {
    if (!this.held) return { kind: 'floor' };
    if (this.isWallPiece(this.held.id)) return { kind: 'wall' };
    if (isSmall(this.held.id)) {
      const s = surfaceAt(this.g, this.cx, this.cz);
      const selfUid = this.held.kind === 'floor' ? this.held.uid : -1;
      if (s && s.parent.uid !== selfUid) return { kind: 'surface', parent: s.parent.uid, slot: s.slot };
    }
    return { kind: 'floor' };
  }

  private canDrop(): boolean {
    const g = this.g;
    const held = this.held;
    if (!held) return false;
    const t = this.target();
    const ignore = held.kind === 'new' ? -1 : held.uid;
    if (t.kind === 'wall') return canPlaceWall(g, held.id, this.wall, this.wpos, ignore);
    if (t.kind === 'surface') return canPlaceOnSurface(g, held.id, t.parent, t.slot, ignore);
    return canPlace(g, held.id, this.cx, this.cz, this.rot, ignore);
  }

  private confirm(): void {
    const g = this.g;
    const held = this.held;
    if (held) {
      if (!this.canDrop()) {
        g.emit('sfx', { name: 'error' });
        return;
      }
      this.snapshotBeforeDrop();
      const t = this.target();
      let ok = false;
      if (held.kind === 'new') {
        if (t.kind === 'wall') ok = placeWall(g, held.src, this.wall, this.wpos);
        else if (t.kind === 'surface') ok = placeOnSurface(g, held.src, t.parent, t.slot);
        else ok = held.src.kind === 'pocket' ? placeFromPockets(g, held.src.index, this.cx, this.cz, this.rot) : placeFromStorage(g, held.src.index, this.cx, this.cz, this.rot);
      } else if (held.kind === 'wall') ok = moveWall(g, held.uid, this.wall, this.wpos);
      else if (t.kind === 'surface') ok = moveSmall(g, held.uid, t.parent, t.slot);
      else if (held.on !== undefined) ok = moveSmall(g, held.uid, -1, 0, this.cx, this.cz, this.rot);
      else ok = moveFurniture(g, held.uid, this.cx, this.cz, this.rot);
      if (ok) {
        this.held = null;
        this.pendingSnap = null;
        rebuildRoom(g);
        this.render();
      } else {
        this.undo.pop();
        g.emit('sfx', { name: 'error' });
      }
      return;
    }
    // pick up what's under the cursor: a wall piece in wall mode; else a tabletop piece, else the furniture
    if (this.wallMode) {
      const wi = wallItemAt(g, this.wall, this.wpos);
      if (wi) this.grab({ kind: 'wall', uid: wi.uid, id: wi.id, owall: wi.wall, opos: wi.pos });
      return;
    }
    const s = surfaceAt(g, this.cx, this.cz);
    const top = s ? itemOnSlot(g, s.parent.uid, s.slot) : undefined;
    const pf = top ?? furnitureAt(g, this.cx, this.cz);
    if (pf) {
      this.rot = pf.rot;
      if (pf.on === undefined) {
        this.cx = pf.x;
        this.cz = pf.z;
      }
      this.grab({ kind: 'floor', uid: pf.uid, id: pf.id, ox: pf.x, oz: pf.z, orot: pf.rot, on: pf.on, slot: pf.slot });
    }
  }

  /** The snapshot for a move is taken when it's picked up, and kept only if it's dropped. */
  private pendingSnap: string | null = null;
  private snapshotBeforeDrop(): void {
    this.undo.push(this.pendingSnap ?? homeSnapshot(this.g));
    if (this.undo.length > UNDO_LIMIT) this.undo.shift();
  }

  private grab(h2: Held): void {
    this.pendingSnap = homeSnapshot(this.g);
    this.held = h2;
    if (h2.kind === 'wall') {
      this.wall = h2.owall;
      this.wpos = h2.opos;
    }
    this.g.emit('sfx', { name: 'pickup' });
    this.render();
  }

  private rotate(): void {
    const g = this.g;
    if (this.held) {
      if (!this.isWallPiece(this.held.id)) this.rot = (this.rot + 1) % 4;
      return;
    }
    const pf = furnitureAt(g, this.cx, this.cz);
    if (!pf) return;
    const snap = homeSnapshot(g);
    if (moveFurniture(g, pf.uid, pf.x, pf.z, (pf.rot + 1) % 4)) {
      this.undo.push(snap);
      if (this.undo.length > UNDO_LIMIT) this.undo.shift();
      rebuildRoom(g);
    } else g.emit('sfx', { name: 'error' });
  }

  private store(): void {
    const g = this.g;
    const held = this.held;
    if (held && held.kind !== 'new') {
      this.undo.push(this.pendingSnap ?? homeSnapshot(g));
      if (held.kind === 'wall') storeWall(g, held.uid);
      else storeFurniture(g, held.uid);
      this.held = null;
    } else if (held) this.held = null;
    else {
      const snap = homeSnapshot(g);
      let done = false;
      if (this.wallMode) {
        const wi = wallItemAt(g, this.wall, this.wpos);
        if (wi) done = storeWall(g, wi.uid);
      } else {
        const s = surfaceAt(g, this.cx, this.cz);
        const pf = (s ? itemOnSlot(g, s.parent.uid, s.slot) : undefined) ?? furnitureAt(g, this.cx, this.cz);
        if (pf) done = storeFurniture(g, pf.uid);
      }
      if (done) this.undo.push(snap);
    }
    if (this.undo.length > UNDO_LIMIT) this.undo.shift();
    rebuildRoom(g);
    this.render();
  }

  private cancelHeld(): void {
    const held = this.held;
    if (held?.kind === 'floor') {
      if (held.on !== undefined) moveSmall(this.g, held.uid, held.on, held.slot ?? 0);
      else moveFurniture(this.g, held.uid, held.ox, held.oz, held.orot);
    }
    this.held = null;
    this.pendingSnap = null;
    this.render();
  }

  private toggleWalls(): void {
    if (this.held) return;
    this.wallMode = !this.wallMode;
    this.render();
  }

  // ---------------------------------------------------------------- view

  private sync(): void {
    const g = this.g;
    const v = this.view;
    const held = this.held;
    const room = roomSize(g);
    const t = this.target();
    const wallCursor = held ? t.kind === 'wall' : this.wallMode;
    const width = held ? (item(held.id).furn?.w ?? 1) : 1;
    v.cursor.visible = true;
    v.cursor.rotation.set(0, 0, 0);
    if (wallCursor) {
      // a flat highlight on the wall
      const mid = this.wpos + width / 2;
      v.cursor.scale.set(this.wall === 0 ? width : 0.1, 1, this.wall === 0 ? 0.1 : width);
      v.cursor.position.set(this.wall === 0 ? mid : this.wall === 1 ? 0.06 : room.w - 0.06, 1.0, this.wall === 0 ? 0.06 : mid);
      v.cursor.scale.y = 28;
    } else if (t.kind === 'surface' && held) {
      const parent = homeData(g).furniture.find((f) => f.uid === t.parent)!;
      const tile = slotTile(parent, t.slot);
      v.cursor.scale.set(1, 1, 1);
      v.cursor.position.set(tile.x + 0.5, surfaceTop(parent.id)!.y, tile.z + 0.5);
    } else {
      const fp = held ? footprint(held.id, this.rot) : { w: 1, d: 1 };
      v.cursor.scale.set(fp.w, 1, fp.d);
      v.cursor.position.set(this.cx + fp.w / 2, 0, this.cz + fp.d / 2);
    }
    const valid = held ? this.canDrop() : true;
    ((v.cursor.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(valid ? 0x8fe39a : 0xf27c7c);
    // preview of the held piece
    const key = held ? `${held.id}|${this.rot}|${t.kind}` : '';
    if (key !== this.previewKey) {
      this.previewKey = key;
      v.preview.clear();
      if (held) {
        const obj = furnitureObject(held.id);
        if (obj) v.preview.add(obj);
      }
    }
    v.preview.visible = !!held;
    v.preview.scale.setScalar(1);
    if (held) {
      if (t.kind === 'wall') this.view.placeOnWall(v.preview, room, this.wall, this.wpos, width);
      else if (t.kind === 'surface') {
        const parent = homeData(g).furniture.find((f) => f.uid === t.parent)!;
        const tile = slotTile(parent, t.slot);
        const top = surfaceTop(parent.id)!;
        const th = -parent.rot * (Math.PI / 2);
        v.preview.position.set(tile.x + 0.5 + Math.sin(th) * top.z, top.y, tile.z + 0.5 + Math.cos(th) * top.z);
        v.preview.rotation.y = th;
        v.preview.scale.setScalar(0.55);
      } else {
        const fp = footprint(held.id, this.rot);
        v.preview.position.set(this.cx + fp.w / 2, 0.02, this.cz + fp.d / 2);
        v.preview.rotation.y = -this.rot * (Math.PI / 2);
      }
    }
    // hide the original while moving it (view only — the saved state is never touched)
    const hide = held && held.kind !== 'new' ? held.uid : -1;
    if (!v.hidden.has(hide) || v.hidden.size !== (hide >= 0 ? 1 : 0)) {
      v.hidden = new Set(hide >= 0 ? [hide] : []);
      v.invalidate();
    }
    this.renderStatus();
  }

  private renderStatus(): void {
    const g = this.g;
    const held = this.held;
    clear(this.status);
    let text: string;
    if (held) {
      const t = this.target();
      const name = item(held.id).name;
      text = t.kind === 'wall' ? `${name}: pick a spot on the ${WALL_NAMES[this.wall]}.` : t.kind === 'surface' ? `${name}: it will sit on top.` : `${name}: pick a spot on the floor.`;
    } else if (this.wallMode) {
      const wi = wallItemAt(g, this.wall, this.wpos);
      text = wi ? `${item(wi.id).name} — tap ✋ Move or 📦 Put away.` : 'Walls: pick a wall piece from the list, or tap one to move it.';
    } else {
      const s = surfaceAt(g, this.cx, this.cz);
      const pf = (s ? itemOnSlot(g, s.parent.uid, s.slot) : undefined) ?? furnitureAt(g, this.cx, this.cz);
      text = pf ? `${item(pf.id).name} — tap ✋ Move, 🔄 Turn or 📦 Put away.` : 'Pick something from the list, or tap a piece to move it.';
    }
    this.status.append(h('div', { class: 'editor-say' }, text), h('div', { class: 'tiny muted' }, 'Keys: arrows move · E place · R turn · X put away · U undo · F walls'));
    const undoBtn = this.bar.querySelector('[data-act="undo"]') as HTMLButtonElement | null;
    if (undoBtn) undoBtn.disabled = this.undo.length === 0;
    const wallBtn = this.bar.querySelector('[data-act="walls"]') as HTMLButtonElement | null;
    if (wallBtn) {
      wallBtn.textContent = this.wallMode ? '🪑 Floor' : '🖼 Walls';
      wallBtn.disabled = !!held;
    }
  }

  private buildBar(): void {
    const big = (label: string, act: string, f: () => void, cls = '') => btn(label, () => {
      f();
      this.sync();
    }, `editor-btn ${cls}`, { 'data-act': act, 'aria-label': act });
    this.bar.append(
      h(
        'div',
        { class: 'editor-pad' },
        big('⬆', 'up', () => this.step(0, -1)),
        h('div', { class: 'row' }, big('⬅', 'left', () => this.step(-1, 0)), big('⬇', 'down', () => this.step(0, 1)), big('➡', 'right', () => this.step(1, 0))),
      ),
      big('✋ Move / Place', 'confirm', () => this.confirm(), 'primary'),
      big('🔄 Turn', 'rotate', () => this.rotate()),
      big('📦 Put away', 'store', () => this.store()),
      big('🖼 Walls', 'walls', () => this.toggleWalls()),
      big('↩️ Undo', 'undo', () => this.doUndo()),
    );
  }

  private render(): void {
    const g = this.g;
    clear(this.side);
    const fits = (id: string) => !!item(id).furn || !!item(id).surface;
    const pocket = g.state.player.inv.map((s, i) => ({ s, i })).filter(({ s }) => s && fits(s.id));
    const storage = g.state.home.storage.map((s, i) => ({ s, i })).filter(({ s }) => fits(s.id));
    const tag = (id: string) => {
      const f = item(id).furn;
      return f?.layer === 'wall' ? h('span', { class: 'tag' }, 'wall') : f?.layer === 'small' ? h('span', { class: 'tag' }, 'table-top') : null;
    };
    const row = (id: string, label: string, onClick: () => void) =>
      h('button', { class: 'craft-row', 'data-nav': '', onclick: onClick }, iconImg(id, 'icon sm'), h('span', { class: 'nm' }, label), tag(id));
    const pick = (src: ItemSource, id: string) => {
      const def = item(id);
      if (def.surface) {
        this.snapshot();
        if (src.kind === 'pocket') applySurface(g, src.index);
        else applySurfaceFromStorage(g, src.index);
        rebuildRoom(g);
        this.render();
        return;
      }
      if (this.held && this.held.kind !== 'new') this.cancelHeld();
      this.held = { kind: 'new', src, id };
      this.pendingSnap = null;
      this.rot = 0;
      if (this.isWallPiece(id)) {
        // start on the first free spot (back wall first) so the cursor begins green
        this.wpos = this.fitWallPos(this.wall, this.wpos);
        if (!canPlaceWall(g, id, this.wall, this.wpos)) {
          outer: for (const wall of [0, 1, 2])
            for (let pos = 0; pos < wallLength(g, wall); pos++)
              if (canPlaceWall(g, id, wall, pos)) {
                this.wall = wall;
                this.wpos = pos;
                break outer;
              }
        }
      }
      this.render();
    };
    this.side.append(h('h3', null, 'From pockets'));
    if (!pocket.length) this.side.append(h('div', { class: 'muted tiny' }, 'No furniture in your pockets.'));
    for (const { s, i } of pocket) this.side.append(row(s!.id, item(s!.id).name, () => pick({ kind: 'pocket', index: i }, s!.id)));
    this.side.append(h('h3', null, 'From storage'));
    if (!storage.length) this.side.append(h('div', { class: 'muted tiny' }, 'Storage has no furniture.'));
    for (const { s, i } of storage) this.side.append(row(s.id, `${item(s.id).name}${s.qty > 1 ? ` ×${s.qty}` : ''}`, () => pick({ kind: 'storage', index: i }, s.id)));
    this.sync();
  }
}
