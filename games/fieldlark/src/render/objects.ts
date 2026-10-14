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
import { compostBin, cottage, dock, forage, oldLog, placeholder, stone, weeds } from './models/buildings';
import { cropModel, readyBadge, soilModel } from './models/crops';
import { VARIETY } from '../data/varieties';
import { beehive, coop, cowBarn, duckHouse, goatPen, kennel, sheepShed } from './models/animals';
import { treeModel, type TreeLook } from './models/trees';
import { TREE } from '../data/orchard';
import { MACHINE } from '../data/production';
import { workshop } from './models/workshops';
import { orderBoard } from './models/town';
import { CORNER_DECOR, decorModel, fencePiece } from './models/decor';
import { DECOR_BY_ID, PATHS } from '../data/decor';
import { H, W } from '../sim/map';
import { box, merge, part } from './geo';
import { animalForHome } from '../data/animals';
import { animalsIn, isHome, isReady } from '../sim/animals';
import { inFruitSeason, treeGrowth, treeRipe } from '../sim/trees';
import { seasonOf } from '../sim/clock';
import { isGreenhouse, plotsOf, plotState, type Plot } from '../sim/greenhouse';
import { channelAt, CHANNEL, wetMap } from '../sim/water';
import { bedTiles, BED_Y, channelPiece, greenhouseFrame, greenhouseGlass } from './models/glass';
import type { OtherObj } from '../sim/objects';

const BUILDING_MODELS: Record<string, () => THREE.BufferGeometry> = {
  cottage, dock, compost: compostBin, board: () => orderBoard().translate(0.5, 0, 0.5), coop, cowbarn: cowBarn, sheepshed: sheepShed, goatpen: goatPen, duckhouse: duckHouse, beehive, kennel,
  greenhouse: () => greenhouseFrame(2, 2), greenhouse_m: () => greenhouseFrame(3, 3), greenhouse_l: () => greenhouseFrame(4, 3),
};

/** 0..1 through a greenhouse bed's growing. */
const plotGrowth = (farm: Farm, p: Plot) => (p.readyAt - p.plantedAt <= 0 ? 1 : Math.min(1, Math.max(0, (farm.t - p.plantedAt) / (p.readyAt - p.plantedAt))));
const DEBRIS_MODELS: Record<string, () => THREE.BufferGeometry> = { weeds, stone, log: oldLog, mushrooms: forage };

/** How a fruit tree looks right now. */
export function treeLook(farm: Farm, o: OtherObj): TreeLook {
  const def = TREE[o.def];
  if (!def) return 'rest';
  if (treeRipe(farm, o)) return 'ripe';
  if (!inFruitSeason(farm, o)) return seasonOf(farm.t) === 'winter' && def.id !== 'lemon' ? 'bare' : 'rest';
  return treeGrowth(farm, o) < 0.4 ? 'bloom' : 'grow';
}

/** Does a home have something ready to collect? */
export const homeReady = (farm: Farm, o: OtherObj) => !!animalForHome(o.def)?.product && animalsIn(o).some(a => isReady(farm, a));

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
  /** Something being moved is drawn as the ghost instead. */
  hiddenId: number | null = null;
  /** Goes up every time the drawn things change. */
  version = 0;
  /** Ready fields (tile corners), for the harvest sparkles. */
  ready: { x: number; z: number; y: number }[] = [];
  private key = '';

  private layer(key: string, make: () => THREE.BufferGeometry, shadow = true) {
    let l = this.layers.get(key);
    if (!l) {
      // crops sway, trees sway and have round canopies; everything else is a faceted prop
      const mat = key.startsWith('crop:') ? Materials.plantInst : key.startsWith('tree:') ? Materials.treeInst : key.startsWith('glass:') ? Materials.glassInst : Materials.flatInst;
      l = new InstancedLayer(make(), mat, 16, { shadow, receive: true, cull: true });
      this.layers.set(key, l);
      this.group.add(l.mesh);
    }
    return l;
  }

  /** The layers, for culling to the view (FarmView). */
  get layerList(): Iterable<InstancedLayer> { return this.layers.values(); }

  /** Rebuild if anything visible changed. Cheap to call every frame. */
  sync(farm: Farm, locked: (o: Obj) => boolean) {
    // a key from everything that changes how things look
    let key = `${this.badges}|${this.hiddenId}|${farm.objects.length}|${farm.paths}|${farm.flags['lab:culverts'] ? 1 : 0}`;
    for (const o of farm.objects) {
      if (o.kind === 'field') key += `|${o.id}:${o.variety ?? o.crop ?? ''}:${o.watered ? 1 : 0}:${o.crop ? stageOf(growth(farm, o), fieldState(farm, o) === 'ready') : ''}`;
      else if (o.kind === 'tree') key += `|${o.id}:${o.x},${o.z}:${treeLook(farm, o)}`;
      else if (isGreenhouse(o)) key += `|${o.id}:${o.x},${o.z},${o.rot}:${plotsOf(o).map(p => (p.crop ? `${p.variety ?? p.crop}${stageOf(plotGrowth(farm, p), plotState(farm, p) === 'ready')}` : '')).join(',')}`;
      else key += `|${o.id}:${o.x},${o.z},${o.rot}${isHome(o) && homeReady(farm, o) ? '!' : ''}`;
    }
    if (key === this.key) return;
    this.key = key;
    this.version++;
    for (const l of this.layers.values()) l.begin();
    this.boxes = [];
    this.ready = [];
    for (const o of farm.objects) {
      if (o.id === this.hiddenId) continue;
      const y = tileAt(o.x, o.z).level * STEP_Y;
      if (o.kind === 'field') {
        const cx = o.x + 0.5, cz = o.z + 0.5;
        this.layer(o.watered ? 'soil:wet' : 'soil:dry', () => soilModel(o.watered), false).push(cx, y, cz);
        if (o.crop) {
          const crop = CROP[o.crop];
          if (!crop) continue;
          const ready = fieldState(farm, o) === 'ready';
          const stage = stageOf(growth(farm, o), ready);
          // a variety is the same plant with its own colour of crop
          const v = o.variety ? VARIETY[o.variety] : undefined;
          const look = v ? { ...crop, color: { ...crop.color, crop: v.color } } : crop;
          this.layer(`crop:${v?.id ?? crop.id}:${stage}`, () => cropModel(look, stage)).push(cx, y + 0.06, cz, ((o.x * 7 + o.z * 3) % 3 - 1) * 0.04);
          if (ready) this.ready.push({ x: o.x, z: o.z, y });
          if (ready && this.badges) this.layer('badge', readyBadge, false).push(cx, y + 0.9, cz, 0);
        }
        continue;
      }
      if (o.kind === 'decor') {
        const d = DECOR_BY_ID[o.def];
        if (!d) continue;
        if (d.paint && (o.def === 'fence' || o.def === 'picket' || o.def === 'hedge')) {
          // fences join up with their neighbours of the same kind
          const same = (x: number, z: number) => farm.objects.some(n => n.kind === 'decor' && n.def === o.def && n.x === x && n.z === z);
          const mask = (same(o.x, o.z - 1) ? 1 : 0) | (same(o.x + 1, o.z) ? 2 : 0) | (same(o.x, o.z + 1) ? 4 : 0) | (same(o.x - 1, o.z) ? 8 : 0);
          this.layer(`fence:${o.def}:${mask}`, () => fencePiece(o.def, mask)).push(o.x + 0.5, y, o.z + 0.5, 0);
        } else if (CORNER_DECOR.has(o.def)) {
          const fw = o.rot % 2 ? d.d : d.w, fd = o.rot % 2 ? d.w : d.d;
          q.setFromAxisAngle(up, (-o.rot * Math.PI) / 2);
          m.compose(v.set(o.x + fw / 2, y, o.z + fd / 2), q, one);
          m.multiply(pre.makeTranslation(-d.w / 2, 0, -d.d / 2));
          this.layer(`decor:${o.def}`, () => decorModel(o.def)).pushMatrix(m);
        } else this.layer(`decor:${o.def}`, () => decorModel(o.def)).push(o.x + 0.5, y, o.z + 0.5, (-o.rot * Math.PI) / 2);
        if (!locked(o)) this.boxes.push({ min: [o.x, y, o.z], max: [o.x + (o.rot % 2 ? d.d : d.w), y + d.height, o.z + (o.rot % 2 ? d.w : d.d)], tile: { x: o.x, z: o.z } });
        continue;
      }
      if (o.kind === 'tree') {
        const def = TREE[o.def];
        if (!def) continue;
        const look = treeLook(farm, o);
        // orchard trees stand tall and full (a little over their tile); bushes fit theirs
        this.layer(`tree:${def.id}:${look}`, () => treeModel(def, look)).push(o.x + 0.5, y, o.z + 0.5, ((o.x * 5 + o.z * 3) % 7) * 0.4, def.kind === 'bush' ? 1.15 : 1.3);
        if (look === 'ripe') this.ready.push({ x: o.x, z: o.z, y: y + (def.kind === 'bush' ? 0.05 : 0.6) });
        if (!locked(o)) this.boxes.push({ min: [o.x, y, o.z], max: [o.x + 1, y + (def.kind === 'bush' ? 0.7 : 1.95), o.z + 1], tile: { x: o.x, z: o.z } });
        continue;
      }
      const machine = MACHINE[o.def];
      const make = o.kind === 'debris' ? DEBRIS_MODELS[o.def] : machine ? () => workshop(machine) : BUILDING_MODELS[o.def];
      const size = sizeOf(o);
      const geo = make ?? (() => placeholder(size.w, size.d));
      const fw = o.rot % 2 ? size.d : size.w, fd = o.rot % 2 ? size.w : size.d;
      // models are built from their north-west corner; turn them about the footprint's middle
      q.setFromAxisAngle(up, (-o.rot * Math.PI) / 2);
      m.compose(v.set(o.x + fw / 2, y, o.z + fd / 2), q, one);
      pre.makeTranslation(-size.w / 2, 0, -size.d / 2);
      m.multiply(pre);
      this.layer(`${o.kind}:${o.def}`, geo, o.kind !== 'debris' || o.def !== 'weeds').pushMatrix(m);
      if (isGreenhouse(o)) {
        // the glass, and a crop on each planted bed
        this.layer(`glass:${o.def}`, () => greenhouseGlass(size.w, size.d), false).pushMatrix(m);
        const beds = bedTiles(size.w, size.d);
        plotsOf(o).forEach((p, i) => {
          const bed = beds[i];
          if (!p.crop || !bed) return;
          const crop = CROP[p.crop];
          if (!crop) return;
          const v = p.variety ? VARIETY[p.variety] : undefined;
          const look = v ? { ...crop, color: { ...crop.color, crop: v.color } } : crop;
          const stage = stageOf(plotGrowth(farm, p), plotState(farm, p) === 'ready');
          const at = new THREE.Vector3(bed[0] + 0.5, BED_Y, bed[1] + 0.5).applyMatrix4(m);
          this.layer(`crop:${v?.id ?? crop.id}:${stage}`, () => cropModel(look, stage)).push(at.x, at.y, at.z, 0, 0.75);
        });
      }
      const h = BUILDING[o.def]?.height ?? (o.kind === 'debris' ? 0.35 : 1);

      if (!locked(o)) this.boxes.push({ min: [o.x, y, o.z], max: [o.x + fw, y + h, o.z + fd], tile: { x: o.x, z: o.z } });
    }
    // paths: flat stones on the ground; channels: trenches that join up, with water when wet
    const wet = wetMap(farm);
    for (let i = 0; i < farm.paths.length; i++) {
      const id = farm.paths.charCodeAt(i) - 48;
      if (id <= 0) continue;
      const x = i % W, z = Math.floor(i / W);
      const y = tileAt(x, z).level * STEP_Y;
      if (id === CHANNEL) {
        const joins = (nx: number, nz: number) => channelAt(farm, nx, nz) || (nx >= 0 && nz >= 0 && nx < W && nz < H && tileAt(nx, nz).water);
        const mask = (joins(x, z - 1) ? 1 : 0) | (joins(x + 1, z) ? 2 : 0) | (joins(x, z + 1) ? 4 : 0) | (joins(x - 1, z) ? 8 : 0);
        const isWet = wet[i] === 1;
        this.layer(`channel:${mask}:${isWet ? 1 : 0}`, () => channelPiece(mask, isWet), false).push(x + 0.5, y, z + 0.5, 0);
        continue;
      }
      this.layer(`path:${id}`, () => pathTile(id), false).push(x + 0.5, y, z + 0.5, 0);
    }
    for (const l of this.layers.values()) l.end();
  }
}

/** One painted path tile: a slightly raised slab (stone and brick ones in a pattern). */
function pathTile(id: number): THREE.BufferGeometry {
  const def = PATHS.find(p => p.id === id)!;
  if (id === 1) return merge([part(box(1, 0.025, 1), def.color, { pos: [0, 0.012, 0] })]);
  const parts = [part(box(1, 0.02, 1), 0xa59f94, { pos: [0, 0.01, 0] })];
  const n = id === 2 ? 2 : 3;
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) parts.push(part(box(1 / n - 0.06, 0.03, 1 / n - 0.06), def.color, { pos: [(a + 0.5) / n - 0.5 + (id === 3 && b % 2 ? 0.08 : 0), 0.025, (b + 0.5) / n - 0.5] }));
  return merge(parts);
}

/** Is this thing on land that isn't open yet? */
export const onLockedLand = (farm: Farm) => (o: Obj) => {
  const a = areaAt(o.x, o.z);
  return !!a && !farm.unlocked.includes(a);
};

export const buildingName = (def: string) => BUILDING[def]?.name ?? def;
