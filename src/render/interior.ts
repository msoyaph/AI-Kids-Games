// Interior scenes: the player's home (furniture grid) and the three-wing museum.
import * as THREE from 'three';
import { BUG_BY_ID, FISH_BY_ID, FOSSIL_BY_ID, item } from '../data/registry';
import type { Game } from '../sim/game';
import { footprint } from '../sim/housing';
import { interiorRT, MUSEUM_WING_W, type Room } from '../sim/interior';
import { mixHex } from '../core/math';
import { vcolMat, curved } from './curve';
import { box, merge, part, sphere } from './models/geo';
import { furnitureGeo } from './models/furniture';
import { buildBug, buildFish, buildFossil, flapWings, type BugModel } from './models/creatures';
import { buildCharacter, animateRig, type Rig } from './models/character';

const WALL_H = 2.6;
const mat = vcolMat();
const glowMat = curved(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xffd27a, emissiveIntensity: 0.9 }));
const glassMat = curved(new THREE.MeshLambertMaterial({ color: 0xcdeff8, transparent: true, opacity: 0.28, depthWrite: false }));

function patternColor(pattern: string, c: number, c2: number, x: number, z: number): number {
  switch (pattern) {
    case 'stripe':
      return x % 2 === 0 ? c : c2;
    case 'check':
    case 'tiles':
      return (x + z) % 2 === 0 ? c : c2;
    case 'planks':
      return z % 2 === 0 ? mixHex(c, c2, ((x * 7 + z * 3) % 5) / 10) : mixHex(c, c2, 0.35 + ((x * 3) % 4) / 12);
    case 'dots':
      return (x % 2 === 0 && z % 2 === 0) ? c2 : c;
    case 'stars':
      return (x * 3 + z * 5) % 7 === 0 ? c2 : c;
    case 'waves':
      return Math.sin(x * 1.2 + z * 0.6) > 0.3 ? c2 : c;
    default:
      return mixHex(c, c2, ((x * 13 + z * 7) % 5) / 25);
  }
}

function surface(id: string, fallback: [number, number, string]): [number, number, string] {
  const s = item(id).surface;
  return s ? [s.c, s.c2, s.pattern] : fallback;
}

function textPlaque(text: string, w = 2.4, h = 0.6, bg = '#fff6e6', fg = '#5b4a68'): THREE.Mesh {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = Math.round((512 * h) / w);
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(4, 4, cv.width - 8, cv.height - 8, 24);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = `bold ${Math.round(cv.height * 0.5)}px ui-rounded, "Arial Rounded MT Bold", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cv.width / 2, cv.height / 2 + 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
}

export class InteriorView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(36, 1, 0.3, 200);
  private room = new THREE.Group();
  private bugs: { m: BugModel; base: THREE.Vector3 }[] = [];
  private fish: { g: THREE.Group; base: THREE.Vector3; t: number }[] = [];
  private npc: Rig | null = null;
  private key = '';
  private camX = 0;
  private time = 0;
  cursor: THREE.Group;
  preview: THREE.Group;

  constructor() {
    this.scene.background = new THREE.Color(0x2b2438);
    this.scene.add(new THREE.HemisphereLight(0xfff4e0, 0x8a7a8a, 2.0));
    const sun = new THREE.DirectionalLight(0xfff1dc, 1.6);
    sun.position.set(4, 10, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera;
    sc.left = -24;
    sc.right = 24;
    sc.top = 14;
    sc.bottom = -14;
    this.scene.add(sun, sun.target);
    this.scene.add(this.room);
    // editor cursor + placement preview
    this.cursor = new THREE.Group();
    const cur = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 1), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.45, depthWrite: false }));
    cur.position.y = 0.03;
    this.cursor.add(cur);
    this.cursor.visible = false;
    this.preview = new THREE.Group();
    this.scene.add(this.cursor, this.preview);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Rebuild when the room/furniture/donations change. */
  sync(g: Game): void {
    const rt = interiorRT(g);
    if (!rt) return;
    const h = g.state.home;
    const key =
      rt.room.kind === 'home'
        ? `home|${h.level}|${h.wallpaper}|${h.flooring}|${h.furniture.map((f) => `${f.uid}:${f.x},${f.z},${f.rot}`).join(';')}`
        : `museum|${g.state.museum.donated.length}`;
    if (key === this.key) return;
    this.key = key;
    this.build(g, rt.room);
  }

  invalidate(): void {
    this.key = '';
  }

  private build(g: Game, room: Room): void {
    this.room.clear();
    this.bugs = [];
    this.fish = [];
    this.npc = null;
    const { w, d } = room;
    const isHome = room.kind === 'home';
    const [fc, fc2, fp] = isHome ? surface(g.state.home.flooring, [0xb9d99a, 0xa9cf8a, 'plain']) : [0xe9dcc6, 0xdccdb2, 'tiles'];
    const [wc, wc2, wp] = isHome ? surface(g.state.home.wallpaper, [0xf3e3c3, 0xe9d4ae, 'plain']) : [0xf2ece0, 0xe4dccb, 'stripe'];
    const P: THREE.BufferGeometry[] = [];
    for (let z = 0; z < d; z++)
      for (let x = 0; x < w; x++) P.push(part(box(1, 0.1, 1), patternColor(fp, fc, fc2, x, z), { pos: [x + 0.5, -0.05, z + 0.5] }));
    // back wall + side walls (wallpaper)
    for (let x = 0; x < w; x++) P.push(part(box(1, WALL_H, 0.12), patternColor(wp, wc, wc2, x, 0), { pos: [x + 0.5, WALL_H / 2, -0.06] }));
    for (let z = 0; z < d; z++) {
      P.push(part(box(0.12, WALL_H, 1), patternColor(wp, wc, wc2, z, 1), { pos: [-0.06, WALL_H / 2, z + 0.5] }));
      P.push(part(box(0.12, WALL_H, 1), patternColor(wp, wc, wc2, z, 1), { pos: [w + 0.06, WALL_H / 2, z + 0.5] }));
    }
    // baseboard + door mat
    P.push(part(box(w, 0.14, 0.14), mixHex(wc, 0x5b4a68, 0.35), { pos: [w / 2, 0.07, 0.02] }));
    P.push(part(box(1.0, 0.03, 0.6), 0xc98d62, { pos: [room.door.x + 0.5, 0.015, d - 0.3] }));
    if (!isHome) {
      for (let k = 1; k < 3; k++)
        for (let z = 0; z < 8; z++) P.push(part(box(0.3, WALL_H * 0.8, 1), 0xe0d6c4, { pos: [k * MUSEUM_WING_W + 0.5, WALL_H * 0.4, z + 0.5] }));
    }
    const shell = new THREE.Mesh(merge(P), mat);
    shell.receiveShadow = true;
    this.room.add(shell);
    // a window on the back wall
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.05), glowMat);
    win.position.set(w * 0.62, 1.55, 0.02);
    this.room.add(win);

    if (isHome) this.buildHome(g, room);
    else this.buildMuseum(g, room);
  }

  private buildHome(g: Game, room: Room): void {
    // fixtures: bed + storage chest
    for (const f of room.fixtures) {
      const P: THREE.BufferGeometry[] = [];
      if (f.id === 'bed') {
        P.push(part(box(f.w - 0.1, 0.25, f.d - 0.1), 0xd9ad7c, { pos: [f.x + f.w / 2, 0.13, f.z + f.d / 2] }));
        P.push(part(box(f.w - 0.2, 0.12, f.d * 0.65), 0x9fd3f0, { pos: [f.x + f.w / 2, 0.3, f.z + f.d * 0.6] }));
        P.push(part(box(0.7, 0.12, 0.35), 0xffffff, { pos: [f.x + f.w / 2, 0.32, f.z + 0.25] }));
      } else {
        P.push(part(box(0.8, 0.55, 0.6), 0xb98a5e, { pos: [f.x + 0.5, 0.28, f.z + 0.4] }), part(box(0.84, 0.1, 0.64), 0x9b6a4a, { pos: [f.x + 0.5, 0.58, f.z + 0.4] }), part(box(0.12, 0.12, 0.05), 0xf5d36b, { pos: [f.x + 0.5, 0.45, f.z + 0.72] }));
      }
      const m = new THREE.Mesh(merge(P), mat);
      m.castShadow = true;
      this.room.add(m);
    }
    for (const pf of g.state.home.furniture) {
      const obj = furnitureObject(pf.id);
      if (!obj) continue;
      const fp = footprint(pf.id, pf.rot);
      obj.position.set(pf.x + fp.w / 2, 0, pf.z + fp.d / 2);
      obj.rotation.y = -pf.rot * (Math.PI / 2);
      this.room.add(obj);
    }
  }

  private buildMuseum(_g: Game, room: Room): void {
    const titles = ['Aquarium', 'Insectarium', 'Fossil Hall'];
    titles.forEach((t, k) => {
      const plaque = textPlaque(t);
      plaque.position.set(k * MUSEUM_WING_W + MUSEUM_WING_W / 2, 2.15, 0.02);
      this.room.add(plaque);
    });
    for (const ds of room.displays) {
      const base = new THREE.Vector3(ds.x + 0.5, 0, ds.z + 0.5);
      const P: THREE.BufferGeometry[] = [part(box(0.86, 0.55, 0.86), ds.filled ? 0xd8cfe8 : 0xe6dfd2, { pos: [base.x, 0.27, base.z] })];
      const ped = new THREE.Mesh(merge(P), mat);
      ped.castShadow = true;
      this.room.add(ped);
      if (!ds.filled) continue;
      if (ds.wing === 'fish') {
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.7, 0.84), glassMat);
        glass.position.set(base.x, 0.9, base.z);
        this.room.add(glass);
        const water = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), curved(new THREE.MeshLambertMaterial({ color: 0x8fd3ea, transparent: true, opacity: 0.3, depthWrite: false })));
        water.position.set(base.x, 0.86, base.z);
        this.room.add(water);
        const def = FISH_BY_ID[ds.item];
        if (def) {
          const f = buildFish(def);
          f.scale.multiplyScalar(0.55);
          f.position.set(base.x, 0.9, base.z);
          this.room.add(f);
          this.fish.push({ g: f, base: new THREE.Vector3(base.x, 0.9, base.z), t: ds.x * 1.7 });
        }
      } else if (ds.wing === 'bugs') {
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), glassMat);
        dome.position.set(base.x, 0.55, base.z);
        this.room.add(dome);
        const leaf = new THREE.Mesh(merge([part(sphere(0.18, 6, 4), 0x8fd18a, { pos: [base.x - 0.1, 0.6, base.z - 0.05], scale: [1, 0.4, 1] })]), mat);
        this.room.add(leaf);
        const def = BUG_BY_ID[ds.item];
        if (def) {
          const b = buildBug(def);
          b.group.scale.setScalar(1.4);
          b.group.position.set(base.x + 0.05, 0.68, base.z);
          this.room.add(b.group);
          this.bugs.push({ m: b, base: b.group.position.clone() });
        }
      } else {
        const def = FOSSIL_BY_ID[ds.item];
        if (def) {
          const fo = buildFossil(def);
          fo.scale.setScalar(0.85);
          fo.position.set(base.x, 0.55, base.z);
          fo.rotation.y = 0.3;
          this.room.add(fo);
        }
      }
    }
    // curator desk + Professor Vesper
    const desk = room.fixtures.find((f) => f.id === 'desk');
    if (desk) {
      const m = new THREE.Mesh(
        merge([part(box(desk.w - 0.1, 0.8, 0.8), 0x9b7aa8, { pos: [desk.x + desk.w / 2, 0.4, desk.z + 0.5] }), part(box(desk.w, 0.08, 0.9), 0xd9c3e8, { pos: [desk.x + desk.w / 2, 0.82, desk.z + 0.5] })]),
        mat,
      );
      this.room.add(m);
      this.npc = buildCharacter({ species: 'bat', skin: 0x8a7a9a, accent: 0xf3d6c8, outfit: 0xb9a6e0, eyes: 1 });
      this.npc.root.position.set(desk.x + desk.w / 2, 0, desk.z - 0.25);
      this.room.add(this.npc.root);
    }
  }

  frame(dt: number, g: Game, playerRig: Rig, renderer: THREE.WebGLRenderer): void {
    this.time += dt;
    const rt = interiorRT(g);
    if (!rt) return;
    this.sync(g);
    if (playerRig.root.parent !== this.scene) this.scene.add(playerRig.root);
    playerRig.root.position.set(rt.x, 0, rt.z);
    playerRig.root.rotation.y = rt.facing;
    const room = rt.room;
    const a = g.action;
    animateRig(playerRig, dt, { speed: rt.speed, action: a ? Math.min(1, a.t / a.dur) : -1, actionKind: a ? a.kind : '' });
    if (this.npc) animateRig(this.npc, dt, { speed: 0, action: -1, talking: false });
    for (const f of this.fish) {
      f.t += dt;
      f.g.position.set(f.base.x + Math.sin(f.t * 0.8) * 0.15, f.base.y + Math.sin(f.t * 1.3) * 0.05, f.base.z + Math.cos(f.t * 0.8) * 0.12);
      f.g.rotation.y = f.t * 0.8 + Math.PI / 2;
    }
    for (const b of this.bugs) flapWings(b.m, this.time, 5);
    // camera: fixed for small rooms, follows along the museum
    const wide = room.w > 12;
    const targetX = wide ? Math.max(5, Math.min(room.w - 5, rt.x)) : room.w / 2;
    this.camX += (targetX - this.camX) * Math.min(1, dt * 6);
    if (!wide || Math.abs(this.camX - targetX) > 20) this.camX = targetX;
    const span = Math.max(room.w, room.d * 1.3);
    const dist = wide ? 11 : 4 + span * 0.95;
    this.camera.position.set(this.camX, dist * 0.82, room.d + dist * 0.62);
    this.camera.lookAt(this.camX, 0, room.d * 0.48);
    renderer.render(this.scene, this.camera);
  }
}

/** Furniture as a renderable group (also used for outdoor decorations and thumbnails). */
export function furnitureObject(id: string): THREE.Group | null {
  const def = item(id);
  if (!def.furn) return null;
  const [solid, glow] = furnitureGeo(id, def.furn);
  const g = new THREE.Group();
  const m = new THREE.Mesh(solid, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  if (glow) g.add(new THREE.Mesh(glow, glowMat));
  return g;
}

