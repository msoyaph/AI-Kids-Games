// Furniture editor for the home interior: grid cursor, place / move / rotate / store, walls & floors.
import * as THREE from 'three';
import { item } from '../data/registry';
import type { Command } from '../input/input';
import type { Game } from '../sim/game';
import { applySurface, applySurfaceFromStorage, canPlace, footprint, furnitureAt, moveFurniture, placeFromPockets, placeFromStorage, roomSize, storeFurniture } from '../sim/housing';
import { rebuildRoom } from '../sim/interior';
import type { InteriorView } from '../render/interior';
import { furnitureObject } from '../render/interior';
import { btn, clear, h, type Panel, type UIManager } from './dom';
import { iconImg } from './icons';

type Held = { kind: 'pocket'; index: number; id: string } | { kind: 'storage'; index: number; id: string } | { kind: 'move'; uid: number; id: string; ox: number; oz: number; orot: number };

export class EditorPanel implements Panel {
  el: HTMLElement;
  modal = true;
  private cx = 1;
  private cz = 1;
  private rot = 0;
  private held: Held | null = null;
  private side = h('div', { class: 'editor-side scroll' });
  private status = h('div', { class: 'editor-status' });
  private previewKey = '';
  private listMode = false;
  private onDown: (e: PointerEvent) => void;

  constructor(private ui: UIManager, private g: Game, private view: InteriorView, private canvas: HTMLCanvasElement) {
    this.el = h('div', { class: 'editor' }, h('div', { class: 'panel editor-panel' }, h('h2', null, 'Decorate', h('span', { class: 'spacer' }), btn('Done', () => ui.pop(this), 'small primary')), this.status, this.side));
    const { w, d } = roomSize(g);
    this.cx = Math.floor(w / 2);
    this.cz = Math.floor(d / 2);
    this.onDown = (e) => this.pointer(e);
    canvas.addEventListener('pointerdown', this.onDown);
    this.render();
    this.sync();
  }

  onClose(): void {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    if (this.held?.kind === 'move') moveFurniture(this.g, this.held.uid, this.held.ox, this.held.oz, this.held.orot);
    this.view.cursor.visible = false;
    this.view.preview.clear();
    rebuildRoom(this.g);
    this.view.invalidate();
  }

  private pointer(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.view.camera);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return;
    const { w, d } = roomSize(this.g);
    const x = Math.floor(hit.x), z = Math.floor(hit.z);
    if (x < 0 || z < 0 || x >= w || z >= d) return;
    this.cx = x;
    this.cz = z;
    this.confirm();
  }

  command(c: Command): boolean {
    const { w, d } = roomSize(this.g);
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
      const f = this.side.querySelector('.focus') as HTMLElement | null;
      this.listMode = false;
      if (f) {
        f.click();
        return true;
      }
    }
    if (c === 'up' || c === 'down' || c === 'left' || c === 'right') this.listMode = false;
    switch (c) {
      case 'up':
        this.cz = Math.max(0, this.cz - 1);
        break;
      case 'down':
        this.cz = Math.min(d - 1, this.cz + 1);
        break;
      case 'left':
        this.cx = Math.max(0, this.cx - 1);
        break;
      case 'right':
        this.cx = Math.min(w - 1, this.cx + 1);
        break;
      case 'confirm':
        this.confirm();
        break;
      case 'rotate':
      case 'toolRing':
        this.rotate();
        break;
      case 'store':
      case 'cancel':
        this.store();
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

  private confirm(): void {
    const g = this.g;
    if (this.held) {
      const ok =
        this.held.kind === 'pocket'
          ? placeFromPockets(g, this.held.index, this.cx, this.cz, this.rot)
          : this.held.kind === 'storage'
            ? placeFromStorage(g, this.held.index, this.cx, this.cz, this.rot)
            : moveFurniture(g, this.held.uid, this.cx, this.cz, this.rot);
      if (ok) {
        this.held = null;
        rebuildRoom(g);
        this.render();
      } else g.emit('sfx', { name: 'error' });
      return;
    }
    const pf = furnitureAt(g, this.cx, this.cz);
    if (pf) {
      this.held = { kind: 'move', uid: pf.uid, id: pf.id, ox: pf.x, oz: pf.z, orot: pf.rot };
      this.rot = pf.rot;
      this.cx = pf.x;
      this.cz = pf.z;
      g.emit('sfx', { name: 'pickup' });
      this.render();
    }
  }

  private rotate(): void {
    if (this.held) {
      this.rot = (this.rot + 1) % 4;
      return;
    }
    const pf = furnitureAt(this.g, this.cx, this.cz);
    if (pf && moveFurniture(this.g, pf.uid, pf.x, pf.z, (pf.rot + 1) % 4)) rebuildRoom(this.g);
  }

  private store(): void {
    if (this.held?.kind === 'move') {
      storeFurniture(this.g, this.held.uid);
      this.held = null;
    } else if (this.held) this.held = null;
    else {
      const pf = furnitureAt(this.g, this.cx, this.cz);
      if (pf) storeFurniture(this.g, pf.uid);
    }
    rebuildRoom(this.g);
    this.render();
  }

  private cancelHeld(): void {
    if (this.held?.kind === 'move') moveFurniture(this.g, this.held.uid, this.held.ox, this.held.oz, this.held.orot);
    this.held = null;
    this.render();
  }

  private sync(): void {
    const g = this.g;
    const v = this.view;
    v.cursor.visible = true;
    const id = this.held?.id;
    const fp = id ? footprint(id, this.rot) : { w: 1, d: 1 };
    v.cursor.position.set(this.cx + fp.w / 2, 0, this.cz + fp.d / 2);
    v.cursor.scale.set(fp.w, 1, fp.d);
    const valid = id ? canPlace(g, id, this.cx, this.cz, this.rot, this.held?.kind === 'move' ? this.held.uid : -1) : true;
    ((v.cursor.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(valid ? 0x8fe39a : 0xf27c7c);
    const key = id ? `${id}|${this.rot}` : '';
    if (key !== this.previewKey) {
      this.previewKey = key;
      v.preview.clear();
      if (id) {
        const obj = furnitureObject(id);
        if (obj) v.preview.add(obj);
      }
    }
    v.preview.visible = !!id;
    v.preview.position.set(this.cx + fp.w / 2, 0.02, this.cz + fp.d / 2);
    v.preview.rotation.y = -this.rot * (Math.PI / 2);
    // hide the original while moving it
    if (this.held?.kind === 'move') {
      const pf = g.state.home.furniture.find((f) => f.uid === (this.held as { uid: number }).uid);
      if (pf) {
        pf.x = -99;
        v.invalidate();
      }
    }
    const under = furnitureAt(g, this.cx, this.cz);
    clear(this.status);
    this.status.append(
      this.held
        ? h('div', null, h('b', null, item(this.held.id).name), ' — ', h('kbd', null, 'E'), ' place  ', h('kbd', null, 'R'), ' rotate  ', h('kbd', null, 'X'), ' store  ', h('kbd', null, 'Esc'), ' cancel')
        : under
          ? h('div', null, h('b', null, item(under.id).name), ' — ', h('kbd', null, 'E'), ' move  ', h('kbd', null, 'R'), ' rotate  ', h('kbd', null, 'X'), ' store')
          : h('div', { class: 'muted' }, 'Arrows / click: move cursor. Q/Z (LB/RB): browse the list below, then E to pick.'),
    );
  }

  private render(): void {
    const g = this.g;
    clear(this.side);
    const pocket = g.state.player.inv.map((s, i) => ({ s, i })).filter(({ s }) => s && (item(s.id).furn || item(s.id).surface));
    const storage = g.state.home.storage.map((s, i) => ({ s, i })).filter(({ s }) => item(s.id).furn || item(s.id).surface);
    const row = (id: string, label: string, onClick: () => void) =>
      h('button', { class: 'craft-row', 'data-nav': '', onclick: onClick }, iconImg(id, 'icon sm'), h('span', { class: 'nm' }, label));
    this.side.append(h('h3', null, 'From pockets'));
    if (!pocket.length) this.side.append(h('div', { class: 'muted tiny' }, 'No furniture in your pockets.'));
    for (const { s, i } of pocket) {
      const def = item(s!.id);
      this.side.append(
        row(s!.id, def.name, () => {
          if (def.surface) {
            applySurface(g, i);
            rebuildRoom(g);
            this.render();
            return;
          }
          this.held = { kind: 'pocket', index: i, id: s!.id };
          this.rot = 0;
          this.render();
          this.sync();
        }),
      );
    }
    this.side.append(h('h3', null, 'From storage'));
    if (!storage.length) this.side.append(h('div', { class: 'muted tiny' }, 'Storage has no furniture.'));
    for (const { s, i } of storage) {
      const def = item(s.id);
      this.side.append(
        row(s.id, `${def.name}${s.qty > 1 ? ` ×${s.qty}` : ''}`, () => {
          if (def.surface) {
            applySurfaceFromStorage(g, i);
            rebuildRoom(g);
            this.render();
            return;
          }
          this.held = { kind: 'storage', index: i, id: s.id };
          this.rot = 0;
          this.render();
          this.sync();
        }),
      );
    }
    this.sync();
  }
}
