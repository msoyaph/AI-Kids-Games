/**
 * The ground mesh: the town's flat tiles, the beach and the bay's bed, and the countryside around, as
 * one smooth-shaded mesh built once and cut into chunks culled to the view. Its colours come from
 * the painted-ground shader (ground.ts), so roads, lots and seasons never rebuild it. Tiles near the
 * shore are cut finer, so the beach curves; the rest are one quad each.
 * (Structure from games/fieldlark/src/render/terrain.ts, without the farm's terraces.)
 */
import * as THREE from 'three';
import { patchMaterial } from './fx';
import { GROUND_GLSL, groundUniforms } from './ground';
import { groundY, nearShore, SPAN, WORLD0 } from './land';

const groundMaterial = patchMaterial(new THREE.MeshLambertMaterial({ color: 0xffffff }), {
  key: 'ground',
  uniforms: groundUniforms,
  declarations: `${GROUND_GLSL}\nvarying vec3 vFxNormal;`,
  vertexDeclarations: 'varying vec3 vFxNormal;',
  vertex: 'vFxNormal = normalize(mat3(modelMatrix) * objectNormal);',
  color: 'diffuseColor.rgb = groundColor(vFxWorld, normalize(vFxNormal));',
  normal: /* glsl */ `
    #ifdef GROUND_BUMPS
    {
      // little lumps in the light (not in the shape) on grass only: roads and paving stay smooth
      vec2 bp = vFxWorld.xz;
      vec4 gt = texture2D(gTile, (floor(bp) + 0.5 - ${WORLD0.toFixed(1)}) / ${SPAN.toFixed(1)});
      int rr = int(gt.r * 255.0 + 0.5), bb = int(gt.b * 255.0 + 0.5);
      float soft = ((rr & 16) == 0 && bb <= 1) ? 1.0 : 0.0;
      float e = 0.07;
      float h0 = fxNoise(bp * 2.3) * 0.6 + fxNoise(bp * 5.3) * 0.4;
      float hx = fxNoise((bp + vec2(e, 0.0)) * 2.3) * 0.6 + fxNoise((bp + vec2(e, 0.0)) * 5.3) * 0.4;
      float hz = fxNoise((bp + vec2(0.0, e)) * 2.3) * 0.6 + fxNoise((bp + vec2(0.0, e)) * 5.3) * 0.4;
      vec3 gw = vec3(-(hx - h0), 0.0, -(hz - h0)) / e * 0.05 * soft;
      normal = normalize(normal + (viewMatrix * vec4(gw, 0.0)).xyz);
    }
    #endif`,
});
groundMaterial.userData.shared = true;
groundMaterial.defines = {};
groundMaterial.customProgramCacheKey = () => ('GROUND_BUMPS' in groundMaterial.defines! ? 'ground+b' : 'ground');

/** Little lumps in the grass's lighting (Medium and High). */
export function setGroundBumps(on: boolean) {
  const has = 'GROUND_BUMPS' in groundMaterial.defines!;
  if (on === has) return;
  if (on) groundMaterial.defines!.GROUND_BUMPS = '';
  else delete groundMaterial.defines!.GROUND_BUMPS;
  groundMaterial.needsUpdate = true;
}

/** The ground is cut into CHUNKS × CHUNKS meshes, each culled on its own. */
const CHUNKS = 4;

export function buildTerrain(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'terrain';
  const size = SPAN / CHUNKS;
  for (let cj = 0; cj < CHUNKS; cj++) for (let ci = 0; ci < CHUNKS; ci++) {
    const pos: number[] = [], idx: number[] = [];
    const shared = new Map<string, number>();
    const vertex = (x: number, z: number) => {
      const key = `${Math.round(x * 64)},${Math.round(z * 64)}`;
      let i = shared.get(key);
      if (i === undefined) { i = pos.length / 3; pos.push(x, groundY(x, z), z); shared.set(key, i); }
      return i;
    };
    for (let z = WORLD0 + cj * size; z < WORLD0 + (cj + 1) * size; z++) for (let x = WORLD0 + ci * size; x < WORLD0 + (ci + 1) * size; x++) {
      // fine near the shore; further out in the bay and the hills two tiles share a quad's worth of detail
      const n = nearShore(x, z) ? 4 : 1;
      const grid: number[] = [];
      for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) grid.push(vertex(x + i / n, z + j / n));
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const a = grid[j * (n + 1) + i]!, b = grid[(j + 1) * (n + 1) + i]!, c = grid[(j + 1) * (n + 1) + i + 1]!, d = grid[j * (n + 1) + i + 1]!;
        idx.push(a, b, c, a, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    // normals from the height function itself, so the chunks meet without seams
    const nor = new Float32Array(pos.length);
    for (let i = 0; i < pos.length; i += 3) {
      const x = pos[i]!, z = pos[i + 2]!, e = 0.05;
      const nx = -(groundY(x + e, z) - groundY(x - e, z)) / (2 * e), nz = -(groundY(x, z + e) - groundY(x, z - e)) / (2 * e);
      const l = Math.hypot(nx, 1, nz);
      nor[i] = nx / l; nor[i + 1] = 1 / l; nor[i + 2] = nz / l;
    }
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    // the box is a little taller than the ground, so hills at a chunk's edge aren't culled too soon
    g.boundingBox!.max.y += 0.5;
    const mesh = new THREE.Mesh(g, groundMaterial);
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  return group;
}

/** Show only the ground chunks whose box touches the view (called when the camera moves). */
export function cullTerrain(group: THREE.Group, frustum: THREE.Frustum) {
  for (const c of group.children as THREE.Mesh[]) c.visible = frustum.intersectsBox(c.geometry.boundingBox!);
}
