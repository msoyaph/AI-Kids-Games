import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  Euler,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Theme } from '../../data/themes';
import type { LevelModel } from '../../systems/level';
import { buildBackTerrain, buildTileMesh, surfaceSpots, TILE_LAYERS, type MeshData, type TileLayer } from '../../systems/tileMesh';
import { markShared } from '../dispose';
import { gooMaterial, isZephyra, terrainMaterial } from './look';

/** Wraps mesher output in a BufferGeometry. `shade` becomes a grey vertex color (or the goo wobble flag). */
export function meshGeometry(d: MeshData, shadeAs: 'color' | 'wobble' = 'color'): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(d.pos, 3));
  g.setAttribute('normal', new BufferAttribute(d.nrm, 3));
  g.setAttribute('uv', new BufferAttribute(d.uv, 2));
  if (shadeAs === 'wobble') g.setAttribute('aWobble', new BufferAttribute(d.shade, 1));
  else {
    const c = new Float32Array(d.shade.length * 3);
    for (let i = 0; i < d.shade.length; i++) c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = d.shade[i];
    g.setAttribute('color', new BufferAttribute(c, 3));
  }
  g.setIndex(new BufferAttribute(d.idx, 1));
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

/**
 * The walkable level in 3D: one mesh per terrain layer (a handful of draw calls for the whole
 * level) plus rolling ground behind the play slab. Geometry belongs to the scene; materials are
 * shared per theme (except the animated goo).
 */
export class LevelTerrain {
  readonly group = new Group();
  readonly meshes: Partial<Record<TileLayer, Mesh>> = {};
  readonly back: Mesh;
  private readonly gooTime: { value: number } | null = null;

  constructor(model: LevelModel, th: Theme, opts: { shadows: boolean; seed: number }) {
    const data = buildTileMesh(model);
    for (const layer of TILE_LAYERS) {
      const d = data[layer];
      if (!d.idx.length) continue;
      let mat: Material;
      if (layer === 'goo') {
        const gm = gooMaterial(th);
        mat = gm.material;
        this.gooTime = gm.time;
      } else mat = terrainMaterial(th, layer);
      const mesh = new Mesh(meshGeometry(d, layer === 'goo' ? 'wobble' : 'color'), mat);
      mesh.receiveShadow = opts.shadows && layer !== 'goo' && layer !== 'trim';
      mesh.castShadow = opts.shadows && (layer === 'platform' || layer === 'rock' || layer === 'ice');
      if (layer === 'goo') mesh.renderOrder = 2;
      this.meshes[layer] = mesh;
      this.group.add(mesh);
    }
    const clouds = th.midStyle === 'clouds';
    this.back = new Mesh(meshGeometry(buildBackTerrain(model, { seed: opts.seed, sink: clouds ? 3.5 : 0, amp: clouds ? 3 : 5 })), terrainMaterial(th, 'back'));
    this.back.receiveShadow = opts.shadows;
    this.group.add(this.back);
    const bits = detailScatter(model, th, opts.seed);
    if (bits) {
      bits.castShadow = opts.shadows;
      this.group.add(bits);
    }
  }

  update(time: number): void {
    if (this.gooTime) this.gooTime.value = time;
  }
}

const bitGeos = new Map<string, BufferGeometry>();

/** One little detail shape per surface style (shared). */
function bitGeometry(kind: 'tuft' | 'pebble' | 'shard'): BufferGeometry {
  let g = bitGeos.get(kind);
  if (g) return g;
  if (kind === 'tuft') {
    const blades: BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) {
      const b = new ConeGeometry(0.035, 0.26 + (i % 3) * 0.06, 3, 1);
      b.translate(0, 0.13, 0);
      b.rotateZ((i - 2) * 0.28);
      b.rotateY(i * 1.3);
      blades.push(b);
    }
    g = mergeGeometries(blades)!;
    for (const b of blades) b.dispose();
  } else if (kind === 'pebble') {
    g = new IcosahedronGeometry(0.09, 0);
    g.scale(1.3, 0.6, 1);
    g.translate(0, 0.02, 0);
  } else {
    const parts = [new ConeGeometry(0.06, 0.34, 5, 1).translate(0, 0.17, 0), new ConeGeometry(0.045, 0.22, 5, 1).translate(0, 0.11, 0).rotateZ(0.5).translate(0.06, 0, 0)];
    g = mergeGeometries(parts)!;
    for (const b of parts) b.dispose();
  }
  markShared(g);
  bitGeos.set(kind, g);
  return g;
}

/** Grass tufts, pebbles or crystal shards along the open ground (one instanced draw). */
function detailScatter(model: LevelModel, th: Theme, seed: number): InstancedMesh | null {
  const s = th.surfaceStyle;
  if (s === 'metal') return null;
  const kind = s === 'grass' || s === 'moss' ? 'tuft' : s === 'crystal' || s === 'ice' ? 'shard' : 'pebble';
  const spots = surfaceSpots(model, seed, kind === 'pebble' ? 1.1 : 1.6);
  if (!spots.length) return null;
  const zeph = isZephyra(th);
  const color = kind === 'tuft' ? new Color(th.surface).multiplyScalar(0.85) : kind === 'shard' ? new Color(s === 'ice' ? '#d9f6ff' : th.rock) : new Color(th.ground2).lerp(new Color(th.surface), 0.35);
  const mat = new MeshStandardMaterial({
    color,
    roughness: kind === 'shard' ? 0.2 : 0.9,
    flatShading: kind !== 'tuft',
    emissive: kind === 'shard' || (kind === 'tuft' && zeph) ? color.clone().multiplyScalar(zeph ? 0.45 : 0.15) : new Color(0),
  });
  const im = new InstancedMesh(bitGeometry(kind), mat, spots.length);
  const m = new Matrix4();
  const q = new Quaternion();
  const e = new Euler();
  const p = new Vector3();
  const sc = new Vector3();
  spots.forEach((sp, i) => {
    e.set(0, sp.r, kind === 'shard' ? (sp.r - 3) * 0.12 : 0);
    q.setFromEuler(e);
    p.set(sp.x, sp.y - 0.01, sp.z);
    sc.setScalar(kind === 'tuft' ? sp.s * 1.1 : sp.s);
    m.compose(p, q, sc);
    im.setMatrixAt(i, m);
  });
  im.computeBoundingSphere();
  return im;
}
