// Home decorating editor: floor, wall and tabletop pieces, big kid-friendly buttons, undo.
// Arrows move the cursor (or the piece you're holding); small pieces snap onto the table, desk,
// dresser or shelf under the cursor, and wall pieces slide along the walls.
// Touch: drag a piece to move it (or tap to pick it up, tap again to put it down); the pieces list
// is a drawer ("＋ Add") so the room stays visible on phones.
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

const touchUI = () => document.documentElement.classList.contains('touch-ui');

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
  /** small pieces go on the floor even over a table */
  private floorOnly = false;
  private onDown: (e: PointerEvent) => void;
  private onTouch: (e: TouchEvent) => void;
  private drag: { id: number; sx: number; sy: number; moved: boolean; grabbed: boolean } | null = null;
  /** where on the held piece the finger is (tiles from its corner), so it moves with the finger */
  private grabOff = { x: 0, z: 0 };

  constructor(private ui: UIManager, private g: Game, private view: InteriorView, private canvas: HTMLCanvasElement) {
    const add = btn('＋ Add', () => this.el.classList.toggle('list-open'), 'editor-add', { 'aria-label': 'Add furniture' });
    this.el = h(
      'div',
      { class: 'editor' },
      h('div', { class: 'panel editor-panel' }, h('h2', null, 'Decorate', h('span', { class: 'spacer' }), add, btn('✔ Done', () => ui.pop(this), 'primary')), this.status, this.side),
      this.bar,
    );
    const { w, d } = roomSize(g);
    this.cx = Math.floor(w / 2);
    this.cz = Math.floor(d / 2);
    this.onDown = (e) => this.pointer(e);
    canvas.addEventListener('pointerdown', this.onDown);
    this.onTouch = (e) => this.touch(e);
    for (const t of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) canvas.addEventListener(t, this.onTouch as EventListener, { passive: false });
    this.buildBar();
    this.render();
  }

  onClose(): void {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    for (const t of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) this.canvas.removeEventListener(t, this.onTouch as EventListener);
    this.cancelHeld();
    this.view.cursor.visible = false;
    this.view.preview.clear();
    this.view.hidden = new Set();
    rebuildRoom(this.g);
    this.view.invalidate();
  }

  // ---------------------------------------------------------------- input

  /** Mouse / pen: click picks up or puts down (touch has its own drag handling below). */
  private pointer(e: PointerEvent): void {
    if (e.pointerType === 'touch') return;
    this.grabOff = { x: 0, z: 0 };
    if (this.aim(e.clientX, e.clientY)) {
      this.confirm();
      this.sync();
    }
  }

  /** Touch: press on a piece and drag it; a tap picks up / puts down like a click. */
  private touch(e: TouchEvent): void {
    e.preventDefault();
    const t = e.changedTouches[0];
    if (!t) return;
    if (e.type === 'touchstart') {
      if (this.drag || e.touches.length > 1) return;
      this.drag = { id: t.identifier, sx: t.clientX, sy: t.clientY, moved: false, grabbed: false };
      if (!this.held) this.grabOff = { x: 0, z: 0 };
      if (!this.aim(t.clientX, t.clientY)) return;
      if (!this.held) {
        const fx = this.cx, fz = this.cz;
        this.confirm();
        this.drag.grabbed = !!this.held;
        if (this.held) this.grabOff = { x: fx - this.cx, z: fz - this.cz };
      }
      this.sync();
      return;
    }
    const d = this.drag;
    if (!d || t.identifier !== d.id) return;
    if (e.type === 'touchmove') {
      if (Math.hypot(t.clientX - d.sx, t.clientY - d.sy) > 10) d.moved = true;
      if (d.moved && this.aim(t.clientX, t.clientY)) this.sync();
      return;
    }
    this.drag = null;
    if (e.type === 'touchend' && this.held && (d.moved || !d.grabbed)) this.confirm();
    this.sync();
  }

  /** Point the cursor at the floor tile or wall spot under a screen point. */
  private aim(clientX: number, clientY: number): boolean {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
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
      if (!best) return false;
      this.wall = best.wall;
      this.wpos = this.fitWallPos(best.wall, best.pos);
      return true;
    }
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return false;
    if (hit.x < 0 || hit.z < 0 || hit.x >= w || hit.z >= d) return false;
    // a piece you're holding keeps the spot where the finger holds it
    const fp = this.held && !this.isWallPiece(this.held.id) ? footprint(this.held.id, this.rot) : { w: 1, d: 1 };
    const off = this.held ? this.grabOff : { x: 0, z: 0 };
    this.cx = Math.max(0, Math.min(w - fp.w, Math.floor(hit.x) - Math.min(off.x, fp.w - 1)));
    this.cz = Math.max(0, Math.min(d - fp.d, Math.floor(hit.z) - Math.min(off.z, fp.d - 1)));
    return true;
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
    if (isSmall(this.held.id) && !this.floorOnly) {
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
      text = wi ? `${item(wi.id).name} — tap ✋ Move or 📦 Put away.` : `Walls: pick a wall piece from ${touchUI() ? '＋ Add' : 'the list'}, or tap one to move it.`;
    } else {
      const s = surfaceAt(g, this.cx, this.cz);
      const pf = (s ? itemOnSlot(g, s.parent.uid, s.slot) : undefined) ?? furnitureAt(g, this.cx, this.cz);
      text = pf
        ? `${item(pf.id).name} — ${touchUI() ? 'drag it, or tap' : 'tap'} ✋ Move, 🔄 Turn or 📦 Put away.`
        : touchUI()
          ? 'Tap ＋ Add to pick a piece, or drag a piece to move it.'
          : 'Pick something from the list, or tap a piece to move it.';
    }
    this.status.append(h('div', { class: 'editor-say' }, text), h('div', { class: 'tiny muted editor-keys' }, 'Keys: arrows move · E place · R turn · X put away · U undo · F walls'));
    const undoBtn = this.bar.querySelector('[data-act="undo"]') as HTMLButtonElement | null;
    if (undoBtn) undoBtn.disabled = this.undo.length === 0;
    const wallBtn = this.bar.querySelector('[data-act="walls"]') as HTMLButtonElement | null;
    if (wallBtn) {
      this.label(wallBtn, this.wallMode ? '🪑' : '🖼', this.wallMode ? 'Floor' : 'Walls');
      wallBtn.disabled = !!held;
    }
    // small pieces: on the table under them, or on the floor
    const tableBtn = this.bar.querySelector('[data-act="table"]') as HTMLButtonElement | null;
    if (tableBtn) {
      const small = !!held && isSmall(held.id) && !this.isWallPiece(held.id);
      tableBtn.style.display = small ? '' : 'none';
      this.label(tableBtn, this.floorOnly ? '⬇' : '⬆', this.floorOnly ? 'On floor' : 'On table');
    }
    const placeBtn = this.bar.querySelector('[data-act="confirm"]') as HTMLButtonElement | null;
    if (placeBtn) this.label(placeBtn, '✋', held ? 'Place' : 'Move');
  }

  private label(b: HTMLElement, icon: string, cap: string): void {
    const ico = b.querySelector('.eb-ico'), c = b.querySelector('.eb-cap');
    if (ico && ico.textContent !== icon) ico.textContent = icon;
    if (c && c.textContent !== cap) c.textContent = cap;
  }

  private buildBar(): void {
    const big = (icon: string, cap: string, act: string, f: () => void, cls = '') =>
      btn([h('span', { class: 'eb-ico' }, icon), cap ? h('span', { class: 'eb-cap' }, cap) : null], () => {
        f();
        this.sync();
      }, `editor-btn ${cls}`, { 'data-act': act, 'aria-label': cap || act });
    this.bar.append(
      h(
        'div',
        { class: 'editor-pad' },
        big('⬆', '', 'up', () => this.step(0, -1)),
        h('div', { class: 'row' }, big('⬅', '', 'left', () => this.step(-1, 0)), big('⬇', '', 'down', () => this.step(0, 1)), big('➡', '', 'right', () => this.step(1, 0))),
      ),
      big('✋', 'Move', 'confirm', () => this.confirm(), 'primary'),
      big('🔄', 'Turn', 'rotate', () => this.rotate()),
      big('⬆', 'On table', 'table', () => (this.floorOnly = !this.floorOnly)),
      big('📦', 'Put away', 'store', () => this.store()),
      big('🖼', 'Walls', 'walls', () => this.toggleWalls()),
      big('↩️', 'Undo', 'undo', () => this.doUndo()),
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
      this.el.classList.remove('list-open');
      this.floorOnly = false;
      this.grabOff = { x: 0, z: 0 };
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
