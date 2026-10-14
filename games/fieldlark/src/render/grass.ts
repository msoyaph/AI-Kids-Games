/**
 * Grass and wildflowers around the view: instanced tufts of blades in varying heights (taller along
 * edges and in the wild), and little flowers in four colours, swaying in the shader wind. They are
 * placed from a fixed hash of the ground, so they never swim as the view moves, and only in a circle
 * around where the camera looks, as many as the quality tier allows. Blades take the colour of the
 * painted ground under them, darker at the root, so they melt into it. They keep off fields,
 * buildings, paths and water.
 */
import * as THREE from 'three';
import { hashInts } from '../core/rng';
import type { Season } from '../sim/clock';
import { H, inSquare, W } from '../sim/map';
import { patchMaterial } from './fx';
import { GROUND_GLSL, groundUniforms } from './ground';
import { InstancedLayer, NO_AO } from './instanced';
import { groundY, isFarmTile, landTile, SPAN, waterSdf, WORLD0 } from './land';
import { SEASON_PALETTES } from './palette';
import { cone, cyl, ico, merge, PAT, part } from './geo';

/** Blades and flowers are lit like the ground they grow from (straight up), never darker on their back sides. */
const UP_NORMAL = 'normal = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);';
const grassMaterial = patchMaterial(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), {
  key: 'grass-i',
  wind: 'grass',
  uniforms: groundUniforms,
  declarations: GROUND_GLSL,
  // the ground's own green, darker at the root and sunlit, warmer at the tips
  color: `{
    vec3 g = groundGrass(vFxWorld.xz, gSample(vFxWorld.xz));
    float tip = smoothstep(0.95, 1.3, vColor.r);
    diffuseColor.rgb = mix(g * vColor.rgb, g * vec3(1.3, 1.28, 0.92), tip * 0.75);
  }`,
  normal: UP_NORMAL,
});
const flowerMaterial = patchMaterial(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { key: 'flower-i', wind: 'grass', tint: true, normal: UP_NORMAL });

/** A tuft: seven blades leaning out, shaded from a dark root to a light tip; normals point up so the light matches the ground. */
function tuft(): THREE.BufferGeometry {
  const pos: number[] = [], col: number[] = [], nor: number[] = [];
  const blades = 9;
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2 + (i % 2) * 0.4;
    const r = 0.025 + (i % 3) * 0.04;
    const h = 0.12 + ((i * 7) % 5) * 0.022;
    const lean = 0.06 + (i % 2) * 0.05;
    const bx = Math.cos(a) * r, bz = Math.sin(a) * r;
    const w = 0.026;
    const px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    const tx = bx + Math.cos(a) * lean, tz = bz + Math.sin(a) * lean;
    // two triangles: a tapering blade with a bend at mid height
    const mx = bx + Math.cos(a) * lean * 0.35, mz = bz + Math.sin(a) * lean * 0.35, mh = h * 0.55;
    const tri = (p: number[][], shade: number[]) => {
      for (let k = 0; k < 3; k++) { pos.push(...p[k]!); col.push(shade[k]!, shade[k]!, shade[k]!); nor.push(0, 1, 0); }
    };
    tri([[bx - px, 0, bz - pz], [bx + px, 0, bz + pz], [mx + px * 0.6, mh, mz + pz * 0.6]], [0.55, 0.55, 0.9]);
    tri([[bx - px, 0, bz - pz], [mx + px * 0.6, mh, mz + pz * 0.6], [mx - px * 0.6, mh, mz - pz * 0.6]], [0.55, 0.9, 0.9]);
    tri([[mx - px * 0.6, mh, mz - pz * 0.6], [mx + px * 0.6, mh, mz + pz * 0.6], [tx, h, tz]], [0.9, 0.9, 1.3]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

/** A little wildflower: a stem, a leaf and a five-petal head. The petals are white, tinted per flower. */
function wildflower(stem: number): THREE.BufferGeometry {
  const keep = PAT.keep;
  const parts = [part(cyl(0.008, 0.01, 0.2, 4), stem, { pos: [0, 0.1, 0], pattern: keep }), part(cone(0.022, 0.08, 4), stem, { pos: [0.02, 0.05, 0], rot: [0, 0, -0.8], pattern: keep })];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    parts.push(part(ico(0.026, 0), 0xffffff, { pos: [Math.cos(a) * 0.028, 0.205, Math.sin(a) * 0.028], scale: [1, 0.45, 1] }));
  }
  parts.push(part(ico(0.016, 0), 0xffd84a, { pos: [0, 0.215, 0], pattern: keep }));
  return merge(parts, { ao: false });
}

const CELL = 1 / 3;

export class Grass {
  readonly group = new THREE.Group();
  private grass: InstancedLayer;
  private flowers: InstancedLayer | null = null;
  private flowerColors: number[] = [];
  private season: Season | null = null;
  private key = '';
  private blocked: Uint8Array = new Uint8Array(W * H);
  private blockedVersion = -1;

  constructor() {
    this.grass = new InstancedLayer(tuft(), grassMaterial, 1024, { shadow: false, receive: true, layer: NO_AO });
    this.grass.mesh.name = 'grass';
    this.group.add(this.grass.mesh);
  }

  setSeason(season: Season) {
    if (season === this.season) return;
    this.season = season;
    if (this.flowers) { this.flowers.dispose(); this.flowers.mesh.geometry.dispose(); }
    const pal = SEASON_PALETTES[season];
    this.flowerColors = pal.flower;
    this.flowers = new InstancedLayer(wildflower(season === 'autumn' ? 0x8a9a4a : 0x5f9e45), flowerMaterial, 128, { shadow: false, receive: true, layer: NO_AO });
    this.group.add(this.flowers.mesh);
    this.key = '';
  }

  /** Things on the farm the grass keeps off (1) or thins around (2). */
  setBlocked(blocked: Uint8Array, version: number) {
    if (version === this.blockedVersion) return;
    this.blockedVersion = version;
    this.blocked = blocked;
    this.key = '';
  }

  /**
   * Place grass around (cx, cz): `budget` tufts at most, within `reach` tiles (what's on screen).
   * Cheap to call every frame: it only rebuilds when the view has moved enough.
   */
  update(cx: number, cz: number, reach: number, budget: number) {
    if (!this.season || budget <= 0) { this.grass.mesh.visible = false; if (this.flowers) this.flowers.mesh.visible = false; return; }
    // how far the budget stretches at full density (about 6 tufts a tile), but no further than the screen
    const r = Math.max(4, Math.min(reach, Math.sqrt(budget / (6 * Math.PI))));
    const q = r / 5;
    const key = `${Math.round(cx / q)},${Math.round(cz / q)},${Math.round(r * 2)},${budget},${this.blockedVersion},${this.season}`;
    if (key === this.key) return;
    this.key = key;
    const ccx = Math.round(cx / q) * q, ccz = Math.round(cz / q) * q;
    const winter = this.season === 'winter';
    const thin = Math.min(1, budget / (Math.PI * r * r * 9 * 0.7));
    this.grass.begin();
    this.flowers?.begin();
    const x0 = Math.floor((ccx - r) / CELL), x1 = Math.ceil((ccx + r) / CELL), z0 = Math.floor((ccz - r) / CELL), z1 = Math.ceil((ccz + r) / CELL);
    let n = 0;
    for (let iz = z0; iz <= z1 && n < budget; iz++) {
      for (let ix = x0; ix <= x1 && n < budget; ix++) {
        const h = hashInts(ix, iz, 4242);
        const u = (h & 0xffff) / 65536, v = ((h >>> 16) & 0xffff) / 65536;
        const x = (ix + 0.15 + u * 0.7) * CELL, z = (iz + 0.15 + v * 0.7) * CELL;
        const d = Math.hypot(x - ccx, z - ccz);
        if (d > r || inSquare(x, z, 0.2)) continue;
        if (x < WORLD0 || z < WORLD0 || x >= WORLD0 + SPAN || z >= WORLD0 + SPAN) continue;
        const tx = Math.floor(x), tz = Math.floor(z);
        const inMap = tx >= 0 && tz >= 0 && tx < W && tz < H;
        const b = inMap ? this.blocked[tz * W + tx]! : 0;
        if (b === 1) continue;
        const t = landTile(tx, tz);
        if (t.water || waterSdf(x, z) < 0.1) continue;
        const farm = inMap && isFarmTile(tx, tz);
        const h2 = hashInts(ix, iz, 777) / 4294967296;
        const want = (winter ? 0.12 : farm ? 0.62 : 0.9) * (b === 2 ? 0.45 : 1) * thin;
        if (h2 > want) continue;
        // taller at the edges of things and out in the wild
        const edge = inMap && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => {
          const nx = tx + dx!, nz = tz + dz!;
          return nx >= 0 && nz >= 0 && nx < W && nz < H && this.blocked[nz * W + nx] === 1;
        });
        const fade = Math.min(1, (r - d) / (r * 0.18));
        const size = (0.7 + ((h >>> 8) & 0xff) / 255 * 0.6) * (farm ? 1 : 1.15) * (edge ? 1.3 : 1) * fade;
        const y = groundY(x, z) - 0.01;
        const rot = ((h >>> 4) & 0xff) / 255 * Math.PI * 2;
        const flowerChance = winter ? 0 : (farm ? 0.08 : 0.14) * (this.season === 'autumn' ? 0.5 : 1);
        if (h2 < want * flowerChance && this.flowers) {
          this.flowers.push(x, y, z, rot, (1.0 + v * 0.6) * fade, this.flowerColors[(h >>> 20) % this.flowerColors.length]);
        } else this.grass.push(x, y, z, rot, size * 1.05, undefined, size * (0.8 + u * 0.7));
        n++;
      }
    }
    this.grass.end();
    this.flowers?.end();
  }

  dispose() {
    this.grass.dispose();
    this.flowers?.dispose();
  }
}
