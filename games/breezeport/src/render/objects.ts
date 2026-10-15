/**
 * The town's things, drawn: one culling instanced layer per model (and per detail level), so a whole
 * street of cottages in six colours is one draw call, and things off screen cost nothing. Trees take
 * the season's leaf colours; buildings take their paint. Street lamps are added along every sidewalk
 * by themselves (the player never has to place them), so streets glow at night.
 */
import * as THREE from 'three';
import { THING, type ThingDef } from '../data/things';
import type { Season } from '../sim/clock';
import { type Town, type Thing } from '../sim/state';
import { roadLinks } from '../sim/roads';
import { H, inMap, W } from '../sim/map';
import { lowDetail } from './geo';
import { InstancedLayer } from './instanced';
import { Materials } from './materials';
import { cityHall, clinic, community, library, recycling, safety, school } from './models/civic';
import { aquarium, ferris, glasshouse, observatory, pier, stage } from './models/landmarks';
import { offices, studio, workshop } from './models/work';
import { TUNING } from '../data/tuning';
import { box, merge, part, PAT, TINT } from './geo';
import { bungalow, cottage, duplex, flats, townhouse } from './models/homes';
import { bench, bin, bushClump, busShelter, flowerBed, fountain, hydrant, parkArch, picnicTable, pineTree, playground, pond, postBox, roundTree, scaffold, skatepark, streetLamp, tramStop } from './models/props';
import { apartments, bakery, bookshop, cafe, cornerStore, market } from './models/shops';
import { mixHex, SEASON_PALETTES } from './palette';

const MODELS: Record<string, () => THREE.BufferGeometry> = {
  cottage, townhouse, bungalow, duplex, flats, apartments, cafe, store: cornerStore, bakery, bookshop, market, workshop, studio, offices,
  library, cityhall: () => cityHall(false), 'cityhall-clock': () => cityHall(true), school, clinic, safety, community, recycling, pier, ferris, glasshouse, aquarium, observatory, stage,
  pond, skatepark, tramstop: tramStop, scaffold,
  fountain, playground, bench, picnic: picnicTable, flowerbed: flowerBed, arch: parkArch,
  lamp: streetLamp, busstop: busShelter, hydrant, postbox: postBox, bin,
  tree: roundTree, blossom: roundTree, pine: pineTree, bush: bushClump,
};

const geometries = new Map<string, THREE.BufferGeometry>();
/** A stand-in for a thing whose model hasn't been built yet: a painted block with a darker roof. */
function standIn(def: string): () => THREE.BufferGeometry {
  return () => {
    const d = THING[def]!;
    const w = d.w * 0.82, dd = d.d * 0.82, h = Math.max(0.2, d.height * 0.8);
    return merge([part(box(w, h, dd), 0xffffff, { pos: [0, h / 2, 0], pattern: PAT.siding + TINT }), part(box(w + 0.08, 0.08, dd + 0.08), 0x5a6470, { pos: [0, h + 0.04, 0] })]);
  };
}

/** The model for a thing (shared with the placing ghost). */
export function modelFor(def: string, low: boolean): THREE.BufferGeometry { return model(def, low); }

function model(def: string, low: boolean): THREE.BufferGeometry {
  const key = `${def}|${low ? 'low' : 'full'}`;
  let g = geometries.get(key);
  if (!g) { const make = MODELS[def] ?? standIn(def); g = low ? lowDetail(make) : make(); geometries.set(key, g); }
  return g;
}

/** Footprint size after turning. */
export function turnedSize(t: Thing, def: ThingDef) {
  return t.rot % 2 ? { w: def.d, d: def.w } : { w: def.w, d: def.d };
}

import type { TallBox } from '../input/pick';

const q = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);
const m4 = new THREE.Matrix4();
const one = new THREE.Vector3(1, 1, 1);

export class ObjectView {
  readonly group = new THREE.Group();
  private layers = new Map<string, InstancedLayer>();
  boxes: TallBox[] = [];
  lowDetail = false;
  private key = '';

  constructor() { this.group.name = 'things'; }

  get layerList() { return [...this.layers.values()]; }

  private layer(def: string): InstancedLayer {
    const key = `${def}|${this.lowDetail}`;
    let l = this.layers.get(key);
    if (!l) {
      const tree = THING[def]?.class === 'tree' && def !== 'bush';
      l = new InstancedLayer(model(def, this.lowDetail), tree ? Materials.treeTintInst : Materials.flatTintInst, 16, { cull: true });
      this.layers.set(key, l);
      this.group.add(l.mesh);
    }
    return l;
  }

  /** Rebuild the instances when the town's things, the season or the detail level change. */
  sync(city: Town, season: Season) {
    // buildings still going up show scaffolding until they're done
    const building = city.things.filter(t => t.born && city.t - t.born < TUNING.growth.buildSec && THING[t.def]?.zone).map(t => t.id);
    const key = `${city.things.length}|${city.version ?? 0}|${season}|${this.lowDetail}|${building.join(',')}`;
    if (key === this.key) return false;
    this.key = key;
    for (const l of this.layers.values()) { l.dispose(); }
    this.layers.clear();
    this.group.clear();
    const pal = SEASON_PALETTES[season];
    const byDef = new Map<string, Thing[]>();
    const scaffolded = new Set(building);
    for (const t of [...city.things, ...streetLamps(city)]) {
      // City Hall shows its clock once the town has funded it
      const def = scaffolded.has(t.id) ? 'scaffold' : t.def === 'cityhall' && city.flags['project-clocktower'] ? 'cityhall-clock' : t.def;
      if (!byDef.has(def)) byDef.set(def, []);
      byDef.get(def)!.push(t);
    }
    this.boxes = [];
    for (const [def, list] of byDef) {
      const d = THING[def] ?? THING[list[0]!.def]!;
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
        if (d.class !== 'street' && t.id) this.boxes.push({ min: [t.x, 0, t.z], max: [t.x + s.w, d.height, t.z + s.d], tile: { x: Math.floor(t.x), z: Math.floor(t.z) }, id: t.id });
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
export function streetLamps(city: Town): Thing[] {
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
    const lamp = (lx: number, lz: number): Thing => ({ id: 0, def: 'lamp', x: lx, z: lz, rot: 0, look: 0, level: 1, pay: 0, born: 0 });
    if (L === 5) out.push(lamp(x + side * (0.5 - 0.08), z));
    else out.push(lamp(x, z + side * (0.5 - 0.08)));
  }
  return out;
}
