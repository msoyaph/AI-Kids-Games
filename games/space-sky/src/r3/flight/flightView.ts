import {
  AdditiveBlending,
  BoxGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
  type WebGLRenderer,
} from 'three';
import { fbm3 } from '../../core/noise';
import { Rng } from '../../core/rng';
import { BODY_BY_ID } from '../../data/bodies';
import type { QualityProfile } from '../../systems/quality';
import type { Body3, World3 } from '../../systems/flight3d';
import type { Layout3 } from '../../systems/world3d';
import { OUTPUT_GLSL } from '../materials';
import { createPlanet, type PlanetView } from '../space/planets';
import { makeWormhole } from '../space/wormhole';

/** Flight world coordinates: (x, y) is the flat map and h is height → three.js (x, h, y). */
export function toV(x: number, y: number, h: number, out: Vector3): Vector3 {
  return out.set(x, h, y);
}

function starShape(outer: number, inner: number): Shape {
  const s = new Shape();
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? inner : outer;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return s;
}

/** Lumpy rock geometry (asteroids), displaced with value noise. */
function rockGeometry(detail: number, seed: number): BufferGeometry {
  const g = new IcosahedronGeometry(1, detail);
  const pos = g.attributes.position;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const n = fbm3(v.x * 1.6 + seed, v.y * 1.6, v.z * 1.6, 4, seed);
    v.multiplyScalar(1 + n * 0.32);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

const TAIL_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const TAIL_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uPower;
varying vec2 vUv;
void main() {
  float along = vUv.y;
  float across = abs(vUv.x - 0.5) * 2.0;
  float streak = 0.75 + 0.25 * sin(vUv.x * 40.0 + along * 6.0 - uTime * 3.0);
  float a = smoothstep(1.0, 0.0, along) * smoothstep(1.0, 0.2, across) * streak * uPower;
  gl_FragColor = vec4(uColor * a, a);
  ${OUTPUT_GLSL}
}`;

interface CometVis {
  group: Group;
  head: Mesh;
  dust: Mesh;
  ion: Mesh;
  mats: ShaderMaterial[];
}

interface ObjVis {
  body: Body3;
  obj: Object3D;
  planet: PlanetView | null;
  blink: Mesh | null;
}

const Y = new Vector3(0, 1, 0);
const Zv = new Vector3(0, 0, 1);

/**
 * Everything you see in 3D flight except the rocket: planets, moons, satellites, the wormhole,
 * star-coins, fuel cells, asteroids (instanced, with LOD), comets, race hoops, ring ice, glimmers
 * and the hidden sticker. It only reads the sim (World3); `update` syncs transforms.
 */
export class FlightView {
  readonly group = new Group();
  readonly sunDir = new Vector3();
  private readonly world: World3;
  private readonly objs: ObjVis[] = [];
  private coins!: InstancedMesh;
  private fuels!: InstancedMesh;
  private hauls!: InstancedMesh;
  private glimmers!: InstancedMesh;
  private rockLods: InstancedMesh[] = [];
  private comets: CometVis[] = [];
  private gates: Array<{ mesh: Mesh; mat: MeshBasicMaterial }> = [];
  private sticker: Group | null = null;
  private stickerAt: Vector3 | null = null;
  worm: { mesh: Mesh; material: ShaderMaterial; body: Body3 } | null = null;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly s = new Vector3();
  private readonly v = new Vector3();
  private readonly axis = new Vector3();
  private readonly rockAxes: Float32Array;
  private readonly rockColors: Color[] = [];
  private readonly lodDist: number[];
  private readonly drawDist: number;

  constructor(layout: Layout3, renderer: WebGLRenderer, prof: QualityProfile) {
    const w = (this.world = layout.world);
    this.sunDir.set(w.sunX, w.sunH, w.sunY).normalize();
    this.drawDist = prof.tier === 'low' ? 6000 : 9000;
    this.lodDist = prof.asteroidLods >= 3 ? [700, 2200] : prof.asteroidLods === 2 ? [1100, 1e9] : [1e9, 1e9];

    // Planets, moons and mission objects.
    for (const b of w.bodies) {
      const def = BODY_BY_ID[b.id];
      let obj: Object3D;
      let planet: PlanetView | null = null;
      let blink: Mesh | null = null;
      if (b.id === 'wormhole') {
        const wh = makeWormhole();
        wh.mesh.scale.setScalar(b.r * 1.15);
        this.worm = { ...wh, body: b };
        obj = wh.mesh;
      } else if (def) {
        planet = createPlanet(b.id, b.r, { renderer, profile: prof, detail: b.r > 150 ? 'hero' : 'normal' });
        // Saturn's rings lie nearly flat in flight so you can fly over, under and through them.
        if (planet.recipe.rings && !planet.recipe.rings.faint) planet.tilt.rotation.z = 0.08;
        obj = planet.group;
      } else {
        const kind = b.id.split(':')[0];
        const made = kind === 'sat' ? satelliteModel() : beepRockModel(kind === 'beep');
        obj = made.group;
        blink = made.blink;
        obj.scale.setScalar(b.r);
      }
      toV(b.x, b.y, b.h, obj.position);
      this.group.add(obj);
      this.objs.push({ body: b, obj, planet, blink });
    }

    // Star-coins: chunky gold stars that spin and glow.
    const coinGeo = new ExtrudeGeometry(starShape(1, 0.48), { depth: 0.32, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 2 });
    coinGeo.center();
    const coinMat = new MeshStandardMaterial({ color: '#ffcf3d', metalness: 0.75, roughness: 0.28, emissive: new Color('#ff9f1a'), emissiveIntensity: 0.55, envMapIntensity: 1.8 });
    this.coins = new InstancedMesh(coinGeo, coinMat, Math.max(1, w.coins.length));
    this.coins.frustumCulled = false;
    // Fuel cells: green glowing capsules.
    const fuelMat = new MeshStandardMaterial({ color: '#5dff7a', metalness: 0.2, roughness: 0.3, emissive: new Color('#2ed47a'), emissiveIntensity: 0.9 });
    this.fuels = new InstancedMesh(new CapsuleGeometry(0.5, 0.9, 6, 14), fuelMat, Math.max(1, w.fuels.length));
    this.fuels.frustumCulled = false;
    // Ring ice / samples.
    const iceMat = new MeshStandardMaterial({ color: '#d8f4ff', metalness: 0.1, roughness: 0.15, emissive: new Color('#7fd8ff'), emissiveIntensity: 0.6, flatShading: true });
    this.hauls = new InstancedMesh(new IcosahedronGeometry(1, 0), iceMat, Math.max(1, w.hauls.length));
    this.hauls.frustumCulled = false;
    // Glimmers: tiny glowing friends.
    this.glimmers = new InstancedMesh(new SphereGeometry(1, 14, 10), new MeshBasicMaterial({ color: new Color('#fff3b0').multiplyScalar(2.6) }), Math.max(1, w.glimmers.length));
    this.glimmers.frustumCulled = false;
    this.group.add(this.coins, this.fuels, this.hauls, this.glimmers);

    // Asteroids with up to three levels of detail.
    const rockMat = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.88, metalness: 0.05 });
    const details = prof.asteroidLods >= 3 ? [4, 3, 1] : prof.asteroidLods === 2 ? [3, 1] : [2];
    const n = Math.max(1, w.asteroids.length);
    for (const d of details) {
      const lod = new InstancedMesh(rockGeometry(d, 3.7), rockMat, n);
      lod.frustumCulled = false;
      lod.count = 0;
      this.rockLods.push(lod);
      this.group.add(lod);
    }
    const rng = new Rng('rocks');
    this.rockAxes = new Float32Array(n * 3);
    const tints = ['#9a8f84', '#7e746b', '#b0a493', '#8a8f9a', '#a3896e'];
    for (let i = 0; i < w.asteroids.length; i++) {
      this.axis.set(rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)).normalize();
      this.rockAxes[i * 3] = this.axis.x;
      this.rockAxes[i * 3 + 1] = this.axis.y;
      this.rockAxes[i * 3 + 2] = this.axis.z;
      const c = new Color(tints[(w.asteroids[i].kind + i) % tints.length]);
      this.rockColors.push(c);
      for (const lod of this.rockLods) lod.setColorAt(i, c);
    }

    // Comets: icy head, glowing coma, a wide dust tail and a thin blue ion tail (both away from the Sun).
    for (let i = 0; i < w.comets.length; i++) {
      const c = w.comets[i];
      const g = new Group();
      const head = new Mesh(new IcosahedronGeometry(c.width * 0.32, 2), new MeshStandardMaterial({ color: '#dff6ff', emissive: new Color('#8fe4ff'), emissiveIntensity: 0.8, roughness: 0.5, flatShading: true }));
      const coma = new Mesh(new SphereGeometry(c.width * 0.75, 18, 12), new MeshBasicMaterial({ color: new Color('#bff2ff').multiplyScalar(0.5), transparent: true, opacity: 0.35, blending: AdditiveBlending, depthWrite: false }));
      const mk = (color: string, power: number) =>
        new ShaderMaterial({
          uniforms: { uColor: { value: new Color(color) }, uTime: { value: 0 }, uPower: { value: power } },
          vertexShader: TAIL_VERT,
          fragmentShader: TAIL_FRAG,
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
          premultipliedAlpha: true,
          side: DoubleSide,
        });
      const dustMat = mk('#fff1c9', 0.9);
      const ionMat = mk('#7fc8ff', 1.2);
      // Cones from the head (y=0) outward to y=1 (unit length, scaled to the tail length).
      const tailGeo = new CylinderGeometry(1, 0.15, 1, 20, 1, true);
      tailGeo.translate(0, 0.5, 0);
      const dust = new Mesh(tailGeo, dustMat);
      dust.scale.set(c.width * 1.4, c.len, c.width * 1.4);
      const ion = new Mesh(tailGeo, ionMat);
      ion.scale.set(c.width * 0.45, c.len * 1.15, c.width * 0.45);
      g.add(head, coma, dust, ion);
      this.group.add(g);
      this.comets.push({ group: g, head, dust, ion, mats: [dustMat, ionMat] });
    }

    // Race / training hoops.
    for (const gt of w.gates) {
      const mat = new MeshBasicMaterial({ color: new Color('#ffffff') });
      const mesh = new Mesh(new TorusGeometry(gt.r, Math.max(5, gt.r * 0.06), 12, 64), mat);
      toV(gt.x, gt.y, gt.h, mesh.position);
      this.v.set(gt.nx, gt.nh, gt.ny).normalize();
      mesh.quaternion.setFromUnitVectors(Zv, this.v);
      this.group.add(mesh);
      this.gates.push({ mesh, mat });
    }

    // The hidden space sticker: a spinning pink star.
    if (layout.sticker) {
      const g = new Group();
      const star = new Mesh(new ExtrudeGeometry(starShape(1, 0.45), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 2 }), new MeshStandardMaterial({ color: '#ff7ad9', emissive: new Color('#ff3fb8'), emissiveIntensity: 0.9, roughness: 0.3 }));
      star.geometry.center();
      g.add(star);
      g.scale.setScalar(26);
      this.stickerAt = toV(layout.sticker.x, layout.sticker.y, layout.sticker.h, new Vector3());
      g.position.copy(this.stickerAt);
      this.sticker = g;
      this.group.add(g);
    }
  }

  get planets(): PlanetView[] {
    const out: PlanetView[] = [];
    for (const o of this.objs) if (o.planet) out.push(o.planet);
    return out;
  }

  stickerVisible(v: boolean): void {
    if (this.sticker) this.sticker.visible = v;
  }

  /** Sync everything with the simulation. `cam` is the camera position (for LOD and culling). */
  update(time: number, alpha: number, cam: Vector3): void {
    const w = this.world;
    for (const o of this.objs) {
      if (o.planet) o.planet.update(time, this.sunDir);
      else if (o.obj !== this.worm?.mesh) {
        o.obj.rotation.y = time * 0.4;
        o.obj.rotation.z = Math.sin(time * 0.7 + o.body.x) * 0.25;
        if (o.blink) o.blink.visible = time % 1 < 0.5;
      }
    }
    if (this.worm) this.worm.material.uniforms.uTime.value = time;

    // Coins: only live ones near the camera are drawn.
    const far2 = this.drawDist * this.drawDist;
    let n = 0;
    for (let i = 0; i < w.coins.length; i++) {
      const c = w.coins[i];
      if (!c.alive) continue;
      toV(c.x, c.y, c.h, this.v);
      if (this.v.distanceToSquared(cam) > far2) continue;
      this.q.setFromAxisAngle(Y, time * 2.2 + i * 0.7);
      this.s.setScalar(17);
      this.m.compose(this.v, this.q, this.s);
      this.coins.setMatrixAt(n++, this.m);
    }
    this.coins.count = n;
    this.coins.instanceMatrix.needsUpdate = true;
    n = 0;
    for (let i = 0; i < w.fuels.length; i++) {
      const f = w.fuels[i];
      if (!f.alive) continue;
      toV(f.x, f.y, f.h + Math.sin(time * 2 + i) * 6, this.v);
      if (this.v.distanceToSquared(cam) > far2) continue;
      this.q.setFromAxisAngle(Zv, Math.sin(time + i) * 0.4);
      this.s.setScalar(20);
      this.m.compose(this.v, this.q, this.s);
      this.fuels.setMatrixAt(n++, this.m);
    }
    this.fuels.count = n;
    this.fuels.instanceMatrix.needsUpdate = true;
    n = 0;
    for (let i = 0; i < w.hauls.length; i++) {
      const it = w.hauls[i];
      if (!it.alive) continue;
      toV(it.x, it.y, it.h + Math.sin(time * 2 + i) * 4, this.v);
      this.axis.set(0.3, 1, 0.2).normalize();
      this.q.setFromAxisAngle(this.axis, time * 0.8 + i);
      this.s.setScalar(18);
      this.m.compose(this.v, this.q, this.s);
      this.hauls.setMatrixAt(n++, this.m);
    }
    this.hauls.count = n;
    this.hauls.instanceMatrix.needsUpdate = true;
    n = 0;
    for (let i = 0; i < w.glimmers.length; i++) {
      const g = w.glimmers[i];
      if (!g.alive) continue;
      toV(g.x, g.y, g.h, this.v);
      this.q.identity();
      this.s.setScalar(9 + Math.sin(time * 5 + i) * 2);
      this.m.compose(this.v, this.q, this.s);
      this.glimmers.setMatrixAt(n++, this.m);
    }
    this.glimmers.count = n;
    this.glimmers.instanceMatrix.needsUpdate = true;

    // Asteroids, bucketed by distance into detail levels.
    const counts = [0, 0, 0];
    for (let i = 0; i < w.asteroids.length; i++) {
      const a = w.asteroids[i];
      toV(a.px + (a.x - a.px) * alpha, a.py + (a.y - a.py) * alpha, a.ph + (a.h - a.ph) * alpha, this.v);
      const d2 = this.v.distanceToSquared(cam);
      if (d2 > far2) continue;
      const d = Math.sqrt(d2);
      const lod = d < this.lodDist[0] ? 0 : d < this.lodDist[1] ? 1 : 2;
      const li = Math.min(lod, this.rockLods.length - 1);
      this.axis.set(this.rockAxes[i * 3], this.rockAxes[i * 3 + 1], this.rockAxes[i * 3 + 2]);
      this.q.setFromAxisAngle(this.axis, a.rot);
      this.s.set(a.r * 1.05, a.r * (0.82 + (i % 3) * 0.08), a.r * 0.95);
      this.m.compose(this.v, this.q, this.s);
      const mesh = this.rockLods[li];
      mesh.setMatrixAt(counts[li], this.m);
      // Keep each rock's color with it whichever detail level it lands in.
      mesh.setColorAt(counts[li], this.rockColors[i]);
      counts[li]++;
    }
    for (let k = 0; k < this.rockLods.length; k++) {
      const lod = this.rockLods[k];
      lod.count = counts[k];
      lod.instanceMatrix.needsUpdate = true;
      if (lod.instanceColor) lod.instanceColor.needsUpdate = true;
    }

    // Comets.
    for (let i = 0; i < this.comets.length; i++) {
      const c = w.comets[i];
      const vis = this.comets[i];
      toV(c.px + (c.x - c.px) * alpha, c.py + (c.y - c.py) * alpha, c.h, vis.group.position);
      // Tails point away from the Sun.
      this.v.copy(this.sunDir).negate();
      vis.dust.quaternion.setFromUnitVectors(Y, this.v);
      vis.ion.quaternion.copy(vis.dust.quaternion);
      vis.head.rotation.y = time * 0.5;
      for (const m of vis.mats) m.uniforms.uTime.value = time;
    }

    // Hoops: the next one glows yellow and pulses, passed ones turn green.
    for (let i = 0; i < this.gates.length; i++) {
      const g = w.gates[i];
      const { mesh, mat } = this.gates[i];
      const next = i === w.nextGate;
      mat.color.set(g.passed ? '#8cff66' : next ? '#ffe066' : '#bfe6ff').multiplyScalar(g.passed ? 0.6 : next ? 2.4 : 1.1);
      mesh.scale.setScalar(next ? 1 + Math.sin(time * 6) * 0.04 : 1);
      mesh.rotateOnAxis(Zv, 0.002);
    }

    if (this.sticker?.visible && this.stickerAt) {
      this.sticker.rotation.y = time * 1.6;
      this.sticker.position.y = this.stickerAt.y + Math.sin(time * 2) * 8;
    }
  }
}


function satelliteModel(): { group: Group; blink: Mesh } {
  const g = new Group();
  const gold = new MeshStandardMaterial({ color: '#ffc83d', metalness: 0.9, roughness: 0.35, envMapIntensity: 1.6 });
  const panel = new MeshStandardMaterial({ color: '#2a4bd6', metalness: 0.6, roughness: 0.3, emissive: new Color('#0d1d6a') });
  const metal = new MeshStandardMaterial({ color: '#d6dcf0', metalness: 0.9, roughness: 0.25 });
  const body = new Mesh(new BoxGeometry(0.7, 0.7, 0.9), gold);
  g.add(body);
  for (const s of [-1, 1]) {
    const wing = new Mesh(new BoxGeometry(1.4, 0.04, 0.6), panel);
    wing.position.x = s * 1.1;
    const strut = new Mesh(new CylinderGeometry(0.03, 0.03, 0.4, 6), metal);
    strut.rotation.z = Math.PI / 2;
    strut.position.x = s * 0.45;
    g.add(wing, strut);
  }
  const dish = new Mesh(new ConeGeometry(0.35, 0.2, 20, 1, true), metal);
  (dish.material as MeshStandardMaterial).side = DoubleSide;
  dish.position.set(0, 0.5, 0);
  dish.rotation.x = Math.PI;
  const blink = new Mesh(new SphereGeometry(0.08, 10, 8), new MeshBasicMaterial({ color: new Color('#ff4060').multiplyScalar(3) }));
  blink.position.set(0, 0.42, 0.46);
  g.add(dish, blink);
  return { group: g, blink };
}

function beepRockModel(beeping: boolean): { group: Group; blink: Mesh | null } {
  const g = new Group();
  const rock = new Mesh(rockGeometry(2, 8.1), new MeshStandardMaterial({ color: '#8a7f73', roughness: 0.9, flatShading: true }));
  g.add(rock);
  let blink: Mesh | null = null;
  if (beeping) {
    blink = new Mesh(new SphereGeometry(0.18, 12, 10), new MeshBasicMaterial({ color: new Color('#ffe066').multiplyScalar(3) }));
    blink.position.set(0, 0.95, 0);
    g.add(blink);
    const ring = new Mesh(new TorusGeometry(1.4, 0.03, 6, 40), new MeshBasicMaterial({ color: new Color('#ffe066').multiplyScalar(1.5), transparent: true, opacity: 0.6 }));
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  }
  return { group: g, blink };
}

/** A soft glowing quad that always faces the camera (sun glare, nozzle glow...). */
export function glowQuad(color: string, power = 1.5): Mesh {
  const mat = new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color).multiplyScalar(power) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; vec4 c = modelViewMatrix * vec4(0.0,0.0,0.0,1.0); float s = length(modelMatrix[0].xyz); c.xy += position.xy * s; gl_Position = projectionMatrix * c; }',
    fragmentShader: `uniform vec3 uColor; varying vec2 vUv; void main(){ float r = length(vUv*2.0-1.0); float a = exp(-r*r*4.0) * smoothstep(1.0, 0.6, r); gl_FragColor = vec4(uColor * a, a); ${OUTPUT_GLSL} }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    premultipliedAlpha: true,
  });
  const m = new Mesh(new PlaneGeometry(2, 2), mat);
  m.frustumCulled = false;
  return m;
}
