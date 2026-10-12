import * as THREE from 'three';
import type { ArenaData } from '../data/types';
import { DEG } from '../core/math';
import { mergeColored, prim } from './lowpoly';
import { Materials } from './materials';

/** Build the static geometry for a battle arena as one merged mesh. */
export function buildArenaMesh(a: ArenaData): THREE.Group {
  const group = new THREE.Group();
  const pal = a.palette;
  const geos: THREE.BufferGeometry[] = [];
  const col = new THREE.Color();
  const col2 = new THREE.Color();

  // Floor: a grid of tiles clipped to the arena shape, alternating two road colours.
  const tile = 4;
  const n = Math.ceil(a.size / tile) + 1;
  const positions: number[] = [];
  const colors: number[] = [];
  const inside = (x: number, z: number): boolean => {
    switch (a.shape) {
      case 'circle':
        return Math.hypot(x, z) <= a.size + 0.01;
      case 'square':
        return Math.abs(x) <= a.size && Math.abs(z) <= a.size;
      case 'ring': {
        const r = Math.hypot(x, z);
        return r <= a.size + 0.01 && r >= (a.inner ?? a.size * 0.4) - 0.01;
      }
      case 'cross': {
        const w = a.inner ?? a.size * 0.3;
        return (Math.abs(x) <= w && Math.abs(z) <= a.size) || (Math.abs(x) <= a.size && Math.abs(z) <= w);
      }
    }
  };
  for (let i = -n; i < n; i++) {
    for (let j = -n; j < n; j++) {
      const x0 = i * tile;
      const z0 = j * tile;
      const cx = x0 + tile / 2;
      const cz = z0 + tile / 2;
      if (!inside(cx, cz)) continue;
      col.setHex((i + j) % 2 === 0 ? pal.road : pal.road2);
      // Snap tile corners outside a round boundary onto it, so circles look round.
      const corner = (x: number, z: number): [number, number] => {
        if ((a.shape === 'circle' || a.shape === 'ring') && Math.hypot(x, z) > a.size) {
          const r = Math.hypot(x, z);
          return [(x / r) * a.size, (z / r) * a.size];
        }
        if (a.shape === 'ring') {
          const inner = a.inner ?? a.size * 0.4;
          const r = Math.hypot(x, z);
          if (r < inner) return [(x / (r || 1)) * inner, (z / (r || 1)) * inner];
        }
        return [x, z];
      };
      const c00 = corner(x0, z0);
      const c10 = corner(x0 + tile, z0);
      const c11 = corner(x0 + tile, z0 + tile);
      const c01 = corner(x0, z0 + tile);
      positions.push(c00[0], 0, c00[1], c01[0], 0, c01[1], c11[0], 0, c11[1], c00[0], 0, c00[1], c11[0], 0, c11[1], c10[0], 0, c10[1]);
      for (let k = 0; k < 6; k++) colors.push(col.r, col.g, col.b);
    }
  }
  const floor = new THREE.BufferGeometry();
  floor.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  floor.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  floor.computeVertexNormals();
  geos.push(floor);

  // Boundary walls
  const wallH = 1.6;
  if (a.shape === 'circle' || a.shape === 'ring') {
    const segs = 48;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const len = ((Math.PI * 2) / segs) * a.size * 1.04;
      const r = a.size + 0.5;
      geos.push(prim('box', i % 2 ? pal.wall : pal.wall2, [Math.sin(a0) * r, wallH / 2, Math.cos(a0) * r], [len, wallH, 1], [0, a0 / DEG, 0]));
    }
    if (a.shape === 'ring') {
      const inner = a.inner ?? a.size * 0.4;
      geos.push(prim('cyl', pal.wall, [0, wallH, 0], [inner * 2, wallH * 2, inner * 2], [0, 0, 0], 32));
      geos.push(prim('cyl', pal.kerb, [0, wallH * 2 + 0.1, 0], [inner * 2 + 0.4, 0.2, inner * 2 + 0.4], [0, 0, 0], 32));
    }
  } else if (a.shape === 'square') {
    for (let s = 0; s < 4; s++) {
      const rot = s * 90;
      const ox = s === 1 ? a.size + 0.5 : s === 3 ? -a.size - 0.5 : 0;
      const oz = s === 0 ? a.size + 0.5 : s === 2 ? -a.size - 0.5 : 0;
      geos.push(prim('box', s % 2 ? pal.wall : pal.wall2, [ox, wallH / 2, oz], [a.size * 2 + 2, wallH, 1], [0, rot, 0]));
    }
  } else {
    const w = a.inner ?? a.size * 0.3;
    const L = a.size;
    // Arm ends
    geos.push(prim('box', pal.wall, [0, wallH / 2, L + 0.5], [w * 2 + 2, wallH, 1]));
    geos.push(prim('box', pal.wall, [0, wallH / 2, -L - 0.5], [w * 2 + 2, wallH, 1]));
    geos.push(prim('box', pal.wall, [L + 0.5, wallH / 2, 0], [1, wallH, w * 2 + 2]));
    geos.push(prim('box', pal.wall, [-L - 0.5, wallH / 2, 0], [1, wallH, w * 2 + 2]));
    // Arm sides (8 segments)
    const armLen = L - w;
    const mid = w + armLen / 2;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        geos.push(prim('box', pal.wall2, [sx * (w + 0.5), wallH / 2, sz * mid], [1, wallH, armLen + 1]));
        geos.push(prim('box', pal.wall2, [sx * mid, wallH / 2, sz * (w + 0.5)], [armLen + 1, wallH, 1]));
      }
  }

  // Obstacles
  for (const o of a.obstacles) {
    const c = o.color ?? pal.wall;
    if (o.kind === 'cyl') {
      geos.push(prim('cyl', c, [o.x, o.h / 2, o.z], [o.hx * 2, o.h, o.hx * 2], [0, 0, 0], 14));
      geos.push(prim('cyl', pal.kerb, [o.x, o.h + 0.08, o.z], [o.hx * 2 + 0.2, 0.16, o.hx * 2 + 0.2], [0, 0, 0], 14));
    } else {
      geos.push(prim('box', c, [o.x, o.h / 2, o.z], [o.hx * 2, o.h, o.hz * 2], [0, o.rot ?? 0, 0]));
    }
  }
  // Platforms
  for (const p of a.platforms) {
    geos.push(prim('box', pal.side, [p.x, p.h / 2 - 0.02, p.z], [p.hx * 2, p.h, p.hz * 2]));
    geos.push(prim('box', pal.road2, [p.x, p.h - 0.01, p.z], [p.hx * 2 - 0.4, 0.04, p.hz * 2 - 0.4]));
  }
  // Ramps: wedge rising toward `dir`
  for (const r of a.ramps) {
    const dx = Math.sin(r.dir * DEG);
    const dz = Math.cos(r.dir * DEG);
    const cx = r.x + dx * r.length / 2;
    const cz = r.z + dz * r.length / 2;
    // unit wedge rises toward -Z; rotate so it rises toward dir
    geos.push(prim('wedge', pal.kerb, [cx, r.height / 2, cz], [r.width, r.height, r.length], [0, r.dir + 180, 0]));
  }
  col2.setHex(pal.offroad);
  const mesh = new THREE.Mesh(mergeColored(geos), Materials.flat);
  mesh.receiveShadow = true;
  group.add(mesh);
  // Surrounding ground
  if (a.sky.ground !== null) {
    const ground = new THREE.Mesh(new THREE.CircleGeometry(a.size * 6, 40).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: a.sky.ground }));
    ground.position.y = -0.05;
    group.add(ground);
  }
  return group;
}
