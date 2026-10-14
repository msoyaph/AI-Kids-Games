/**
 * The animals: they wander in their homes' yards, stop now and then to graze (chickens peck, ducks
 * dabble), and give a happy hop when they're fed, brushed or collected from (still with reduced
 * motion, apart from the hop). Bees buzz around their hives, and a little sign bobs over a home when
 * something is ready to collect (it always faces the camera). Updated every frame; there are only ever
 * a few dozen animals.
 */
import * as THREE from 'three';
import { ANIMAL, animalForHome } from '../data/animals';
import { BUILDING } from '../data/buildings';
import { animalsIn, isHome } from '../sim/animals';
import { STEP_Y, tileAt } from '../sim/map';
import type { OtherObj } from '../sim/objects';
import type { Farm } from '../sim/state';
import { InstancedLayer } from './instanced';
import { Materials } from './materials';
import { bee, chicken, cow, dog, duck, goat, productSign, sheep } from './models/animals';
import { homeReady } from './objects';
import { isMachine, machineState } from '../sim/production';

const MODELS: Record<string, (c: { body: number; accent: number }) => THREE.BufferGeometry> = { chicken, cow, sheep, goat, duck, dog };

/** The yard where animals wander, in the home's own footprint coordinates (before turning). */
const YARDS: Record<string, [number, number, number, number]> = {
  coop: [0.25, 1.05, 1.75, 1.75], cowbarn: [0.35, 1.65, 2.65, 2.7], sheepshed: [0.3, 0.95, 2.7, 1.75], goatpen: [0.3, 0.9, 1.7, 1.75],
  duckhouse: [0.2, 1.05, 1.0, 1.8], kennel: [0.1, 0.95, 0.9, 1.4],
};

const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);

const e = new THREE.Euler();

export class AnimalView {
  readonly group = new THREE.Group();
  private layers = new Map<string, InstancedLayer>();
  /** Per animal: its own wandering clock (it stops while grazing), what it last looked like, and a hop. */
  private state = new Map<string, { u: number; sig: string; hop: number }>();
  private last = 0;

  private layer(key: string, make: () => THREE.BufferGeometry, shadow = true) {
    let l = this.layers.get(key);
    if (!l) {
      l = new InstancedLayer(make(), Materials.smoothInst, 8, { shadow, receive: false });
      this.layers.set(key, l);
      this.group.add(l.mesh);
    }
    return l;
  }

  /** `yaw`: the camera's turn, so signs face it. */
  update(farm: Farm, time: number, yaw: number, reduced: boolean) {
    for (const l of this.layers.values()) l.begin();
    const dt = this.last ? Math.min(0.1, Math.max(0, time - this.last)) : 0;
    this.last = time;
    const t = reduced ? 0 : time;
    for (const o of farm.objects) {
      if (isMachine(o)) {
        // finished goods waiting: a sign with the first one on it
        const shelf = machineState(o).shelf;
        if (!shelf.length) continue;
        const b = BUILDING[o.def]!;
        const fw = o.rot % 2 ? b.d : b.w, fd = o.rot % 2 ? b.w : b.d;
        q.setFromAxisAngle(up, yaw);
        m.compose(v.set(o.x + fw / 2, tileAt(o.x, o.z).level * STEP_Y + (b.height ?? 1.8) + 0.5 + Math.sin(t * 2.2 + o.id) * 0.06, o.z + fd / 2), q, s);
        const rec = shelf[0]!.recipe;
        this.layer(`sign:${rec}`, () => productSign(rec), false).pushMatrix(m);
        continue;
      }
      if (!isHome(o)) continue;
      const b = BUILDING[o.def]!;
      const def = animalForHome(o.def);
      if (!def) continue;
      const y0 = tileAt(o.x, o.z).level * STEP_Y;
      const fw = o.rot % 2 ? b.d : b.w, fd = o.rot % 2 ? b.w : b.d;
      // local footprint point → world, turning about the footprint's middle like the model
      const ang = (-o.rot * Math.PI) / 2, cs = Math.cos(ang), sn = Math.sin(ang);
      const toWorld = (lx: number, lz: number): [number, number] => {
        const dx = lx - b.w / 2, dz = lz - b.d / 2;
        return [o.x + fw / 2 + dx * cs + dz * sn, o.z + fd / 2 - dx * sn + dz * cs];
      };
      const list = animalsIn(o as OtherObj);
      if (def.id === 'bee') {
        if (!list.length) continue;
        const [hx, hz] = toWorld(0.5, 0.5);
        const l = this.layer('bee', bee, false);
        for (let i = 0; i < 6; i++) {
          const a = t * (1.6 + i * 0.13) + i * 1.05, r = 0.35 + (i % 3) * 0.18;
          l.push(hx + Math.cos(a) * r, y0 + 0.7 + Math.sin(t * 2.3 + i) * 0.12 + (i % 2) * 0.15, hz + Math.sin(a) * r, -a);
        }
      } else {
        const make = MODELS[def.id];
        const yard = YARDS[o.def] ?? [0.2, 0.2, b.w - 0.2, b.d - 0.2];
        const l = make ? this.layer(`animal:${def.id}`, () => make(ANIMAL[def.id]!.color)) : null;
        list.forEach((a, i) => {
          if (!l) return;
          const key = `${o.id}:${i}`;
          let st = this.state.get(key);
          const sig = `${a.fed}${a.brushed}${a.readyAt}`;
          if (!st) { st = { u: i * 7.3, sig, hop: 0 }; this.state.set(key, st); }
          if (st.sig !== sig) { st.sig = sig; st.hop = 0.7; }
          st.hop = Math.max(0, st.hop - dt);
          const ph = i * 1.7 + o.id;
          // grazing: a still spell now and then, head down
          const g = (time * 0.11 + ph * 0.37) % 1;
          const grazing = !reduced && g < 0.32;
          if (!grazing && !reduced) st.u += dt;
          const u = st.u;
          const n = list.length, cols = Math.ceil(Math.sqrt(n));
          const bx = yard[0] + ((i % cols) + 0.5) * ((yard[2] - yard[0]) / cols);
          const bz = yard[1] + (Math.floor(i / cols) + 0.5) * ((yard[3] - yard[1]) / Math.ceil(n / cols));
          const wx = Math.sin(u * 0.35 + ph) * 0.18, wz = Math.cos(u * 0.27 + ph * 1.3) * 0.12;
          const [x, z] = toWorld(bx + wx, bz + wz);
          // face the way it's wandering
          const vx = Math.cos(u * 0.35 + ph) * 0.35, vz = -Math.sin(u * 0.27 + ph * 1.3) * 0.27;
          const face = reduced ? ang + i : Math.atan2(vx * cs + vz * sn, -vx * sn + vz * cs);
          const small = def.id === 'chicken' || def.id === 'duck';
          const walkHop = small && !grazing ? Math.abs(Math.sin(t * 3 + ph)) * 0.02 : 0;
          const happy = st.hop > 0 ? Math.sin((st.hop / 0.7) * Math.PI) * 0.12 : 0;
          const peck = small ? Math.pow(Math.max(0, Math.sin(time * 7 + ph)), 4) * 0.6 : 0.3 * Math.min(1, (0.32 - g) * 12, g * 12);
          const pitch = grazing ? peck : 0;
          e.set(pitch, face, 0, 'YXZ');
          q.setFromEuler(e);
          m.compose(v.set(x, y0 + walkHop + happy, z), q, s);
          l.pushMatrix(m);
        });
      }
      if (homeReady(farm, o as OtherObj)) {
        const product = def.product!;
        const [cx, cz] = toWorld(b.w / 2, b.d / 2);
        const h = (b.height ?? 1) + 0.55 + Math.sin(t * 2.2 + o.id) * 0.06;
        q.setFromAxisAngle(up, yaw);
        m.compose(v.set(cx, y0 + h, cz), q, s);
        this.layer(`sign:${product}`, () => productSign(product), false).pushMatrix(m);
      }
    }
    for (const l of this.layers.values()) l.end();
  }
}
