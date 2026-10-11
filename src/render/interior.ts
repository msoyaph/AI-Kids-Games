// Interior scenes: the player's home (furniture grid) and the three-wing museum.
import * as THREE from 'three';
import { BUG_BY_ID, FISH_BY_ID, FOSSIL_BY_ID, item } from '../data/registry';
import type { Game } from '../sim/game';
import { footprint, homeData, slotTile, surfaceTop } from '../sim/housing';
import { interiorRT, isHomeRoom, MUSEUM_WING_W, roomVillager, type Room } from '../sim/interior';
import { agents } from '../sim/agents';
import { isBirthday } from '../sim/happenings';
import { NPC_BY_ID, VILLAGER_BY_ID } from '../data/villagers';
import { approachAngle } from '../core/math';
import { mixHex } from '../core/math';
import { vcolMat, curved } from './curve';
import { box, cyl, merge, part, sphere } from './models/geo';
import { toolMesh } from './models/tools';
import { furnitureGeo } from './models/furniture';
import { buildBug, buildFish, buildFossil, flapWings, type BugModel } from './models/creatures';
import { buildCharacter, animateRig, type Rig } from './models/character';

const WALL_H = 2.6;
const mat = vcolMat();
const glowMat = curved(new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xffd27a, emissiveIntensity: 0.9 }));
/** window panes: sky blue by day, warm sunset, deep blue at night (tinted every frame) */
const paneMat = curved(new THREE.MeshLambertMaterial({ color: 0xbfe6f5, emissive: 0x9fd3ee, emissiveIntensity: 0.6 }));
const PANE_DAY = new THREE.Color(0x9fd3ee);
const PANE_DUSK = new THREE.Color(0xf6b38a);
const PANE_NIGHT = new THREE.Color(0x26346b);
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
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.userData.ownMaterial = true;
  return m;
}

/**
 * Free GPU memory used by a room's contents (geometry buffers, canvas textures and one-off
 * materials). Shared materials stay; three.js re-uploads any geometry that is drawn again later.
 */
function disposeTree(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry?.dispose();
    if (m.userData.ownMaterial) {
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
  });
}

export class InteriorView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(36, 1, 0.3, 200);
  private room = new THREE.Group();
  private bugs: { m: BugModel; base: THREE.Vector3 }[] = [];
  private fish: { g: THREE.Group; base: THREE.Vector3; t: number }[] = [];
  private people: { id: string; rig: Rig; x: number; z: number; facing: number; bubble: THREE.Group | null }[] = [];
  private key = '';
  /** uids hidden while the editor carries them */
  hidden = new Set<number>();
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

  setShadows(on: boolean): void {
    this.scene.traverse((o) => {
      if ((o as THREE.DirectionalLight).isDirectionalLight) (o as THREE.DirectionalLight).castShadow = on;
    });
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
    const room = rt.room;
    const kind = room.kind;
    const hd = isHomeRoom(kind) ? homeData(g, kind) : h;
    const key =
      isHomeRoom(kind)
        ? `${kind}|${h.level}|${hd.wallpaper}|${hd.flooring}|${hd.furniture.map((f) => `${f.uid}:${f.x},${f.z},${f.rot},${f.on ?? ''}.${f.slot ?? ''}`).join(';')}|${(hd.walls ?? []).map((w) => `${w.uid}:${w.wall},${w.pos}`).join(';')}|${[...this.hidden].join(',')}`
        : kind === 'museum'
          ? `museum|${g.state.museum.donated.length}`
          : `${kind}|${g.state.clock.day}|${roomVillager(kind) && isBirthday(g, roomVillager(kind)!) ? 'bday' : ''}|${room.shelves.map((sh) => `${sh.stock?.id ?? ''}${sh.sold ? '!' : ''}`).join(',')}|${room.decor.map((d) => d.id).join(',')}`;
    if (key === this.key) return;
    this.key = key;
    this.build(g, rt.room);
  }

  invalidate(): void {
    this.key = '';
  }

  /** Leaving the room: drop its GPU resources now rather than on the next visit. */
  release(): void {
    disposeTree(this.room);
    this.room.clear();
    this.people = [];
    this.bugs = [];
    this.fish = [];
    this.key = '';
  }

  private build(g: Game, room: Room): void {
    disposeTree(this.room);
    this.room.clear();
    this.bugs = [];
    this.fish = [];
    this.people = [];
    const { w, d } = room;
    const isHome = isHomeRoom(room.kind);
    const hd = homeData(g, room.kind);
    const isMuseum = room.kind === 'museum';
    const [fc, fc2, fp] = isHome
      ? surface(hd.flooring, [0xb9d99a, 0xa9cf8a, 'plain'])
      : room.floor
        ? surface(room.floor, [0xe9dcc6, 0xdccdb2, 'tiles'])
        : [0xe9dcc6, 0xdccdb2, 'tiles'];
    const [wc, wc2, wp] = isHome
      ? surface(hd.wallpaper, [0xf3e3c3, 0xe9d4ae, 'plain'])
      : room.wall
        ? surface(room.wall, [0xf2ece0, 0xe4dccb, 'stripe'])
        : [0xf2ece0, 0xe4dccb, 'stripe'];
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
    if (isMuseum) {
      for (let k = 1; k < 3; k++)
        for (let z = 0; z < 8; z++) P.push(part(box(0.3, WALL_H * 0.8, 1), 0xe0d6c4, { pos: [k * MUSEUM_WING_W + 0.5, WALL_H * 0.4, z + 0.5] }));
    }
    const shell = new THREE.Mesh(merge(P), mat);
    shell.receiveShadow = true;
    this.room.add(shell);
    // a window on the back wall (unless a wall decoration hangs there; none underground)
    const winX = w * 0.62;
    const covered = room.kind === 'basement' || (isHome && (hd.walls ?? []).some((wi) => wi.wall === 0 && winX + 0.6 > wi.pos && winX - 0.6 < wi.pos + (item(wi.id).furn?.w ?? 1)));
    if (!covered) {
      const y = 1.55;
      const trim = mixHex(wc, 0x5b4a68, 0.35);
      const F = [
        part(box(1.36, 0.08, 0.08), trim, { pos: [winX, y + 0.44, 0.04] }),
        part(box(0.08, 0.88, 0.08), trim, { pos: [winX - 0.64, y, 0.04] }),
        part(box(0.08, 0.88, 0.08), trim, { pos: [winX + 0.64, y, 0.04] }),
        part(box(0.05, 0.8, 0.06), trim, { pos: [winX, y, 0.05] }),
        part(box(1.2, 0.05, 0.06), trim, { pos: [winX, y, 0.05] }),
        part(box(1.5, 0.07, 0.18), mixHex(trim, 0xffffff, 0.35), { pos: [winX, y - 0.44, 0.09] }),
      ];
      this.room.add(new THREE.Mesh(merge(F), mat));
      const pane = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.03), paneMat);
      pane.position.set(winX, y, 0.015);
      this.room.add(pane);
    }

    if (isHome) this.buildHome(g, room);
    else if (isMuseum) this.buildMuseum(g, room);
    else this.buildPlace(g, room);
    this.buildPeople(room);
  }

  /** Shop, Lantern Hall and villager homes: layout furniture, fixtures, shelves, signs. */
  private buildPlace(_g: Game, room: Room): void {
    for (const dc of room.decor) {
      const obj = furnitureObject(dc.id);
      if (!obj) continue;
      if (dc.gift) {
        // gifts sit on their own 1x1 spot, scaled to fit
        const f = item(dc.id).furn!;
        obj.scale.setScalar(Math.min(1, 0.95 / Math.max(f.w, f.d)));
        obj.position.set(dc.x + 0.5, 0, dc.z + 0.5);
        obj.rotation.y = 0.35;
      } else {
        const fp = footprint(dc.id, dc.r ?? 0);
        obj.position.set(dc.x + fp.w / 2, 0, dc.z + fp.d / 2);
        obj.rotation.y = -(dc.r ?? 0) * (Math.PI / 2);
      }
      this.room.add(obj);
    }
    const P: THREE.BufferGeometry[] = [];
    const G: THREE.BufferGeometry[] = [];
    for (const f of room.fixtures) {
      const cx = f.x + f.w / 2, cz = f.z + f.d / 2;
      switch (f.id) {
        case 'desk':
          P.push(part(box(f.w - 0.1, 0.78, 0.8), 0x8fc9c2, { pos: [cx, 0.39, cz] }), part(box(f.w + 0.05, 0.08, 0.92), 0xf6e7c8, { pos: [cx, 0.82, cz] }));
          P.push(part(box(0.3, 0.04, 0.22), 0xffffff, { pos: [cx - 0.35, 0.87, cz + 0.1], rot: [0, 0.3, 0] }), part(cyl(0.06, 0.07, 0.12, 8), 0xe07a4a, { pos: [cx + 0.45, 0.92, cz] }));
          G.push(part(sphere(0.12, 8, 6), 0xffd27a, { pos: [cx + 0.1, 0.98, cz - 0.1] }));
          break;
        case 'counter':
          P.push(part(box(f.w - 0.05, 0.9, 0.9), 0xc98d62, { pos: [cx, 0.45, cz] }), part(box(f.w + 0.1, 0.08, 1.0), 0xf3dcb5, { pos: [cx, 0.92, cz] }));
          P.push(part(box(0.5, 0.28, 0.36), 0x6f8f9f, { pos: [cx + 1.1, 1.1, cz] }), part(box(0.44, 0.06, 0.3), 0xf6d36b, { pos: [cx + 1.1, 1.27, cz] }));
          P.push(part(box(0.7, 0.04, 0.45), 0xffffff, { pos: [cx - 0.9, 0.97, cz] }));
          break;
        case 'board':
          P.push(part(box(0.16, 1.3, f.d - 0.1), 0xa47a52, { pos: [f.x + 0.12, 1.15, cz] }), part(box(0.06, 1.1, f.d - 0.3), 0xe8cfa4, { pos: [f.x + 0.22, 1.15, cz] }));
          for (let k = 0; k < 4; k++) P.push(part(box(0.03, 0.28, 0.3), [0xfff6e6, 0xffe3d1, 0xd4f2e8, 0xfff8d6][k]!, { pos: [f.x + 0.27, 0.9 + (k % 2) * 0.42, f.z + 0.45 + Math.floor(k / 2) * 0.9] }));
          break;
        case 'kiosk':
          P.push(part(box(0.7, 1.1, 0.6), 0xb9a6e0, { pos: [cx, 0.55, cz] }), part(box(0.6, 0.4, 0.06), 0x5b4a68, { pos: [cx - 0.33, 1.0, cz], rot: [0, Math.PI / 2, 0] }));
          G.push(part(sphere(0.16, 8, 6), 0xbfe8ff, { pos: [cx, 1.3, cz] }));
          break;
      }
    }
    // shop: shelves + today's stock
    for (const sh of room.shelves) {
      const cx = sh.x + 0.5, cz = sh.z + 0.5;
      let top = 0.64;
      if (sh.kind === 'table') P.push(part(box(0.86, 0.6, 0.86), 0xe8cfa4, { pos: [cx, 0.3, cz] }), part(box(0.92, 0.05, 0.92), 0xc9a477, { pos: [cx, 0.62, cz] }));
      else {
        // an open shelf unit with its back against the nearest wall
        const yaw = sh.x === 0 ? Math.PI / 2 : sh.x === room.w - 1 ? -Math.PI / 2 : 0;
        const at = (lx: number, y: number, lz: number): [number, number, number] => [cx + lx * Math.cos(yaw) + lz * Math.sin(yaw), y, cz - lx * Math.sin(yaw) + lz * Math.cos(yaw)];
        const wood = 0xc9a477, board = 0xf0dcb8;
        P.push(part(box(0.92, 1.4, 0.06), wood, { pos: at(0, 0.7, -0.36), rot: [0, yaw, 0] }));
        P.push(part(box(0.06, 1.4, 0.5), wood, { pos: at(-0.43, 0.7, -0.12), rot: [0, yaw, 0] }), part(box(0.06, 1.4, 0.5), wood, { pos: at(0.43, 0.7, -0.12), rot: [0, yaw, 0] }));
        for (const y of [0.08, 0.6, 1.38]) P.push(part(box(0.86, 0.05, 0.5), board, { pos: at(0, y, -0.12), rot: [0, yaw, 0] }));
        top = 0.63;
      }
      if (!sh.stock || sh.sold) continue;
      const m = this.stockModel(sh.stock.id, cx, top, cz);
      m.position.set(sh.kind === 'table' ? cx : cx + (sh.x === 0 ? -0.1 : sh.x === room.w - 1 ? 0.1 : 0), top, sh.kind === 'table' ? cz : cz - (sh.z === 0 ? 0.1 : 0));
      this.room.add(m);
    }
    if (P.length) {
      const m = new THREE.Mesh(merge(P), mat);
      m.castShadow = true;
      m.receiveShadow = true;
      this.room.add(m);
    }
    if (G.length) this.room.add(new THREE.Mesh(merge(G), glowMat));
    // a sign over the back wall
    const vid = roomVillager(room.kind);
    if (vid && isBirthday(_g, vid)) {
      // party balloons for the birthday
      const B: THREE.BufferGeometry[] = [];
      [0xff7f9f, 0xffd966, 0x7fb2ff, 0x9be38a].forEach((c, k) => {
        const x = 1.2 + k * 1.6, z = 0.6 + (k % 2) * 0.3;
        B.push(part(sphere(0.22, 8, 6), c, { pos: [x, 2.0 + (k % 2) * 0.2, z], scale: [1, 1.15, 1] }), part(cyl(0.006, 0.006, 1.2, 3), 0xffffff, { pos: [x, 1.3 + (k % 2) * 0.2, z] }));
      });
      this.room.add(new THREE.Mesh(merge(B), mat));
    }
    const title = room.kind === 'shop' ? 'The Curled Leaf' : room.kind === 'hall' ? 'Lantern Hall' : vid ? `${VILLAGER_BY_ID[vid]?.name ?? ''}'s Home` : '';
    if (title) {
      const plaque = textPlaque(title, 2.6, 0.55);
      plaque.position.set(room.w / 2, 2.25, 0.03);
      this.room.add(plaque);
    }
  }

  /** A small model of a stocked item on a shelf. */
  private stockModel(id: string, x: number, y: number, z: number): THREE.Object3D {
    const def = item(id);
    if (def.furn) {
      const obj = furnitureObject(id)!;
      obj.scale.setScalar(0.42 / Math.max(def.furn.w, def.furn.d));
      obj.position.set(x, y, z);
      obj.rotation.y = 0.4;
      return obj;
    }
    if (def.cat === 'clothing') {
      // a neatly folded piece
      const geo = merge([part(box(0.42, 0.08, 0.3), def.icon.c, { pos: [0, 0.04, 0] }), part(box(0.42, 0.08, 0.3), def.icon.c, { pos: [0.02, 0.12, 0.01], rot: [0, 0.1, 0] }), part(box(0.2, 0.02, 0.12), def.icon.c2 ?? def.icon.c, { pos: [0.02, 0.17, 0.01] })]);
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      m.position.set(x, y, z);
      return m;
    }
    if (def.tool) {
      const t = toolMesh(def.tool.kind, def.tool.sturdy);
      const g = new THREE.Group();
      t.rotation.set(0, 0, -1.25);
      t.position.set(-0.3, 0.06, 0);
      t.scale.setScalar(0.7);
      g.add(t);
      g.position.set(x, y, z);
      return g;
    }
    const c = def.icon.c, c2 = def.icon.c2 ?? def.icon.c;
    let geo: THREE.BufferGeometry;
    if (def.cat === 'wallpaper' || def.cat === 'flooring') {
      geo = merge([part(cyl(0.11, 0.11, 0.62, 10), c, { rot: [0, 0, Math.PI / 2], pos: [0, 0.12, 0] }), part(cyl(0.115, 0.115, 0.12, 10), c2, { rot: [0, 0, Math.PI / 2], pos: [0.2, 0.12, 0] })]);
    } else if (def.cat === 'fruit') {
      geo = merge([part(box(0.5, 0.12, 0.4), 0xa47a52, { pos: [0, 0.06, 0] }), ...[[-0.12, 0], [0.12, 0], [0, 0.1]].map(([ox, oz]) => part(sphere(0.1, 8, 6), c, { pos: [ox!, 0.2, oz!] }))]);
    } else if (def.cat === 'sapling') {
      geo = merge([part(cyl(0.12, 0.1, 0.18, 8), 0xc98d62, { pos: [0, 0.09, 0] }), part(cyl(0.02, 0.02, 0.3, 4), 0x8a6a4a, { pos: [0, 0.3, 0] }), part(sphere(0.14, 6, 5), 0x8fd18a, { pos: [0, 0.48, 0] })]);
    } else {
      // seed packets
      geo = merge([part(box(0.22, 0.3, 0.04), 0xfff6e6, { pos: [-0.12, 0.15, 0], rot: [0, 0.2, 0] }), part(box(0.16, 0.12, 0.05), c, { pos: [-0.12, 0.18, 0.01], rot: [0, 0.2, 0] }), part(box(0.22, 0.3, 0.04), 0xfff6e6, { pos: [0.14, 0.15, 0.05], rot: [0, -0.2, 0] }), part(box(0.16, 0.12, 0.05), c2, { pos: [0.14, 0.18, 0.06], rot: [0, -0.2, 0] })]);
    }
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.position.set(x, y, z);
    return m;
  }

  /** Characters standing in the room. */
  private buildPeople(room: Room): void {
    for (const p of room.people) {
      const look = VILLAGER_BY_ID[p.id]?.look ?? NPC_BY_ID[p.id]?.look;
      if (!look) continue;
      const rig = buildCharacter({ species: look.species, skin: look.fur, accent: look.accent, outfit: look.outfit, eyes: look.eyes, blush: look.blush, scale: VILLAGER_BY_ID[p.id] ? 1 : 1.08 });
      rig.root.position.set(p.x, 0, p.z);
      rig.root.rotation.y = p.facing;
      this.room.add(rig.root);
      this.people.push({ id: p.id, rig, x: p.x, z: p.z, facing: p.facing, bubble: null });
    }
  }

  private buildHome(g: Game, room: Room): void {
    // fixtures: bed + storage chest
    for (const f of room.fixtures) {
      const P: THREE.BufferGeometry[] = [];
      if (f.id === 'bed') {
        P.push(part(box(f.w - 0.1, 0.25, f.d - 0.1), 0xd9ad7c, { pos: [f.x + f.w / 2, 0.13, f.z + f.d / 2] }));
        P.push(part(box(f.w - 0.2, 0.12, f.d * 0.65), 0x9fd3f0, { pos: [f.x + f.w / 2, 0.3, f.z + f.d * 0.6] }));
        P.push(part(box(0.7, 0.12, 0.35), 0xffffff, { pos: [f.x + f.w / 2, 0.32, f.z + 0.25] }));
      } else if (f.id === 'stairsDown') {
        // a railed opening with steps going down
        P.push(part(box(0.9, 0.04, 0.9), 0x5b4a3e, { pos: [f.x + 0.5, 0.01, f.z + 0.5] }));
        for (let k = 0; k < 3; k++) P.push(part(box(0.8, 0.05, 0.22), 0xc9945f, { pos: [f.x + 0.5, 0.02 - k * 0.04, f.z + 0.2 + k * 0.25] }));
        for (const sx of [0.08, 0.92]) P.push(part(box(0.05, 0.6, 0.05), 0x9b6a4a, { pos: [f.x + sx, 0.3, f.z + 0.1] }), part(box(0.05, 0.05, 0.9), 0x9b6a4a, { pos: [f.x + sx, 0.6, f.z + 0.5] }));
      } else if (f.id === 'stairsUp') {
        // steps rising to a hatch in the ceiling
        for (let k = 0; k < 6; k++) P.push(part(box(f.w - 0.2, 0.2, 0.9), 0xc9945f, { pos: [f.x + 0.3 + k * 0.28, 0.1 + k * 0.2, f.z + 0.45] }));
        P.push(part(box(0.06, 1.4, 0.06), 0x9b6a4a, { pos: [f.x + 0.1, 0.7, f.z + 0.9] }));
      } else {
        P.push(part(box(0.8, 0.55, 0.6), 0xb98a5e, { pos: [f.x + 0.5, 0.28, f.z + 0.4] }), part(box(0.84, 0.1, 0.64), 0x9b6a4a, { pos: [f.x + 0.5, 0.58, f.z + 0.4] }), part(box(0.12, 0.12, 0.05), 0xf5d36b, { pos: [f.x + 0.5, 0.45, f.z + 0.72] }));
      }
      const m = new THREE.Mesh(merge(P), mat);
      m.castShadow = true;
      this.room.add(m);
    }
    const hd = homeData(g, room.kind);
    const byUid = new Map(hd.furniture.map((f) => [f.uid, f]));
    for (const pf of hd.furniture) {
      if (this.hidden.has(pf.uid) || (pf.on !== undefined && this.hidden.has(pf.on))) continue;
      const obj = furnitureObject(pf.id);
      if (!obj) continue;
      const parent = pf.on !== undefined ? byUid.get(pf.on) : undefined;
      const top = parent ? surfaceTop(parent.id) : null;
      if (parent && top) {
        // small piece sitting on a table / desk / shelf
        const t = slotTile(parent, pf.slot ?? 0);
        const th = -parent.rot * (Math.PI / 2);
        // the top's back offset turns with the parent
        obj.position.set(t.x + 0.5 + Math.sin(th) * top.z, top.y, t.z + 0.5 + Math.cos(th) * top.z);
        obj.rotation.y = th;
        obj.scale.setScalar(0.55);
      } else {
        const fp = footprint(pf.id, pf.rot);
        obj.position.set(pf.x + fp.w / 2, 0, pf.z + fp.d / 2);
        obj.rotation.y = -pf.rot * (Math.PI / 2);
      }
      this.room.add(obj);
    }
    for (const wi of hd.walls ?? []) {
      if (this.hidden.has(wi.uid)) continue;
      const obj = furnitureObject(wi.id);
      if (!obj) continue;
      this.placeOnWall(obj, room, wi.wall, wi.pos, item(wi.id).furn?.w ?? 1);
      this.room.add(obj);
    }
  }

  /** Hang a wall piece: wall 0 = back, 1 = left, 2 = right; pos = first tile along that wall. */
  placeOnWall(obj: THREE.Object3D, room: { w: number; d: number }, wall: number, pos: number, width: number): void {
    const mid = pos + width / 2;
    if (wall === 0) {
      obj.position.set(mid, 0, 0.5);
      obj.rotation.y = 0;
    } else if (wall === 1) {
      obj.position.set(0.5, 0, mid);
      obj.rotation.y = Math.PI / 2;
    } else {
      obj.position.set(room.w - 0.5, 0, mid);
      obj.rotation.y = -Math.PI / 2;
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
    }
  }

  frame(dt: number, g: Game, playerRig: Rig, renderer: THREE.WebGLRenderer): void {
    this.time += dt;
    const rt = interiorRT(g);
    if (!rt) return;
    this.sync(g);
    // the sky through the window follows the time of day
    const hr = g.state.clock.minute / 60;
    const dusk = Math.max(0, 1 - Math.abs(hr - 18.5) / 1.5) + Math.max(0, 1 - Math.abs(hr - 6) / 1);
    const night = hr >= 19.5 || hr < 5 ? 1 : 0;
    paneMat.emissive.copy(PANE_DAY).lerp(PANE_DUSK, Math.min(1, dusk)).lerp(PANE_NIGHT, night);
    paneMat.color.copy(paneMat.emissive);
    if (playerRig.root.parent !== this.scene) this.scene.add(playerRig.root);
    playerRig.root.position.set(rt.x, 0, rt.z);
    playerRig.root.rotation.y = rt.facing;
    const room = rt.room;
    const a = g.action;
    animateRig(playerRig, dt, { speed: rt.speed, action: a ? Math.min(1, a.t / a.dur) : -1, actionKind: a ? a.kind : '' });
    // people turn to face the player when close, and show emotes from conversations
    for (const pp of this.people) {
      const a = agents(g).get(pp.id);
      const near = Math.hypot(rt.x - pp.x, rt.z - pp.z) < 3.2;
      const want = near ? Math.atan2(rt.x - pp.x, rt.z - pp.z) : 0;
      pp.facing = approachAngle(pp.facing, want, dt * 5);
      pp.rig.root.rotation.y = pp.facing;
      animateRig(pp.rig, dt, { speed: 0, action: -1, talking: !!a?.talking });
      const emote = a?.emote;
      if (emote && !pp.bubble) {
        pp.bubble = new THREE.Group();
        const heart = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: emote.kind === 'heart' ? 0xff7f9f : 0xffd166 }));
        pp.bubble.add(heart);
        this.room.add(pp.bubble);
      }
      if (pp.bubble) {
        if (!emote) {
          this.room.remove(pp.bubble);
          pp.bubble = null;
        } else {
          pp.bubble.position.set(pp.x, 1.85 + Math.sin(emote.t * 6) * 0.05, pp.z);
          pp.bubble.scale.setScalar(Math.min(1, (2.2 - emote.t) * 5));
        }
      }
    }
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

