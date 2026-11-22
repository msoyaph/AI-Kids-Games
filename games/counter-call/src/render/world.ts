/**
 * The diner, built in code. We look at it from behind the counter: cooking stations nearest
 * the camera, then Minty's lane, the counter, the friends and the dining room with its door.
 */
import * as THREE from 'three';
import { FOOD_BY_ID, STATION_ORDER, type FoodId } from '../data/menu';
import { LAYOUT, SPOT_COUNT, type Target } from '../sim';
import { makeFood } from './food';
import { at, box, cone, cyl, dome, glass, lit, mesh, paint, rbox, shade, soft, sphere } from './kit';

export interface StationView {
  food: FoodId;
  /** The appliance on top (hidden under a cloth while the station is closed). */
  appliance: THREE.Group;
  cover: THREE.Group;
  /** The finished food, on its plate. */
  dish: THREE.Group;
  /** Where steam rises from. */
  steam: THREE.Vector3;
  /** Parts that only show while cooking (a patty, the oven's glow). */
  hot: THREE.Object3D[];
}

export interface Pick { mesh: THREE.Mesh; target: Target | 'bell' | 'cake' }

export interface World {
  group: THREE.Group;
  stations: StationView[];
  bell: THREE.Group;
  /** The cake stand: tap it to share free cake. */
  cake: THREE.Group;
  picks: Pick[];
}

const WALL = '#fff1d6';
const MINT = '#bfe6d8';

function floors(g: THREE.Group): void {
  const tiles = paint(128, 128, (c, w, h) => {
    c.fillStyle = '#fdebd0';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#f8d7b0';
    c.fillRect(0, 0, w / 2, h / 2);
    c.fillRect(w / 2, h / 2, w / 2, h / 2);
  });
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
  tiles.repeat.set(8, 8);
  const kitchen = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.85 }));
  at(kitchen, 0, 0, 7, -Math.PI / 2);
  kitchen.receiveShadow = true;

  const planks = paint(256, 256, (c, w, h) => {
    c.fillStyle = '#f3c995';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#e2b27c';
    c.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      c.beginPath();
      c.moveTo(0, (i * h) / 4);
      c.lineTo(w, (i * h) / 4);
      c.stroke();
      const x = ((i * 97) % 200) + 28;
      c.beginPath();
      c.moveTo(x, (i * h) / 4);
      c.lineTo(x, ((i + 1) * h) / 4);
      c.stroke();
    }
  });
  planks.wrapS = planks.wrapT = THREE.RepeatWrapping;
  planks.repeat.set(5, 2.4);
  const dining = new THREE.Mesh(new THREE.PlaneGeometry(16, 7), new THREE.MeshStandardMaterial({ map: planks, roughness: 0.8 }));
  at(dining, 0, 0, -4.5, -Math.PI / 2);
  dining.receiveShadow = true;
  g.add(kitchen, dining);
}

function walls(g: THREE.Group): void {
  const wall = soft(WALL, 0.95), trim = soft(MINT, 0.9), white = soft('#ffffff', 0.7);
  // Tall walls: phones in portrait see a long way up.
  const back = new THREE.Mesh(new THREE.PlaneGeometry(16, 40), wall);
  at(back, 0, 20, -8);
  g.add(back);
  g.add(at(mesh(box(), trim, 16, 1.25, 0.08), 0, 0.625, -7.96));
  g.add(at(mesh(box(), white, 16, 0.09, 0.12), 0, 1.28, -7.95));
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(24, 40), wall);
    at(w, side * 8, 20, 4, 0, -side * Math.PI / 2);
    g.add(w);
    g.add(at(mesh(box(), trim, 0.08, 1.25, 24), side * 7.96, 0.625, 4));
    g.add(at(mesh(box(), white, 0.12, 0.09, 24), side * 7.95, 1.28, 4));
  }

  // The window: a sunny day painted on a canvas.
  const sky = paint(512, 256, (c, w, h) => {
    const grad = c.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#8fd3f4');
    grad.addColorStop(1, '#e6f8ff');
    c.fillStyle = grad;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff3a6';
    c.beginPath();
    c.arc(w * 0.82, h * 0.26, 30, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    for (const [x, y, s] of [[90, 70, 1], [270, 50, 0.8], [400, 120, 0.7]] as const) {
      for (const [dx, dy, r] of [[0, 0, 26], [28, 6, 20], [-28, 8, 18], [8, -14, 18]] as const) {
        c.beginPath();
        c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.fillStyle = '#a8dd8c';
    c.beginPath();
    c.ellipse(140, h + 30, 220, 90, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#8fd07a';
    c.beginPath();
    c.ellipse(400, h + 40, 200, 100, 0, 0, Math.PI * 2);
    c.fill();
  });
  const wx = 1.7, wy = 2.95;
  g.add(at(mesh(rbox(5.3, 2.7, 0.14, 0.06), white), wx, wy, -7.95));
  g.add(at(new THREE.Mesh(new THREE.PlaneGeometry(4.9, 2.3), new THREE.MeshBasicMaterial({ map: sky })), wx, wy, -7.86));
  for (const dx of [-0.82, 0.82]) g.add(at(mesh(box(), white, 0.09, 2.3, 0.06), wx + dx, wy, -7.85));
  g.add(at(mesh(rbox(5.5, 0.12, 0.34, 0.04), white), wx, wy - 1.36, -7.83));

  // The sign over the window.
  const sign = paint(512, 128, (c, w, h) => {
    c.fillStyle = '#ff8a7a';
    c.beginPath();
    c.roundRect(4, 4, w - 8, h - 8, 44);
    c.fill();
    c.strokeStyle = '#fff6e5';
    c.lineWidth = 6;
    c.beginPath();
    c.roundRect(16, 16, w - 32, h - 32, 34);
    c.stroke();
    c.fillStyle = '#fff6e5';
    c.font = '800 62px ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('Counter Call', w / 2, h / 2 + 4);
  });
  g.add(at(new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ map: sign, transparent: true })), wx, 5.05, -7.9));

  // The door friends come in by.
  const dx = LAYOUT.door.x;
  g.add(at(mesh(rbox(1.9, 3.0, 0.16, 0.06), white), dx, 1.5, -7.94));
  g.add(at(mesh(rbox(1.56, 2.72, 0.1, 0.05), soft('#35b5b0', 0.6)), dx, 1.38, -7.86));
  g.add(at(mesh(cyl(1, 1, 24), soft('#d6f3ff', 0.2), 0.36, 0.04, 0.36), dx, 2.05, -7.8, Math.PI / 2));
  g.add(at(mesh(sphere(10), soft('#ffd35c', 0.3, 0.5), 0.07), dx + 0.55, 1.3, -7.76));
  const mat = at(mesh(rbox(1.7, 0.04, 0.9, 0.02), soft('#ff8a7a', 0.9)), dx, 0.02, -7.2);
  mat.castShadow = false;
  mat.receiveShadow = true;
  g.add(mat);
}

function counter(g: THREE.Group, bell: THREE.Group, cake: THREE.Group): void {
  const z = LAYOUT.counterZ;
  const body = at(mesh(rbox(9.8, 0.82, 0.6, 0.08), soft('#fff8ea', 0.8)), 0, 0.41, z);
  body.receiveShadow = true;
  g.add(body);
  g.add(at(mesh(box(), soft(MINT, 0.8), 9.82, 0.2, 0.62), 0, 0.34, z));
  const top = at(mesh(rbox(10.1, 0.1, 0.86, 0.05), soft('#e8b27a', 0.6)), 0, 0.87, z);
  top.receiveShadow = true;
  g.add(top);

  // The bell that calls the next friend in.
  bell.position.set(LAYOUT.bell.x, 0.92, LAYOUT.bell.z);
  bell.add(at(mesh(cyl(1, 1.1, 20), soft('#5a4636', 0.6), 0.15, 0.03, 0.15), 0, 0.015, 0));
  bell.add(at(mesh(dome(), soft('#ffcf4a', 0.25, 0.65), 0.13, 0.12, 0.13), 0, 0.03, 0));
  bell.add(at(mesh(sphere(10), soft('#ffcf4a', 0.25, 0.65), 0.028), 0, 0.165, 0));
  g.add(bell);

  // A plant and a cake stand at the ends.
  const pot = new THREE.Group();
  pot.add(at(mesh(cyl(1, 0.75, 16), soft('#e07a5f', 0.8), 0.17, 0.22, 0.17), 0, 0.11, 0));
  for (const [x, y, zz, s] of [[0, 0.36, 0, 0.17], [-0.12, 0.3, 0.05, 0.12], [0.12, 0.31, -0.04, 0.13], [0.02, 0.5, 0.02, 0.11]] as const) pot.add(at(mesh(sphere(12), soft('#6fc48a', 0.8), s), x, y, zz));
  g.add(at(pot, -4.5, 0.92, z));
  cake.add(at(mesh(cyl(1, 1, 20), soft('#ffffff', 0.5), 0.24, 0.02, 0.24), 0, 0.09, 0));
  cake.add(at(mesh(cyl(0.3, 0.8, 12), soft('#ffffff', 0.5), 0.1, 0.08, 0.1), 0, 0.04, 0));
  cake.add(at(mesh(cyl(1, 1, 20), soft('#ffb6d0', 0.6), 0.16, 0.12, 0.16), 0, 0.16, 0));
  cake.add(at(mesh(sphere(10), soft('#e2374c', 0.4), 0.035), 0, 0.245, 0));
  const lid = at(mesh(dome(), glass('#ffffff', 0.28), 0.22, 0.24, 0.22), 0, 0.1, 0);
  lid.castShadow = false;
  cake.add(lid);
  g.add(at(cake, LAYOUT.cake.x, 0.92, LAYOUT.cake.z));

  // Mats where friends stand.
  for (let i = 0; i < SPOT_COUNT; i++) {
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.55, 28), soft('#ffdcae', 0.9));
    at(spot, LAYOUT.spotX[i], 0.012, LAYOUT.guestZ, -Math.PI / 2);
    spot.receiveShadow = true;
    g.add(spot);
  }
}

function dining(g: THREE.Group): void {
  const white = soft('#ffffff', 0.6), coral = soft('#ff8a7a', 0.7);
  const table = (x: number, z: number) => {
    const t = new THREE.Group();
    t.add(at(mesh(cyl(1, 1, 28), white, 0.68, 0.06, 0.68), 0, 0.74, 0));
    t.add(at(mesh(cyl(1, 1, 12), soft('#c9ccd6', 0.4, 0.4), 0.06, 0.72, 0.06), 0, 0.37, 0));
    t.add(at(mesh(cyl(1, 1, 20), soft('#c9ccd6', 0.4, 0.4), 0.3, 0.04, 0.3), 0, 0.02, 0));
    t.add(at(mesh(cyl(0.7, 1, 12), soft('#8fd3f4', 0.5), 0.06, 0.14, 0.06), 0, 0.84, 0));
    t.add(at(mesh(sphere(10), soft('#ffd35c', 0.6), 0.06), 0, 0.97, 0));
    for (const side of [-1, 1]) {
      t.add(at(mesh(cyl(1, 0.9, 18), coral, 0.24, 0.09, 0.24), side * 0.98, 0.47, 0.1));
      t.add(at(mesh(cyl(1, 1, 10), soft('#c9ccd6', 0.4, 0.4), 0.04, 0.44, 0.04), side * 0.98, 0.22, 0.1));
    }
    g.add(at(t, x, 0, z));
  };
  table(-5.6, -3.4);
  table(5.3, -5.2);
  table(1.2, -6.4);

  for (const x of [-7.1, 7.1]) {
    const p = new THREE.Group();
    p.add(at(mesh(cyl(1, 0.75, 18), soft('#e07a5f', 0.8), 0.36, 0.5, 0.36), 0, 0.25, 0));
    for (const [px, py, pz, s] of [[0, 0.95, 0, 0.42], [-0.25, 0.75, 0.1, 0.3], [0.26, 0.8, -0.05, 0.32], [0.05, 1.35, 0, 0.28]] as const) p.add(at(mesh(sphere(14), soft('#6fc48a', 0.85), s), px, py, pz));
    g.add(at(p, x, 0, -7.2));
  }

  // Hanging lamps over the counter.
  for (const x of [-3.2, 0, 3.2]) {
    const lamp = new THREE.Group();
    const cord = at(mesh(cyl(1, 1, 6), soft('#5a4636', 0.8), 0.012, 36, 0.012), 0, 18.1, 0);
    cord.castShadow = false;
    const shadeMesh = at(mesh(cyl(0.3, 1, 20), soft('#ff8a7a', 0.6), 0.3, 0.22, 0.3), 0, 0, 0);
    shadeMesh.castShadow = false;
    const bulb = at(mesh(sphere(10), lit('#fff0b8', 1.4), 0.09), 0, -0.1, 0);
    bulb.castShadow = false;
    lamp.add(cord, shadeMesh, bulb);
    g.add(at(lamp, x, 4.7, LAYOUT.counterZ));
  }
}

/** One cooking station: a cabinet, a worktop, its appliance and the plate where food appears. */
function station(index: number): { group: THREE.Group; view: StationView } {
  const food = STATION_ORDER[index];
  const def = FOOD_BY_ID[food];
  const group = new THREE.Group();
  group.position.set(LAYOUT.stationX[index], 0, LAYOUT.stationZ);
  const cabinet = at(mesh(rbox(1.36, 0.78, 0.92, 0.07), soft(shade(def.color, 0.35), 0.8)), 0, 0.39, 0);
  cabinet.receiveShadow = true;
  group.add(cabinet);
  group.add(at(mesh(box(), soft(def.color, 0.7), 1.38, 0.1, 0.94), 0, 0.2, 0));
  const worktop = at(mesh(rbox(1.46, 0.08, 1.0, 0.035), soft('#fffaf0', 0.5)), 0, 0.81, 0);
  worktop.receiveShadow = true;
  group.add(worktop);

  const y = 0.85;
  const appliance = new THREE.Group();
  appliance.position.set(-0.36, y, 0.1);
  group.add(appliance);
  const hot: THREE.Object3D[] = [];
  const steel = soft('#cfd6dd', 0.35, 0.5);
  let steamY = 0.35;
  switch (food) {
    case 'juice':
      appliance.add(at(mesh(rbox(0.62, 0.1, 0.42, 0.03), soft('#ffffff', 0.5)), 0, 0.05, 0));
      for (const [x, color] of [[-0.15, '#ffa62b'], [0.15, '#ff9ec4']] as const) {
        appliance.add(at(mesh(cyl(1, 1, 18), soft(color, 0.25), 0.115, 0.22, 0.115), x, 0.21, 0));
        appliance.add(at(mesh(cyl(1, 1, 18), soft('#ffffff', 0.5), 0.125, 0.05, 0.125), x, 0.34, 0));
        appliance.add(at(mesh(box(), steel, 0.04, 0.04, 0.1), x, 0.14, -0.14));
      }
      steamY = 0.42;
      break;
    case 'fries': {
      appliance.add(at(mesh(rbox(0.6, 0.22, 0.56, 0.04), steel), 0, 0.11, 0));
      appliance.add(at(mesh(box(), soft('#f2b632', 0.3), 0.5, 0.02, 0.46), 0, 0.215, 0));
      appliance.add(at(mesh(rbox(0.32, 0.1, 0.3, 0.03), soft('#6b7280', 0.5, 0.4)), 0, 0.23, 0.02));
      appliance.add(at(mesh(cyl(1, 1, 8), soft('#3d4250', 0.6), 0.02, 0.3, 0.02), 0, 0.29, -0.26, Math.PI / 2 - 0.4));
      steamY = 0.32;
      break;
    }
    case 'burger': {
      appliance.add(at(mesh(rbox(0.68, 0.09, 0.6, 0.03), soft('#3d4250', 0.5, 0.3)), 0, 0.045, 0));
      for (let i = -2; i <= 2; i++) appliance.add(at(mesh(box(), soft('#5b6172', 0.5, 0.3), 0.6, 0.012, 0.03), 0, 0.094, i * 0.11));
      for (let i = -1; i <= 1; i++) appliance.add(at(mesh(sphere(8), soft('#f25f5c', 0.5), 0.03), i * 0.16, 0.05, 0.31));
      const patty = at(mesh(cyl(1, 1, 18), soft('#7a4a32', 0.8), 0.12, 0.04, 0.12), 0, 0.12, 0);
      appliance.add(patty);
      hot.push(patty);
      steamY = 0.2;
      break;
    }
    case 'icecream':
      appliance.add(at(mesh(rbox(0.52, 0.28, 0.44, 0.08), soft('#ffb6d0', 0.6)), 0, 0.14, 0));
      appliance.add(at(mesh(rbox(0.56, 0.06, 0.48, 0.03), soft('#ffffff', 0.5)), 0, 0.3, 0));
      appliance.add(at(mesh(cyl(0.6, 1, 12), steel, 0.05, 0.08, 0.05), 0, 0.14, -0.25));
      appliance.add(at(mesh(cone(), soft('#e2a85c', 0.7), 0.06, 0.12, 0.06), 0, 0.37, 0, Math.PI));
      appliance.add(at(mesh(sphere(14), soft('#fff3d6', 0.6), 0.075), 0, 0.47, 0));
      appliance.add(at(mesh(sphere(8), soft('#e2374c', 0.4), 0.024), 0, 0.55, 0));
      steamY = 0.45;
      break;
    case 'pizza': {
      appliance.add(at(mesh(cyl(1, 1, 24), soft('#c9b8a8', 0.9), 0.38, 0.06, 0.38), 0, 0.03, 0));
      appliance.add(at(mesh(dome(), soft('#e07a5f', 0.85), 0.34, 0.28, 0.34), 0, 0.06, 0));
      appliance.add(at(mesh(cyl(1, 1, 16), soft('#3d2a24', 0.9), 0.16, 0.06, 0.16), 0, 0.15, -0.31, Math.PI / 2));
      const fire = at(mesh(sphere(12), lit('#ffb347', 1.6), 0.12, 0.1, 0.05), 0, 0.14, -0.33);
      fire.castShadow = false;
      appliance.add(fire);
      hot.push(fire);
      appliance.add(at(mesh(cyl(1, 1, 10), soft('#c9b8a8', 0.9), 0.06, 0.14, 0.06), 0.12, 0.34, 0.1));
      steamY = 0.48;
      break;
    }
  }
  for (const part of hot) part.visible = false;

  // The pass: a plate where the finished food waits to be picked up.
  group.add(at(mesh(cyl(1, 0.8, 24), soft('#ffffff', 0.4), 0.21, 0.025, 0.21), 0.42, y + 0.012, -0.12));
  const dish = new THREE.Group();
  dish.position.set(0.42, y + 0.03, -0.12);
  dish.add(makeFood(food));
  dish.visible = false;
  group.add(dish);

  const cover = new THREE.Group();
  cover.add(at(mesh(rbox(1.42, 0.5, 0.96, 0.16), soft('#e3dcf5', 0.95)), 0, y + 0.2, 0));
  cover.add(at(mesh(rbox(1.5, 0.07, 1.04, 0.03), soft('#cfc5ec', 0.95)), 0, y - 0.01, 0));
  cover.visible = false;
  group.add(cover);

  const steam = new THREE.Vector3(LAYOUT.stationX[index] - 0.36, y + steamY, LAYOUT.stationZ + 0.1);
  return { group, view: { food, appliance, cover, dish, steam, hot } };
}

export function buildWorld(): World {
  const group = new THREE.Group();
  const bell = new THREE.Group(), cake = new THREE.Group();
  floors(group);
  walls(group);
  counter(group, bell, cake);
  dining(group);

  const picks: Pick[] = [];
  const hit = (w: number, h: number, d: number, x: number, y: number, z: number, target: Pick['target']) => {
    const m = new THREE.Mesh(box(), soft('#ffffff'));
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    m.visible = false;
    group.add(m);
    picks.push({ mesh: m, target });
  };
  const stations: StationView[] = [];
  for (let i = 0; i < STATION_ORDER.length; i++) {
    const s = station(i);
    group.add(s.group);
    stations.push(s.view);
    hit(1.5, 1.5, 1.1, LAYOUT.stationX[i], 0.75, LAYOUT.stationZ, { kind: 'station', index: i });
  }
  for (let i = 0; i < SPOT_COUNT; i++) hit(1.5, 2, 1, LAYOUT.spotX[i], 1, LAYOUT.guestZ, { kind: 'guest', spot: i });
  hit(0.6, 0.5, 0.6, LAYOUT.bell.x, 1.1, LAYOUT.bell.z, 'bell');
  hit(0.7, 0.6, 0.7, LAYOUT.cake.x, 1.15, LAYOUT.cake.z, 'cake');

  return { group, stations, bell, cake, picks };
}
