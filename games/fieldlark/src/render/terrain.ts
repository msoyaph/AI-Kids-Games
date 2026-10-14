/**
 * The ground mesh: the farm's terrace tops and sides, and the countryside ring around it, as one
 * smooth-shaded mesh built once and cut into chunks that are culled to the view (its colours come from the painted-ground shader, so seasons and
 * opening land never rebuild it). Tiles near water are cut finer so their banks curve; the rest are
 * one quad each. Terrace sides are walls between levels, with the grass lip painted on.
 */
import * as THREE from 'three';
import { STEP_Y } from '../sim/map';
import { patchMaterial } from './fx';
import { GROUND_GLSL, groundUniforms } from './ground';
import { landTile, SPAN, vertexY, waterSdf, WORLD0 } from './land';

const groundMaterial = patchMaterial(new THREE.MeshLambertMaterial({ color: 0xffffff }), {
  key: 'ground',
  uniforms: groundUniforms,
  declarations: `${GROUND_GLSL}\nvarying vec3 vFxNormal;\nvarying float vTop;`,
  vertexDeclarations: 'attribute float top;\nvarying vec3 vFxNormal;\nvarying float vTop;',
  vertex: 'vFxNormal = normalize(mat3(modelMatrix) * objectNormal);\nvTop = top;',
  color: 'diffuseColor.rgb = groundColor(vFxWorld, normalize(vFxNormal), vTop);',
  normal: /* glsl */ `
    #ifdef GROUND_BUMPS
    {
      // little lumps in the light (not in the shape): grass tussocks and soft ground
      vec2 bp = vFxWorld.xz;
      float e = 0.07;
      float h0 = fxNoise(bp * 2.3) * 0.6 + fxNoise(bp * 5.3) * 0.4;
      float hx = fxNoise((bp + vec2(e, 0.0)) * 2.3) * 0.6 + fxNoise((bp + vec2(e, 0.0)) * 5.3) * 0.4;
      float hz = fxNoise((bp + vec2(0.0, e)) * 2.3) * 0.6 + fxNoise((bp + vec2(0.0, e)) * 5.3) * 0.4;
      vec3 gw = vec3(-(hx - h0), 0.0, -(hz - h0)) / e * 0.06 * smoothstep(0.7, 0.95, vFxNormal.y);
      normal = normalize(normal + (viewMatrix * vec4(gw, 0.0)).xyz);
    }
    #endif`,
});
groundMaterial.userData.shared = true;
groundMaterial.defines = {};
groundMaterial.customProgramCacheKey = () => ('GROUND_BUMPS' in groundMaterial.defines! ? 'ground+b' : 'ground');

/** Little lumps in the ground's lighting (Medium and High). */
export function setGroundBumps(on: boolean) {
  const has = 'GROUND_BUMPS' in groundMaterial.defines!;
  if (on === has) return;
  if (on) groundMaterial.defines!.GROUND_BUMPS = '';
  else delete groundMaterial.defines!.GROUND_BUMPS;
  groundMaterial.needsUpdate = true;
}

/** The ground is cut into CHUNKS × CHUNKS meshes, each culled on its own: only the ground near the view is drawn. */
const CHUNKS = 4;

export function buildTerrain(): THREE.Group {
  const pos: number[] = [], top: number[] = [], idx: number[] = [];
  const shared = new Map<string, number>();
  /** Tops share vertices (smooth shading across tiles); walls get their own. */
  const topVertex = (x: number, y: number, z: number) => {
    const key = `${Math.round(x * 64)},${Math.round(y * 512)},${Math.round(z * 64)}`;
    let i = shared.get(key);
    if (i === undefined) { i = pos.length / 3; pos.push(x, y, z); top.push(y); shared.set(key, i); }
    return i;
  };
  const wallVertex = (x: number, y: number, z: number, t: number) => { pos.push(x, y, z); top.push(t); return pos.length / 3 - 1; };
  const levelOf = (x: number, z: number) => {
    if (x < WORLD0 || z < WORLD0 || x >= WORLD0 + SPAN || z >= WORLD0 + SPAN) return null;
    const t = landTile(x, z);
    return t.water ? 0 : t.level;
  };

  for (let z = WORLD0; z < WORLD0 + SPAN; z++) {
    for (let x = WORLD0; x < WORLD0 + SPAN; x++) {
      const L = levelOf(x, z)!;
      const n = waterSdf(x + 0.5, z + 0.5) < 1.6 ? 4 : 1;
      const grid: number[] = [];
      for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
        const px = x + i / n, pz = z + j / n;
        grid.push(topVertex(px, vertexY(L, px, pz), pz));
      }
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const a = grid[j * (n + 1) + i]!, b = grid[(j + 1) * (n + 1) + i]!, c = grid[(j + 1) * (n + 1) + i + 1]!, d = grid[j * (n + 1) + i + 1]!;
        idx.push(a, b, c, a, c, d);
      }
      // walls where the neighbour is lower, and a skirt round the world's edge
      const sides: [number, number, [number, number], [number, number]][] = [
        [x, z - 1, [x + 1, z], [x, z]], // north, facing -z
        [x, z + 1, [x, z + 1], [x + 1, z + 1]], // south, facing +z
        [x - 1, z, [x, z], [x, z + 1]], // west, facing -x
        [x + 1, z, [x + 1, z + 1], [x + 1, z]], // east, facing +x
      ];
      for (const [nx, nz, a, b] of sides) {
        const nl = levelOf(nx, nz);
        if (nl !== null && nl >= L) continue;
        for (let s = 0; s < n; s++) {
          const ax = a[0] + ((b[0] - a[0]) * s) / n, az = a[1] + ((b[1] - a[1]) * s) / n;
          const bx = a[0] + ((b[0] - a[0]) * (s + 1)) / n, bz = a[1] + ((b[1] - a[1]) * (s + 1)) / n;
          const ta = vertexY(L, ax, az), tb = vertexY(L, bx, bz);
          const ba = nl === null ? ta - 4 : ta - (L - nl) * STEP_Y, bb = nl === null ? tb - 4 : tb - (L - nl) * STEP_Y;
          const v0 = wallVertex(ax, ta, az, ta), v1 = wallVertex(ax, ba, az, ta), v2 = wallVertex(bx, bb, bz, tb), v3 = wallVertex(bx, tb, bz, tb);
          idx.push(v0, v1, v2, v0, v2, v3);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('top', new THREE.Float32BufferAttribute(top, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  // normals are worked out on the whole ground first, so the chunks meet without seams
  const nor = g.getAttribute('normal').array as Float32Array;
  const size = SPAN / CHUNKS;
  const buckets: number[][] = Array.from({ length: CHUNKS * CHUNKS }, () => []);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t]!, b = idx[t + 1]!, c = idx[t + 2]!;
    const cx = (pos[a * 3]! + pos[b * 3]! + pos[c * 3]!) / 3, cz = (pos[a * 3 + 2]! + pos[b * 3 + 2]! + pos[c * 3 + 2]!) / 3;
    const i = Math.min(CHUNKS - 1, Math.max(0, Math.floor((cx - WORLD0) / size))), j = Math.min(CHUNKS - 1, Math.max(0, Math.floor((cz - WORLD0) / size)));
    buckets[j * CHUNKS + i]!.push(a, b, c);
  }
  const group = new THREE.Group();
  group.name = 'terrain';
  for (const tris of buckets) {
    if (!tris.length) continue;
    const remap = new Map<number, number>();
    const p2: number[] = [], n2: number[] = [], t2: number[] = [], i2: number[] = [];
    for (const v of tris) {
      let k = remap.get(v);
      if (k === undefined) {
        k = p2.length / 3; remap.set(v, k);
        p2.push(pos[v * 3]!, pos[v * 3 + 1]!, pos[v * 3 + 2]!);
        n2.push(nor[v * 3]!, nor[v * 3 + 1]!, nor[v * 3 + 2]!);
        t2.push(top[v]!);
      }
      i2.push(k);
    }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(p2, 3));
    cg.setAttribute('normal', new THREE.Float32BufferAttribute(n2, 3));
    cg.setAttribute('top', new THREE.Float32BufferAttribute(t2, 1));
    cg.setIndex(i2);
    cg.computeBoundingSphere();
    cg.computeBoundingBox();
    const mesh = new THREE.Mesh(cg, groundMaterial);
    mesh.receiveShadow = true;
    // culled by its box (much tighter than a sphere for a wide, flat piece of ground): cullTerrain
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  g.dispose();
  return group;
}

/** Show only the ground chunks whose box touches the view (called when the camera moves). */
export function cullTerrain(group: THREE.Group, frustum: THREE.Frustum) {
  for (const c of group.children as THREE.Mesh[]) c.visible = frustum.intersectsBox(c.geometry.boundingBox!);
}
