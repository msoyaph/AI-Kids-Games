/**
 * The town's things, drawn: one culling instanced layer per model (and per detail level), so a whole
 * street of cottages in six colours is one draw call, and things off screen cost nothing. Trees take
 * the season's leaf colours; buildings take their paint. Street lamps are added along every sidewalk
 * by themselves (the player never has to place them), so streets glow at night.
 */
import * as THREE from 'three';
import { THING, type ThingDef } from '../data/things';
import type { Season } from '../sim/clock';
import { roadLinks, type City, type Thing } from '../sim/city';
import { H, inMap, W } from '../sim/map';
import { lowDetail } from './geo';
import { InstancedLayer } from './instanced';
import { Materials } from './materials';
import { library } from './models/civic';
import { bungalow, cottage, townhouse } from './models/homes';
import { bench, bin, bushClump, busShelter, flowerBed, fountain, hydrant, parkArch, picnicTable, pineTree, playground, postBox, roundTree, streetLamp } from './models/props';
import { apartments, cafe, cornerStore } from './models/shops';
import { mixHex, SEASON_PALETTES } from './palette';

const MODELS: Record<string, () => THREE.BufferGeometry> = {
  cottage, townhouse, bungalow, apartments, cafe, store: cornerStore, library,
  fountain, playground, bench, picnic: picnicTable, flowerbed: flowerBed, arch: parkArch,
  lamp: streetLamp, busstop: busShelter, hydrant, postbox: postBox, bin,
  tree: roundTree, blossom: roundTree, pine: pineTree, bush: bushClump,
};

const geometries = new Map<string, THREE.BufferGeometry>();
function model(def: string, low: boolean): THREE.BufferGeometry {
  const key = `${def}|${low ? 'low' : 'full'}`;
  let g = geometries.get(key);
  if (!g) { g = low ? lowDetail(MODELS[def]!) : MODELS[def]!(); geometries.set(key, g); }
  return g;
}

/** Footprint size after turning. */
export function turnedSize(t: Thing, def: ThingDef) {
  return t.rot % 2 ? { w: def.d, d: def.w } : { w: def.w, d: def.d };
}

/** A tile-aligned box for tap picking. */
export interface PickBox { min: [number, number, number]; max: [number, number, number]; thing: Thing }

const q = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);
const m4 = new THREE.Matrix4();
const one = new THREE.Vector3(1, 1, 1);

export class ObjectView {
  readonly group = new THREE.Group();
  private layers = new Map<string, InstancedLayer>();
  boxes: PickBox[] = [];
  lowDetail = false;
  private key = '';

  constructor() { this.group.name = 'things'; }

  get layerList() { return [...this.layers.values()]; }

  private layer(def: string): InstancedLayer {
    const key = `${def}|${this.lowDetail}`;
    let l = this.layers.get(key);
    if (!l) {
      const tree = THING[def]!.class === 'tree' && def !== 'bush';
      l = new InstancedLayer(model(def, this.lowDetail), tree ? Materials.treeTintInst : Materials.flatTintInst, 16, { cull: true });
      this.layers.set(key, l);
      this.group.add(l.mesh);
    }
    return l;
  }

  /** Rebuild the instances when the town's things, the season or the detail level change. */
  sync(city: City, season: Season) {
    const key = `${city.things.length}|${city.version ?? 0}|${season}|${this.lowDetail}`;
    if (key === this.key) return false;
    this.key = key;
    for (const l of this.layers.values()) { l.dispose(); }
    this.layers.clear();
    this.group.clear();
    const pal = SEASON_PALETTES[season];
    const byDef = new Map<string, Thing[]>();
    for (const t of [...city.things, ...streetLamps(city)]) {
      if (!byDef.has(t.def)) byDef.set(t.def, []);
      byDef.get(t.def)!.push(t);
    }
    this.boxes = [];
    for (const [def, list] of byDef) {
      const d = THING[def]!;
      const l = this.layer(def);
      l.begin();
      for (const t of list) {
        const s = turnedSize(t, d);
        q.setFromAxisAngle(up, (-t.rot * Math.PI) / 2);
        m4.compose(new THREE.Vector3(t.x + s.w / 2, 0, t.z + s.d / 2), q, one);
        let color: number | undefined;
        if (d.looks) color = d.looks[(t.look ?? 0) % d.looks.length];
        else if (def === 'tree') color = (t.look ?? 0) % 2 ? mixHex(pal.leaf, pal.pine, 0.35) : pal.leaf;
        else if (def === 'blossom') color = season === 'spring' ? 0xf7b8cf : season === 'summer' ? pal.leafAlt : pal.leaf;
        else if (def === 'pine') color = pal.pine;
        if (color !== undefined && d.class === 'tree') {
          // a little variety in every canopy
          const c = new THREE.Color(color).offsetHSL(0, 0, ((t.look ?? 0) % 3 - 1) * 0.03);
          color = c.getHex();
        }
        l.pushMatrix(m4, color);
        if (d.class !== 'street') this.boxes.push({ min: [t.x, 0, t.z], max: [t.x + s.w, d.height, t.z + s.d], thing: t });
      }
      l.end();
    }
    return true;
  }
}

/**
 * Street lamps along the sidewalks: on every fourth tile of a straight street, on alternating sides,
 * at the sidewalk's outer edge. Derived from the roads, never saved.
 */
export function streetLamps(city: City): Thing[] {
  const out: Thing[] = [];
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (!inMap(x, z) || city.roads[z * W + x] !== 1) continue;
    const L = roadLinks(city, x, z);
    // straight stretches only (junctions stay clear for the crossings)
    if (L !== 5 && L !== 10) continue;
    // every fourth tile, on alternating sides of the street
    const k = L === 5 ? z : x;
    if (k % 4 !== 1 && k % 4 !== 3) continue;
    const side = k % 4 === 1 ? -1 : 1;
    if (L === 5) out.push({ def: 'lamp', x: x + side * (0.5 - 0.08), z, rot: 0 });
    else out.push({ def: 'lamp', x, z: z + side * (0.5 - 0.08), rot: 0 });
  }
  return out;
}
