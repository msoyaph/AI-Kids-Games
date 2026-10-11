import * as THREE from 'three';
import type { ItemId } from '../data/types';
import { ITEM_MODELS } from '../data/itemModels';
import { buildRecipe } from './lowpoly';
import { Materials } from './materials';
import { ItemState, type ItemSystem } from '../sim/items/itemSystem';
import type { World } from '../sim/world';
import type { KartVisual } from './kartModel';
import type { SimEvent } from '../sim/events';
import type { Effects } from './effects';

const geoCache = new Map<string, THREE.BufferGeometry>();
function geo(key: string): THREE.BufferGeometry {
  let g = geoCache.get(key);
  if (!g) {
    const recipe = (ITEM_MODELS as Record<string, Parameters<typeof buildRecipe>[0]>)[key];
    g = buildRecipe(recipe ?? []);
    g.userData.shared = true;
    geoCache.set(key, g);
  }
  return g;
}

const POD_COLORS = [0xff6fae, 0xffd23f, 0x4ce0d2, 0xb47bff, 0x8cff6b];

/** Renders item pods, item entities (pooled meshes per type), telegraph rings, rockets and magnets. */
export class ItemVisuals {
  readonly group = new THREE.Group();
  readonly pods: THREE.InstancedMesh;
  private readonly pools = new Map<ItemId, THREE.Mesh[]>();
  private readonly rings: THREE.Mesh[] = [];
  private readonly rockets: THREE.Mesh[] = [];
  private readonly magnets: THREE.Mesh[] = [];
  private readonly tmpM = new THREE.Matrix4();
  private readonly tmpQ = new THREE.Quaternion();
  private readonly tmpE = new THREE.Euler();
  private readonly tmpP = new THREE.Vector3();
  private readonly tmpS = new THREE.Vector3();
  private readonly podScale: Float32Array;
  private time = 0;

  constructor(
    readonly items: ItemSystem,
    readonly world: World,
    readonly visuals: KartVisual[],
    private readonly effects: Effects,
  ) {
    const n = Math.max(1, items.boxes.length);
    this.pods = new THREE.InstancedMesh(geo('pod'), Materials.basicInst, n);
    this.pods.frustumCulled = false;
    this.podScale = new Float32Array(n).fill(1);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      c.setHex(POD_COLORS[i % POD_COLORS.length]);
      this.pods.setColorAt(i, c.lerp(new THREE.Color(0xffffff), 0.15));
    }
    if (this.pods.instanceColor) this.pods.instanceColor.needsUpdate = true;
    this.group.add(this.pods);
    // rockets and magnets attach to karts
    for (const v of visuals) {
      const r = new THREE.Mesh(geo('rocket'), Materials.flat);
      r.visible = false;
      v.body.add(r);
      this.rockets.push(r);
      const m = new THREE.Mesh(geo('magnetHat'), Materials.flat);
      m.visible = false;
      v.body.add(m);
      this.magnets.push(m);
    }
  }

  private take(type: ItemId, used: Map<ItemId, number>): THREE.Mesh {
    let pool = this.pools.get(type);
    if (!pool) this.pools.set(type, (pool = []));
    const idx = used.get(type) ?? 0;
    used.set(type, idx + 1);
    if (idx >= pool.length) {
      const m = new THREE.Mesh(geo(type), type === 'cloud' ? Materials.smooth : Materials.flat);
      this.group.add(m);
      pool.push(m);
    }
    const m = pool[idx];
    m.visible = true;
    return m;
  }

  private readonly used = new Map<ItemId, number>();

  update(dt: number): void {
    this.time += dt;
    const t = this.time;
    // pods
    const boxes = this.items.boxes;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      const target = b.respawn > 0 ? 0 : 1;
      const s = this.podScale[i] + (target - this.podScale[i]) * Math.min(1, dt * (target ? 5 : 30));
      this.podScale[i] = s;
      this.tmpE.set(0.3 * Math.sin(t + i), t * 1.6 + i, 0);
      this.tmpQ.setFromEuler(this.tmpE);
      this.tmpP.set(b.x, b.y + Math.sin(t * 2.2 + i * 0.7) * 0.2, b.z);
      this.tmpS.setScalar(Math.max(0.001, s));
      this.tmpM.compose(this.tmpP, this.tmpQ, this.tmpS);
      this.pods.setMatrixAt(i, this.tmpM);
    }
    this.pods.instanceMatrix.needsUpdate = true;

    // entities
    this.used.clear();
    for (const pool of this.pools.values()) for (const m of pool) m.visible = false;
    let ringIdx = 0;
    for (const e of this.items.entities) {
      if (!e.active) continue;
      if (e.type === 'cloud' && e.radius === 0) {
        // harmless puff
      }
      const m = this.take(e.type, this.used);
      m.position.set(e.x, e.y, e.z);
      m.rotation.set(0, e.yaw, 0);
      m.scale.setScalar(1);
      switch (e.type) {
        case 'bumperBall':
          m.rotation.set(t * 8, e.yaw, 0);
          if (e.state === ItemState.Trailing) m.position.y += 0.25;
          break;
        case 'paperPlane': {
          const bank = e.state === ItemState.Dive ? 0.4 : Math.sin(t * 3) * 0.2;
          m.rotation.set(e.state === ItemState.Dive ? 0.35 : 0, e.yaw, bank, 'YXZ');
          break;
        }
        case 'gooPuddle': {
          const wob = 1 + Math.sin(t * 6 + e.serial) * 0.05;
          m.scale.set(wob, 1 / wob, wob);
          if (e.state === ItemState.Trailing) m.scale.multiplyScalar(0.55);
          if (e.state === ItemState.Lobbed) m.scale.multiplyScalar(0.5);
          break;
        }
        case 'springTrap':
          if (e.state === ItemState.Trailing || e.state === ItemState.Lobbed) m.scale.setScalar(0.6);
          break;
        case 'popper':
          m.rotation.set(t * 9, e.yaw, 0);
          if (e.state === ItemState.Lobbed) {
            // telegraph ring at the landing spot
            let ring = this.rings[ringIdx];
            if (!ring) {
              ring = new THREE.Mesh(geo('ring'), Materials.basic);
              this.group.add(ring);
              this.rings.push(ring);
            }
            ring.visible = true;
            ring.position.set(e.lx, (e.ground.hit ? e.ground.height : e.ly) + 0.08, e.lz);
            const pulse = 1 + Math.sin(t * 14) * 0.05;
            ring.scale.setScalar(pulse);
            ringIdx++;
          }
          break;
        case 'tornado': {
          const grow = e.state === ItemState.Windup ? Math.min(1, e.age / 0.65) * 0.6 : 1;
          m.scale.set(grow, grow * (1 + Math.sin(t * 20) * 0.05), grow);
          m.rotation.set(0, t * 14, 0);
          break;
        }
        case 'cloud':
          m.rotation.set(0, e.yaw, Math.sin(t * 4 + e.serial) * 0.15);
          break;
        default:
          break;
      }
    }
    for (let i = ringIdx; i < this.rings.length; i++) this.rings[i].visible = false;
    // rockets & magnets
    for (let i = 0; i < this.world.karts.length; i++) {
      const k = this.world.karts[i];
      this.rockets[i].visible = k.rocketTime > 0;
      this.magnets[i].visible = k.magnetTime > 0;
      if (k.magnetTime > 0) this.magnets[i].rotation.y = Math.sin(t * 10) * 0.2;
    }
  }

  onEvent(e: SimEvent): void {
    switch (e.type) {
      case 'boxBreak':
        this.effects.burst(e.x, e.y, e.z, 14, POD_COLORS[Math.floor(Math.random() * POD_COLORS.length)], 6, 0.45, 0.5, true, 4);
        break;
      case 'explode': {
        const col = e.item === 'popper' ? 0 : e.item === 'gooPuddle' ? 0xb34dff : e.item === 'springTrap' ? 0xffd23f : e.item === 'paperPlane' ? 0xffffff : 0xff4d6d;
        if (e.item === 'popper') {
          // confetti!
          for (const c of [0xff6fae, 0xffd23f, 0x4ce0d2, 0x8cff6b, 0xb47bff]) this.effects.burst(e.x, e.y + 0.6, e.z, 10, c, 11, 0.35, 1.2, false, 9);
        } else this.effects.burst(e.x, e.y + 0.5, e.z, 14, col, 6, 0.5, 0.45, true, 5);
        break;
      }
      case 'itemHit': {
        const k = this.world.karts[e.kart];
        if (e.effect === 'goo') this.effects.burst(k.x, k.y + 0.8, k.z, 12, 0xb34dff, 4, 0.5, 0.6, false, 8);
        else this.effects.burst(k.x, k.y + 1.2, k.z, 10, 0xffe45c, 5, 0.5, 0.6, true, 0);
        break;
      }
      case 'shieldPop':
      case 'blocked': {
        const k = this.world.karts[e.kart];
        this.effects.burst(k.x, k.y + 1, k.z, 14, 0x7fe7ff, 7, 0.45, 0.4, true, 2);
        break;
      }
      case 'dodge': {
        const k = this.world.karts[e.kart];
        this.effects.burst(k.x, k.y + 2, k.z, 10, 0xffffff, 6, 0.4, 0.5, true, 0);
        break;
      }
      default:
        break;
    }
  }
}
