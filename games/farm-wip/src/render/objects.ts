/**
 * Draws the farm's placed things from the farm state: field soil (dry or watered), crops at their
 * growth stage, buildings and old clutter. Everything of one model shares an instanced layer, so a
 * farm full of wheat is one draw call. Rebuilt when the farm changes and a few times a second while
 * crops grow (stages change slowly). Also gives the tall boxes used for tap picking.
 */
import * as THREE from 'three';
import { CROP } from '../data/crops';
import { BUILDING } from '../data/buildings';
import { fieldState, growth } from '../sim/fields';
import { STEP_Y, tileAt, areaAt } from '../sim/map';
import type { Obj } from '../sim/objects';
import type { Farm } from '../sim/state';
import { sizeOf } from '../sim/world';
import type { TallBox } from '../input/pick';
import { InstancedLayer } from './instanced';
import { Materials } from './materials';
import { compostBin, cottage, dock, oldLog, placeholder, stone, weeds } from './models/buildings';
import { cropModel, readyBadge, soilModel } from './models/crops';

const BUILDING_MODELS: Record<string, () => THREE.BufferGeometry> = { cottage, dock, compost: compostBin };
const DEBRIS_MODELS: Record<string, () => THREE.BufferGeometry> = { weeds, stone, log: oldLog };
/** How tall each thing is, for tap picking (a tap on a roof means the building). */
const HEIGHTS: Record<string, number> = { cottage: 2.4, dock: 0.4, compost: 0.6 };

const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
const pre = new THREE.Matrix4();

export function stageOf(g: number, ready: boolean): 0 | 1 | 2 | 3 {
  if (ready) return 3;
  return g < 0.25 ? 0 : g < 0.6 ? 1 : 2;
}

export class ObjectView {
  readonly group = new THREE.Group();
  private layers = new Map<string, InstancedLayer>();
  boxes: TallBox[] = [];
  /** Show the readiness badge over ready crops ("shape badges" setting). */
  badges = false;
  private key = '';

  private layer(key: string, make: () => THREE.BufferGeometry, shadow = true) {
    let l = this.layers.get(key);
    if (!l) {
      l = new InstancedLayer(make(), Materials.flatInst, 16, { shadow, receive: true });
      this.layers.set(key, l);
      this.group.add(l.mesh);
    }
    return l;
  }

  /** Rebuild if anything visible changed. Cheap to call every frame. */
  sync(farm: Farm, locked: (o: Obj) => boolean) {
    // a key from everything that changes how things look
    let key = `${this.badges}|${farm.objects.length}`;
    for (const o of farm.objects) {
      if (o.kind === 'field') key += `|${o.id}:${o.crop ?? ''}:${o.watered ? 1 : 0}:${o.crop ? stageOf(growth(farm, o), fieldState(farm, o) === 'ready') : ''}`;
      else key += `|${o.id}:${o.x},${o.z},${o.rot}`;
    }
    if (key === this.key) return;
    this.key = key;
    for (const l of this.layers.values()) l.begin();
    this.boxes = [];
    for (const o of farm.objects) {
      const y = tileAt(o.x, o.z).level * STEP_Y;
      if (o.kind === 'field') {
        const cx = o.x + 0.5, cz = o.z + 0.5;
        this.layer(o.watered ? 'soil:wet' : 'soil:dry', () => soilModel(o.watered), false).push(cx, y, cz);
        if (o.crop) {
          const crop = CROP[o.crop];
          if (!crop) continue;
          const ready = fieldState(farm, o) === 'ready';
          const stage = stageOf(growth(farm, o), ready);
          this.layer(`crop:${crop.id}:${stage}`, () => cropModel(crop, stage)).push(cx, y + 0.05, cz, ((o.x * 7 + o.z * 3) % 4) * 0.08);
          if (ready && this.badges) this.layer('badge', readyBadge, false).push(cx, y + 0.9, cz, 0);
        }
        continue;
      }
      const make = o.kind === 'debris' ? DEBRIS_MODELS[o.def] : BUILDING_MODELS[o.def];
      const size = sizeOf(o);
      const geo = make ?? (() => placeholder(size.w, size.d));
      const fw = o.rot % 2 ? size.d : size.w, fd = o.rot % 2 ? size.w : size.d;
      // models are built from their north-west corner; turn them about the footprint's middle
      q.setFromAxisAngle(up, (-o.rot * Math.PI) / 2);
      m.compose(v.set(o.x + fw / 2, y, o.z + fd / 2), q, one);
      pre.makeTranslation(-size.w / 2, 0, -size.d / 2);
      m.multiply(pre);
      this.layer(`${o.kind}:${o.def}`, geo, o.kind !== 'debris' || o.def !== 'weeds').pushMatrix(m);
      const h = HEIGHTS[o.def] ?? (o.kind === 'debris' ? 0.35 : 1);
      if (!locked(o)) this.boxes.push({ min: [o.x, y, o.z], max: [o.x + fw, y + h, o.z + fd], tile: { x: o.x, z: o.z } });
    }
    for (const l of this.layers.values()) l.end();
  }
}

/** Is this thing on land that isn't open yet? */
export const onLockedLand = (farm: Farm) => (o: Obj) => {
  const a = areaAt(o.x, o.z);
  return !!a && !farm.unlocked.includes(a);
};

export const buildingName = (def: string) => BUILDING[def]?.name ?? def;
