import * as THREE from 'three';
import type { MapDef, MapPalette } from '../config/maps';
import type { PropKind, Structure, Terrain } from '../sim/terrain';
import { lowPolyMaterial } from './geo';
import { propGeometry } from './models';
import { fadeProps } from './occlusion';

/** Props big enough to hide the player: [radius, height] at scale 1 (dissolve when in the way). */
const OCCLUDERS: Partial<Record<PropKind, [number, number]>> = {
  pine: [1.5, 4.4],
  oak: [1.8, 4.0],
  rock: [1.4, 1.4],
  crystal: [0.8, 2.0],
  frostPine: [1.5, 4.5],
  birch: [1.0, 4.4],
  snowRock: [1.4, 1.6],
  iceCrystal: [0.8, 2.0],
};

/** Props that cast shadows (on High). */
const BIG: ReadonlySet<PropKind> = new Set<PropKind>(['pine', 'oak', 'rock', 'crystal', 'frostPine', 'birch', 'snowRock', 'iceCrystal']);

const tmpC = new THREE.Color();
const tmpC2 = new THREE.Color();

function hash2(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Small walk-through decoration (thinned on lighter tiers). */
const DECOR: ReadonlySet<PropKind> = new Set<PropKind>(['tuft', 'flower', 'snowTuft', 'mushroom', 'frostShrub']);

/** Builds all static map geometry for a terrain. `decor` = share of small decoration kept. */
export function buildWorldMesh(terrain: Terrain, map: MapDef, shadows: boolean, decor = 1): THREE.Group {
  const group = new THREE.Group();
  group.name = 'world';
  const ground = buildGround(terrain, map.palette);
  ground.receiveShadow = shadows;
  group.add(ground);
  const structs = buildStructures(terrain.structures, map.palette);
  structs.receiveShadow = shadows;
  structs.castShadow = shadows;
  group.add(structs);
  for (const m of buildProps(terrain, map.palette, shadows, decor)) group.add(m);
  if (terrain.ponds.length) {
    const ice = buildIce(terrain, map.palette);
    ice.receiveShadow = shadows;
    group.add(ice);
  }
  group.add(buildOuterSkirt(terrain, map.palette));
  return group;
}

/** Frozen ponds: glossy discs just above the flattened ground. */
function buildIce(t: Terrain, pal: MapPalette): THREE.Mesh {
  const geos: THREE.BufferGeometry[] = [];
  for (const p of t.ponds) {
    const g = new THREE.CircleGeometry(p.r * 0.86, 18);
    g.rotateX(-Math.PI / 2);
    g.translate(p.x, p.y + 0.05, p.z);
    const n = g.getAttribute('position').count;
    const col = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) {
      // lighter towards the middle, a frosty rim
      const dx = g.getAttribute('position').getX(k) - p.x;
      const dz = g.getAttribute('position').getZ(k) - p.z;
      const rim = Math.min(1, Math.hypot(dx, dz) / (p.r * 0.86));
      tmpC.setHex(pal.ice).lerp(tmpC2.setHex(0xffffff), rim * rim * 0.55);
      col[k * 3] = tmpC.r;
      col[k * 3 + 1] = tmpC.g;
      col[k * 3 + 2] = tmpC.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.deleteAttribute('uv');
    geos.push(g.toNonIndexed());
    g.dispose();
  }
  const merged = mergeTriangles(geos);
  const mesh = new THREE.Mesh(merged, new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 90, specular: 0x9fc8e8, flatShading: true, polygonOffset: true, polygonOffsetFactor: -1 }));
  mesh.name = 'ice';
  return mesh;
}

function mergeTriangles(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let n = 0;
  for (const g of geos) n += g.getAttribute('position').count;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.getAttribute('position').array as Float32Array, o * 3);
    col.set(g.getAttribute('color').array as Float32Array, o * 3);
    o += g.getAttribute('position').count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeVertexNormals();
  out.computeBoundingSphere();
  return out;
}

function buildGround(t: Terrain, pal: MapPalette): THREE.Mesh {
  const step = 2.5;
  const n = Math.ceil((t.half * 2 + 20) / step);
  const start = -t.half - 10;
  const heights = new Float32Array((n + 1) * (n + 1));
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const x = start + i * step;
      const z = start + j * step;
      // small deterministic jitter keeps it from looking like a grid
      heights[j * (n + 1) + i] = t.baseHeight(x, z) + (hash2(x, z) - 0.5) * 0.25;
    }
  }
  const pos = new Float32Array(n * n * 6 * 3);
  const col = new Float32Array(n * n * 6 * 3);
  const grassA = new THREE.Color(pal.groundA);
  const grassB = new THREE.Color(pal.groundB);
  const dry = new THREE.Color(pal.high);
  const dirt = new THREE.Color(pal.slope);
  const rock = new THREE.Color(pal.cliff);
  const drift = new THREE.Color(pal.drift);
  const surf = t.surface;
  let p = 0;
  const v = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const tri = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number): void => {
    a.set(ax, ay, az);
    b.set(bx, by, bz);
    c.set(cx, cy, cz);
    v.subVectors(c, b).cross(a.clone().sub(b)).normalize();
    const ny = Math.abs(v.y);
    const mx = (ax + bx + cx) / 3;
    const mz = (az + bz + cz) / 3;
    const my = (ay + by + cy) / 3;
    const noise = t.noise.sample(mx * 0.04 + 100, mz * 0.04 - 50) * 0.5 + 0.5;
    tmpC.copy(grassA).lerp(grassB, noise);
    tmpC.lerp(dry, Math.min(1, Math.max(0, (my - 4) / 10)) * 0.6);
    if (ny < 0.9) tmpC.lerp(dirt, Math.min(1, (0.9 - ny) * 5));
    if (ny < 0.75) tmpC.lerp(rock, Math.min(1, (0.75 - ny) * 4));
    if (surf && surf[t.cellOf(mx, mz)] === 2) tmpC.lerp(drift, 0.7);
    const j = 0.94 + hash2(mx, mz) * 0.12;
    tmpC.multiplyScalar(j);
    const verts = [ax, ay, az, bx, by, bz, cx, cy, cz];
    for (let k = 0; k < 9; k++) pos[p * 3 + k] = verts[k];
    for (let k = 0; k < 3; k++) {
      col[p * 3 + k * 3] = tmpC.r;
      col[p * 3 + k * 3 + 1] = tmpC.g;
      col[p * 3 + k * 3 + 2] = tmpC.b;
    }
    p += 3;
  };
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x0 = start + i * step;
      const z0 = start + j * step;
      const x1 = x0 + step;
      const z1 = z0 + step;
      const h00 = heights[j * (n + 1) + i];
      const h10 = heights[j * (n + 1) + i + 1];
      const h01 = heights[(j + 1) * (n + 1) + i];
      const h11 = heights[(j + 1) * (n + 1) + i + 1];
      if ((i + j) % 2 === 0) {
        tri(x0, h00, z0, x0, h01, z1, x1, h10, z0);
        tri(x1, h10, z0, x0, h01, z1, x1, h11, z1);
      } else {
        tri(x0, h00, z0, x0, h01, z1, x1, h11, z1);
        tri(x0, h00, z0, x1, h11, z1, x1, h10, z0);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, lowPolyMaterial());
  mesh.name = 'ground';
  return mesh;
}

class TriWriter {
  pos: number[] = [];
  col: number[] = [];
  quad(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, color: number, jitter = 0.05): void {
    this.tri(p0, p1, p2, color, jitter);
    this.tri(p0, p2, p3, color, jitter);
  }
  tri(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: number, jitter = 0.05): void {
    tmpC2.setHex(color).multiplyScalar(1 + (Math.random() * 2 - 1) * jitter);
    for (const v of [a, b, c]) {
      this.pos.push(v.x, v.y, v.z);
      this.col.push(tmpC2.r, tmpC2.g, tmpC2.b);
    }
  }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
}

function buildStructures(structs: Structure[], pal: MapPalette): THREE.Mesh {
  const w = new TriWriter();
  const corner = (s: Structure, u: number, v: number, y: number): THREE.Vector3 =>
    new THREE.Vector3(s.x + u * s.cos - v * s.sin, y, s.z + u * s.sin + v * s.cos);
  for (const s of structs) {
    if (s.kind === 'mesa') {
      const top = s.y0;
      const mid = s.baseY + (top - s.baseY) * 0.55;
      const c = [
        [-s.hu, -s.hv],
        [s.hu, -s.hv],
        [s.hu, s.hv],
        [-s.hu, s.hv],
      ];
      // top (counter-clockwise seen from above → normal up)
      w.quad(corner(s, c[0][0], c[0][1], top), corner(s, c[3][0], c[3][1], top), corner(s, c[2][0], c[2][1], top), corner(s, c[1][0], c[1][1], top), pal.mesaTop, 0.06);
      for (let k = 0; k < 4; k++) {
        const [u0, v0] = c[k];
        const [u1, v1] = c[(k + 1) % 4];
        w.quad(corner(s, u0, v0, top), corner(s, u1, v1, top), corner(s, u1, v1, mid), corner(s, u0, v0, mid), pal.mesaWall[k % 2], 0.04);
        w.quad(corner(s, u0, v0, mid), corner(s, u1, v1, mid), corner(s, u1, v1, s.baseY), corner(s, u0, v0, s.baseY), pal.mesaBase[k % 2], 0.04);
        // grassy lip
        w.quad(corner(s, u0 * 1.02, v0 * 1.02, top + 0.15), corner(s, u1 * 1.02, v1 * 1.02, top + 0.15), corner(s, u1 * 1.02, v1 * 1.02, top - 0.35), corner(s, u0 * 1.02, v0 * 1.02, top - 0.35), pal.mesaLip, 0.05);
      }
    } else {
      // ramp: wooden planks across u
      const planks = Math.max(3, Math.round(s.hu * 2 / 0.9));
      for (let i = 0; i < planks; i++) {
        const ua = -s.hu + (i / planks) * s.hu * 2;
        const ub = -s.hu + ((i + 1) / planks) * s.hu * 2;
        const ya = s.y0 + ((ua + s.hu) / (2 * s.hu)) * (s.y1 - s.y0);
        const yb = s.y0 + ((ub + s.hu) / (2 * s.hu)) * (s.y1 - s.y0);
        w.quad(corner(s, ua, -s.hv, ya + 0.02), corner(s, ua, s.hv, ya + 0.02), corner(s, ub, s.hv, yb + 0.02), corner(s, ub, -s.hv, yb + 0.02), pal.plank[i % 2], 0.04);
      }
      // sides
      for (const v of [-s.hv, s.hv]) {
        const a = corner(s, -s.hu, v, s.y0);
        const b = corner(s, s.hu, v, s.y1);
        const c = corner(s, s.hu, v, s.baseY);
        const d = corner(s, -s.hu, v, s.baseY);
        if (v < 0) w.quad(a, b, c, d, pal.rampSide, 0.03);
        else w.quad(d, c, b, a, pal.rampSide, 0.03);
      }
      // high end face and low end face
      w.quad(corner(s, s.hu, -s.hv, s.y1), corner(s, s.hu, s.hv, s.y1), corner(s, s.hu, s.hv, s.baseY), corner(s, s.hu, -s.hv, s.baseY), pal.rampEnd, 0.03);
      w.quad(corner(s, -s.hu, s.hv, s.y0), corner(s, -s.hu, -s.hv, s.y0), corner(s, -s.hu, -s.hv, s.baseY), corner(s, -s.hu, s.hv, s.baseY), pal.rampEnd, 0.03);
      // guard rails on kickers make the lip readable
      if (s.y1 - s.y0 < 4) {
        for (const v of [-s.hv, s.hv]) {
          const lip0 = corner(s, s.hu - 0.25, v, s.y1 + 0.35);
          const lip1 = corner(s, s.hu, v, s.y1 + 0.35);
          const lip2 = corner(s, s.hu, v, s.y1);
          const lip3 = corner(s, s.hu - 0.25, v, s.y1);
          w.quad(lip0, lip1, lip2, lip3, 0xffd34d, 0);
        }
        w.quad(corner(s, s.hu, -s.hv, s.y1 + 0.06), corner(s, s.hu, s.hv, s.y1 + 0.06), corner(s, s.hu - 0.3, s.hv, s.y1 + 0.06), corner(s, s.hu - 0.3, -s.hv, s.y1 + 0.06), 0xffd34d, 0);
      }
    }
  }
  const mat = lowPolyMaterial();
  mat.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(w.build(), mat);
  mesh.name = 'structures';
  return mesh;
}

function buildProps(t: Terrain, pal: MapPalette, shadows: boolean, decor: number): THREE.InstancedMesh[] {
  const byKind = new Map<PropKind, typeof t.props>();
  let k = 0;
  for (const p of t.props) {
    // thin small decoration evenly (render-only: never touches collision or the sim)
    if (DECOR.has(p.kind) && decor < 1 && ((k++ * 0.618034) % 1) >= decor) continue;
    let arr = byKind.get(p.kind);
    if (!arr) byKind.set(p.kind, (arr = []));
    arr.push(p);
  }
  const meshes: THREE.InstancedMesh[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (const [kind, list] of byKind) {
    const geo = propGeometry(kind);
    const mat = lowPolyMaterial();
    const occ = OCCLUDERS[kind];
    if (occ) fadeProps(mat, occ[0], occ[1]);
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    mesh.name = `prop:${kind}`;
    mesh.castShadow = shadows && BIG.has(kind);
    mesh.receiveShadow = shadows && (kind === 'rock' || kind === 'snowRock');
    list.forEach((p, i) => {
      q.setFromAxisAngle(up, p.rot);
      s.setScalar(p.scale);
      pos.set(p.x, p.y - 0.05, p.z);
      m.compose(pos, q, s);
      mesh.setMatrixAt(i, m);
      if (kind === 'flower') mesh.setColorAt(i, tmpC.setHex(pal.flowers[i % pal.flowers.length]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    meshes.push(mesh);
  }
  return meshes;
}

/** Ring of hills beyond the playable map so the horizon never shows the void. */
function buildOuterSkirt(t: Terrain, pal: MapPalette): THREE.Mesh {
  const geo = new THREE.RingGeometry(t.half * 1.1, t.half * 5, 24, 3);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    pos.setY(i, 14 + Math.min(40, (r - t.half) * 0.12) + Math.sin(x * 0.02) * 6 + Math.cos(z * 0.017) * 6);
  }
  const g = geo.toNonIndexed();
  geo.dispose();
  const n = g.getAttribute('position').count;
  const col = new Float32Array(n * 3);
  for (let f = 0; f < n; f += 3) {
    tmpC.setHex(pal.skirt).multiplyScalar(0.85 + Math.random() * 0.15);
    for (let k = 0; k < 3; k++) {
      col[(f + k) * 3] = tmpC.r;
      col[(f + k) * 3 + 1] = tmpC.g;
      col[(f + k) * 3 + 2] = tmpC.b;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, lowPolyMaterial());
  mesh.name = 'skirt';
  return mesh;
}
