import * as THREE from 'three';
import { PROPS } from '../data/props/index';
import type { PropPlacement, PropScatter } from '../data/types';
import { Rng } from '../core/rng';
import { buildRecipe } from './lowpoly';
import { Materials } from './materials';
import { EDGE_DROP, F_GAP, type TrackModel } from '../sim/track/trackModel';
import type { QualityProfile } from './quality';

// Scenery is split into square chunks. Each chunk draws its props as ONE merged mesh at full detail (near) or
// simplified LOD1 (mid distance); far away, small props become camera-facing impostors from an atlas rendered
// once at load (one draw call for all of them), while big landmarks stay LOD1 meshes. Chunk meshes are built
// lazily and frustum-culled; density thinning uses the draw range (instances are stored in a random order with
// hand-placed landmarks first, so lowering density never removes a landmark).

const CHUNK = 120;
const HYST = 8;

interface Instance {
  type: string;
  /** Hand-placed landmark (never removed by the quality density setting). */
  fixed: boolean;
  x: number;
  y: number;
  z: number;
  rot: number;
  scale: number;
  r: number;
  g: number;
  b: number;
  /** World-space bounding radius. */
  radius: number;
}

const geoCache = new Map<string, THREE.BufferGeometry>();
const lodCache = new Map<string, THREE.BufferGeometry>();

/** Full-detail shared geometry for a prop recipe. */
export function propGeometry(type: string): THREE.BufferGeometry | null {
  const recipe = PROPS[type];
  if (!recipe) return null;
  let g = geoCache.get(type);
  if (!g) {
    g = buildRecipe(recipe);
    g.computeBoundingBox();
    g.userData.shared = true;
    geoCache.set(type, g);
  }
  return g;
}

function propGeometryLod(type: string): THREE.BufferGeometry | null {
  const recipe = PROPS[type];
  if (!recipe) return null;
  let g = lodCache.get(type);
  if (!g) {
    g = buildRecipe(recipe, {}, [], 1);
    if (!g.getAttribute('position')) g = propGeometry(type)!;
    g.userData.shared = true;
    lodCache.set(type, g);
  }
  return g;
}

/** Coarse spatial hash of main-track samples for "is this spot clear of the road?" checks. */
class SampleGrid {
  private cells = new Map<number, number[]>();
  constructor(
    private readonly track: TrackModel,
    private readonly cell = 16,
  ) {
    const rb = track.main;
    for (let i = 0; i < rb.n; i++) this.add(rb.px[i], rb.pz[i], i);
  }
  private key(cx: number, cz: number): number {
    return (cx + 4096) * 8192 + (cz + 4096);
  }
  private add(x: number, z: number, i: number): void {
    const k = this.key(Math.floor(x / this.cell), Math.floor(z / this.cell));
    let a = this.cells.get(k);
    if (!a) this.cells.set(k, (a = []));
    a.push(i);
  }
  /** Distance from (x,z) to the nearest road boundary minus clearance; negative = too close. */
  clearance(x: number, z: number): number {
    const rb = this.track.main;
    const cx = Math.floor(x / this.cell);
    const cz = Math.floor(z / this.cell);
    let best = Infinity;
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++) {
        const a = this.cells.get(this.key(cx + dx, cz + dz));
        if (!a) continue;
        for (const i of a) {
          const d = Math.hypot(x - rb.px[i], z - rb.pz[i]) - (rb.hw[i] + Math.max(rb.shL[i], rb.shR[i]));
          if (d < best) best = d;
        }
      }
    for (const sc of this.track.shortcuts) {
      for (let i = 0; i < sc.n; i += 2) {
        const d = Math.hypot(x - sc.px[i], z - sc.pz[i]) - (sc.hw[i] + 3);
        if (d < best) best = d;
      }
    }
    return best;
  }
}

/** Where every prop goes (deterministic per track). */
function placeInstances(track: TrackModel, seed: string): Instance[] {
  const rng = new Rng(seed);
  const out: Instance[] = [];
  const grid = new SampleGrid(track);
  const rb = track.main;
  const groundY = track.data.sky.groundY ?? track.minY - 0.5;
  const hasGround = track.data.sky.ground !== null;
  const mirror = track.mirror ? -1 : 1;
  const tint = new THREE.Color();
  const push = (type: string, fixed: boolean, x: number, y: number, z: number, rot: number, scale: number, color?: number): void => {
    const geo = propGeometry(type);
    if (!geo) return;
    if (color !== undefined) tint.setHex(color);
    else tint.setRGB(rng.range(0.88, 1.08), rng.range(0.88, 1.08), rng.range(0.88, 1.08));
    out.push({ type, fixed, x, y, z, rot, scale, r: tint.r, g: tint.g, b: tint.b, radius: (geo.boundingSphere?.radius ?? 1) * scale });
  };
  for (const sc of track.data.scatter ?? []) scatter(sc);
  function scatter(sc: PropScatter): void {
    const spacing = 100 / Math.max(0.1, sc.density);
    for (let s = rng.range(0, spacing); s < rb.length; s += spacing * rng.range(0.6, 1.4)) {
      for (const side of [-1, 1]) {
        const i = rb.indexAtS(s);
        if (rb.flags[i] & F_GAP) continue;
        const edge = side < 0 ? rb.edgeL[i] : rb.edgeR[i];
        const B = rb.hw[i] + (side < 0 ? rb.shL[i] : rb.shR[i]);
        const off = B + rng.range(sc.near, sc.far);
        const x = rb.px[i] + rb.rx[i] * off * side;
        const z = rb.pz[i] + rb.rz[i] * off * side;
        if (grid.clearance(x, z) < 1.5) continue;
        let y: number;
        const beyond = off - B;
        const roadY = rb.py[i] + rb.ry[i] * B * side;
        if (edge === EDGE_DROP || !hasGround || track.data.verge === false) {
          // floating tracks: props float near road height (when allowed) or sit on the ground plane
          if (!hasGround) {
            if (!sc.float) continue;
            y = roadY + rng.range(sc.float[0], sc.float[1]);
          } else y = groundY;
        } else {
          const t = Math.min(1, beyond / 22);
          y = roadY + (Math.min(groundY, rb.py[i] - 0.4) - roadY) * t;
        }
        const scaleR = sc.scale ?? [0.8, 1.3];
        const type = rng.pick(sc.types);
        push(type, false, x, y, z, rng.range(0, Math.PI * 2), rng.range(scaleR[0], scaleR[1]));
      }
    }
  }
  for (const p of track.data.props ?? []) placement(p);
  function placement(p: PropPlacement): void {
    push(p.type, true, p.x * mirror, p.y ?? groundY, p.z, (p.rot ?? 0) * mirror, p.scale ?? 1, p.color);
  }
  // random order (deterministic), landmarks first — density thinning keeps a prefix
  rng.shuffle(out);
  out.sort((a, b) => (b.fixed ? 1 : 0) - (a.fixed ? 1 : 0));
  return out;
}

/** One merged mesh for a list of instances; `ends[i]` = vertex count after instance i (for density draw ranges). */
interface Merged {
  mesh: THREE.Mesh;
  ends: Uint32Array;
  fixed: number;
}

const tmpM = new THREE.Matrix4();
const tmpN = new THREE.Matrix3();
const tmpQ = new THREE.Quaternion();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

function mergeInstances(list: Instance[], lod: boolean, name: string): Merged | null {
  if (!list.length) return null;
  let verts = 0;
  for (const it of list) verts += (lod ? propGeometryLod(it.type) : propGeometry(it.type))!.getAttribute('position').count;
  const pos = new Float32Array(verts * 3);
  const nor = new Float32Array(verts * 3);
  const col = new Float32Array(verts * 3);
  const ends = new Uint32Array(list.length);
  let o = 0;
  list.forEach((it, idx) => {
    const g = (lod ? propGeometryLod(it.type) : propGeometry(it.type))!;
    const gp = g.getAttribute('position') as THREE.BufferAttribute;
    const gn = g.getAttribute('normal') as THREE.BufferAttribute;
    const gc = g.getAttribute('color') as THREE.BufferAttribute | undefined;
    tmpP.set(it.x, it.y, it.z);
    tmpQ.setFromAxisAngle(UP, it.rot);
    tmpS.setScalar(it.scale);
    tmpM.compose(tmpP, tmpQ, tmpS);
    tmpN.getNormalMatrix(tmpM);
    for (let v = 0; v < gp.count; v++, o++) {
      tmpV.fromBufferAttribute(gp, v).applyMatrix4(tmpM);
      pos[o * 3] = tmpV.x;
      pos[o * 3 + 1] = tmpV.y;
      pos[o * 3 + 2] = tmpV.z;
      tmpV.fromBufferAttribute(gn, v).applyMatrix3(tmpN).normalize();
      nor[o * 3] = tmpV.x;
      nor[o * 3 + 1] = tmpV.y;
      nor[o * 3 + 2] = tmpV.z;
      col[o * 3] = (gc ? gc.getX(v) : 1) * it.r;
      col[o * 3 + 1] = (gc ? gc.getY(v) : 1) * it.g;
      col[o * 3 + 2] = (gc ? gc.getZ(v) : 1) * it.b;
    }
    ends[idx] = o;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, Materials.flat);
  mesh.name = name;
  mesh.matrixAutoUpdate = false;
  mesh.visible = false;
  return { mesh, ends, fixed: list.filter((i) => i.fixed).length };
}

function applyDensity(m: Merged | null | undefined, density: number): void {
  if (!m) return;
  const n = m.ends.length;
  const keep = Math.min(n, m.fixed + Math.round((n - m.fixed) * density));
  m.mesh.geometry.setDrawRange(0, keep > 0 ? m.ends[keep - 1] : 0);
}

const enum ChunkState {
  Hidden,
  Full,
  Lod,
  Far,
}

class Chunk {
  readonly insts: Instance[] = [];
  readonly center = new THREE.Vector3();
  radius = 0;
  full: Merged | null | undefined;
  lod: Merged | null | undefined;
  /** LOD1 mesh of the big instances only (drawn while the chunk is "far"). */
  bigLod: Merged | null | undefined;
  state = ChunkState.Hidden;
  bigRadius = -1;

  finish(): void {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const i of this.insts) {
      minX = Math.min(minX, i.x - i.radius);
      maxX = Math.max(maxX, i.x + i.radius);
      minY = Math.min(minY, i.y - i.radius);
      maxY = Math.max(maxY, i.y + i.radius);
      minZ = Math.min(minZ, i.z - i.radius);
      maxZ = Math.max(maxZ, i.z + i.radius);
    }
    this.center.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    this.radius = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) / 2;
  }
}

// ------------------------------------------------------------------ impostor atlas
interface Impostor {
  /** uv rect in the atlas: x, y, w, h. */
  u: number;
  v: number;
  uw: number;
  vh: number;
  /** Model-space width/height and bottom of the view. */
  w: number;
  h: number;
  base: number;
}

const CELL = 128;

function billboardMaterial(map: THREE.Texture): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({ map, alphaTest: 0.5, fog: true });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 uvRect;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = uvRect.xy + uv * uvRect.zw;\n#endif')
      .replace(
        '#include <project_vertex>',
        `vec3 bbBase = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
         float bbW = length(instanceMatrix[0].xyz);
         float bbH = length(instanceMatrix[1].xyz);
         vec3 bbTo = cameraPosition - bbBase;
         vec3 bbRight = normalize(vec3(bbTo.z, 0.0, -bbTo.x) + vec3(1e-5, 0.0, 0.0));
         vec3 bbWorld = bbBase + bbRight * position.x * bbW + vec3(0.0, position.y * bbH, 0.0);
         vec4 mvPosition = viewMatrix * vec4(bbWorld, 1.0);
         gl_Position = projectionMatrix * mvPosition;`,
      );
  };
  mat.customProgramCacheKey = () => 'calex-billboard';
  return mat;
}

export interface TrackProps {
  group: THREE.Group;
  /** Re-apply tier settings (density, LOD distances). */
  setProfile(p: QualityProfile): void;
  /** Choose LOD per chunk from the camera positions. Call once per frame before rendering. */
  update(cameras: readonly THREE.Vector3[]): void;
  /** Re-render the impostor atlas (after a WebGL context loss). */
  rebuildAtlas(): void;
  dispose(): void;
  /** Debug counts for the benchmark. */
  stats(): { chunks: number; full: number; lod: number; far: number; billboards: number; geometryMB: number };
}

/**
 * Build chunked LOD scenery for a track from its scatter rules and explicit placements.
 */
export function buildTrackProps(track: TrackModel, seed: string, renderer: THREE.WebGLRenderer | null, sky: { ambient: number; sun: number; night?: boolean }): TrackProps {
  const all = placeInstances(track, seed);
  const group = new THREE.Group();
  group.name = 'props';
  // ---- chunks
  const byKey = new Map<string, Chunk>();
  for (const it of all) {
    const key = `${Math.floor(it.x / CHUNK)},${Math.floor(it.z / CHUNK)}`;
    let c = byKey.get(key);
    if (!c) byKey.set(key, (c = new Chunk()));
    c.insts.push(it);
  }
  const chunks = [...byKey.values()];
  for (const c of chunks) c.finish();

  // ---- impostor atlas for every prop type used on this track
  const types = [...new Set(all.map((i) => i.type))];
  const cols = Math.max(1, Math.ceil(Math.sqrt(types.length)));
  const size = Math.min(2048, cols * CELL);
  const impostors = new Map<string, Impostor>();
  types.forEach((t, idx) => {
    const g = propGeometry(t)!;
    const bb = g.boundingBox!;
    // centred on the prop's origin (the billboard is anchored there), wide enough for any rotation
    const w = Math.max(0.2, 2 * Math.max(-bb.min.x, bb.max.x, -bb.min.z, bb.max.z)) * 1.04;
    const h = Math.max(0.2, bb.max.y - bb.min.y) * 1.04;
    const cx = idx % cols;
    const cy = Math.floor(idx / cols);
    const pad = 2 / size;
    impostors.set(t, { u: cx / cols + pad, v: cy / cols + pad, uw: 1 / cols - pad * 2, vh: 1 / cols - pad * 2, w, h, base: bb.min.y - h * 0.02 });
  });
  const rt = renderer ? new THREE.WebGLRenderTarget(size, size, { depthBuffer: true, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter }) : null;
  const renderAtlas = (): void => {
    if (!renderer || !rt) return;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(sky.ambient, sky.night ? 0x221a44 : 0x8a7a5a, sky.night ? 1.1 : 1.45));
    const sun = new THREE.DirectionalLight(sky.sun, sky.night ? 0.9 : 1.75);
    sun.position.set(40, 80, 60);
    scene.add(sun);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
    const prevTarget = renderer.getRenderTarget();
    const prevClear = renderer.getClearColor(new THREE.Color());
    const prevAlpha = renderer.getClearAlpha();
    const prevScissor = renderer.getScissorTest();
    rt.viewport.set(0, 0, size, size);
    rt.scissor.set(0, 0, size, size);
    rt.scissorTest = false;
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, true, true);
    const mesh = new THREE.Mesh(undefined, Materials.flat);
    scene.add(mesh);
    types.forEach((t, idx) => {
      const im = impostors.get(t)!;
      mesh.geometry = propGeometry(t)!;
      cam.left = -im.w / 2;
      cam.right = im.w / 2;
      cam.top = im.h;
      cam.bottom = 0;
      cam.position.set(0, im.base, 500);
      cam.lookAt(0, im.base, 0);
      cam.updateProjectionMatrix();
      const x = (idx % cols) * (size / cols) + 2;
      const y = Math.floor(idx / cols) * (size / cols) + 2;
      const s = size / cols - 4;
      rt.viewport.set(x, y, s, s);
      rt.scissor.set(x, y, s, s);
      rt.scissorTest = true;
      renderer.setRenderTarget(rt); // re-applies the target's viewport/scissor
      renderer.render(scene, cam);
    });
    rt.scissorTest = false;
    renderer.setScissorTest(prevScissor);
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevClear, prevAlpha);
    mesh.geometry = new THREE.BufferGeometry();
    mesh.geometry.dispose();
  };
  renderAtlas();

  // ---- billboard instancing (one draw call)
  const bbGeo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  bbGeo.deleteAttribute('normal');
  const maxBb = Math.max(1, all.length);
  const uvRect = new THREE.InstancedBufferAttribute(new Float32Array(maxBb * 4), 4);
  bbGeo.setAttribute('uvRect', uvRect);
  const bbMat = rt ? billboardMaterial(rt.texture) : null;
  const billboards = bbMat ? new THREE.InstancedMesh(bbGeo, bbMat, maxBb) : null;
  if (billboards) {
    billboards.name = 'props:billboards';
    billboards.frustumCulled = false;
    billboards.count = 0;
    billboards.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(maxBb * 3), 3);
    group.add(billboards);
  }

  let profile: QualityProfile | null = null;
  let billboardsDirty = true;
  let builtThisFrame = 0;

  const ensure = (c: Chunk, which: 'full' | 'lod' | 'bigLod'): Merged | null => {
    if (c[which] !== undefined) return c[which]!;
    if (builtThisFrame > 0 && profile) return null; // spread lazy builds over frames
    builtThisFrame++;
    let m: Merged | null;
    if (which === 'bigLod') m = mergeInstances(c.insts.filter((i) => i.radius >= c.bigRadius), true, 'props:bigLod');
    else m = mergeInstances(c.insts, which === 'lod', `props:${which}`);
    c[which] = m;
    if (m) {
      group.add(m.mesh);
      if (profile) applyDensity(m, profile.propDensity);
    }
    return m;
  };

  const addMerged = (m: Merged | null): Merged | null => {
    if (m) group.add(m.mesh);
    return m;
  };

  const setVisible = (m: Merged | null | undefined, on: boolean): void => {
    if (m) m.mesh.visible = on;
  };

  const rebuildBillboards = (): void => {
    if (!billboards || !profile) return;
    let n = 0;
    const cArr = billboards.instanceColor!.array as Float32Array;
    const uArr = uvRect.array as Float32Array;
    for (const c of chunks) {
      if (c.state !== ChunkState.Far) continue;
      const nonFixed = c.insts.length - c.insts.filter((i) => i.fixed).length;
      const keep = c.insts.length - nonFixed + Math.round(nonFixed * profile.propDensity);
      for (let k = 0; k < keep; k++) {
        const it = c.insts[k];
        if (it.radius >= c.bigRadius) continue;
        const im = impostors.get(it.type)!;
        tmpP.set(it.x, it.y + im.base * it.scale, it.z);
        tmpS.set(im.w * it.scale, im.h * it.scale, 1);
        tmpQ.identity();
        tmpM.compose(tmpP, tmpQ, tmpS);
        billboards.setMatrixAt(n, tmpM);
        cArr[n * 3] = it.r;
        cArr[n * 3 + 1] = it.g;
        cArr[n * 3 + 2] = it.b;
        uArr[n * 4] = im.u;
        uArr[n * 4 + 1] = im.v;
        uArr[n * 4 + 2] = im.uw;
        uArr[n * 4 + 3] = im.vh;
        n++;
      }
    }
    billboards.count = n;
    billboards.instanceMatrix.needsUpdate = true;
    billboards.instanceColor!.needsUpdate = true;
    uvRect.needsUpdate = true;
    billboardsDirty = false;
  };

  const api: TrackProps = {
    group,
    setProfile(p: QualityProfile): void {
      profile = p;
      for (const c of chunks) {
        applyDensity(c.full, p.propDensity);
        applyDensity(c.lod, p.propDensity);
        if (c.bigRadius !== p.propBigRadius) {
          if (c.bigLod) {
            group.remove(c.bigLod.mesh);
            c.bigLod.mesh.geometry.dispose();
          }
          c.bigLod = undefined;
          c.bigRadius = p.propBigRadius;
        }
        // build what this tier needs now (lazy builds later are spread over frames)
        if (c.lod === undefined) c.lod = addMerged(mergeInstances(c.insts, true, 'props:lod'));
        if (p.propFullDist > 0 && c.full === undefined) c.full = addMerged(mergeInstances(c.insts, false, 'props:full'));
        if (billboards && c.bigLod === undefined) c.bigLod = addMerged(mergeInstances(c.insts.filter((i) => i.radius >= c.bigRadius), true, 'props:bigLod'));
        applyDensity(c.full, p.propDensity);
        applyDensity(c.lod, p.propDensity);
        applyDensity(c.bigLod, 1);
        c.state = ChunkState.Hidden;
        setVisible(c.full, false);
        setVisible(c.lod, false);
        setVisible(c.bigLod, false);
      }
      billboardsDirty = true;
    },
    update(cams: readonly THREE.Vector3[]): void {
      if (!profile) return;
      const p = profile;
      builtThisFrame = 0;
      const far = p.drawDistance;
      for (const c of chunks) {
        let d = Infinity;
        for (const cp of cams) d = Math.min(d, Math.max(0, cp.distanceTo(c.center) - c.radius));
        // hysteresis: stay in the current state a little past its boundary
        const prev = c.state;
        const h = (lim: number, st: ChunkState): number => (prev === st ? lim + HYST : lim);
        let next: ChunkState;
        if (d > far) next = ChunkState.Hidden;
        else if (d <= h(p.propFullDist, ChunkState.Full)) next = ChunkState.Full;
        else if (d <= h(p.propLodDist, ChunkState.Lod) || !billboards) next = ChunkState.Lod;
        else next = ChunkState.Far;
        if (next === ChunkState.Full && !ensure(c, 'full')) next = c.full === null ? ChunkState.Hidden : ChunkState.Lod;
        if (next === ChunkState.Lod && !ensure(c, 'lod')) next = c.lod === null ? ChunkState.Hidden : prev;
        if (next === ChunkState.Far) ensure(c, 'bigLod');
        if (next === prev) continue;
        if (prev === ChunkState.Far || next === ChunkState.Far) billboardsDirty = true;
        c.state = next;
        setVisible(c.full, next === ChunkState.Full);
        setVisible(c.lod, next === ChunkState.Lod);
        setVisible(c.bigLod, next === ChunkState.Far);
      }
      if (billboardsDirty) rebuildBillboards();
    },
    rebuildAtlas(): void {
      renderAtlas();
    },
    dispose(): void {
      rt?.dispose();
      bbMat?.dispose();
      bbGeo.dispose();
      for (const c of chunks) for (const m of [c.full, c.lod, c.bigLod]) m?.mesh.geometry.dispose();
    },
    stats() {
      let bytes = 0;
      const s = { chunks: chunks.length, full: 0, lod: 0, far: 0, billboards: billboards?.count ?? 0, geometryMB: 0 };
      for (const c of chunks) {
        if (c.state === ChunkState.Full) s.full++;
        else if (c.state === ChunkState.Lod) s.lod++;
        else if (c.state === ChunkState.Far) s.far++;
        for (const m of [c.full, c.lod, c.bigLod]) if (m) bytes += (m.mesh.geometry.getAttribute('position').array as Float32Array).byteLength * 3;
      }
      s.geometryMB = +(bytes / 1048576).toFixed(2);
      return s;
    },
  };
  return api;
}
