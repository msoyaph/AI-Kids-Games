// What the GPU would draw for the style frame, counted on the CPU (no WebGL): builds the real scene
// pieces, places the real starting camera, culls exactly as three.js and our Culler do, and sums
// draw calls and triangles per tier, at the starting zoom and zoomed all the way out. Used to tune
// the Low tier while the GPU is busy; the browser shots (scripts/shots.mjs) confirm it.
//   npx tsx scripts/drawn.mts [devices=phone,desktop] [detail]   (detail: every scenery layer)
import * as THREE from 'three';
import { styleFrameFarm, styleFramePoints } from '../src/game/showcase';
import { startFrame } from '../src/game/framing';
import { PITCH, placeCamera, YAW_STEP, ZOOM } from '../src/render/camera';
import { buildTerrain, cullTerrain } from '../src/render/terrain';
import { buildWater } from '../src/render/water';
import { Scenery } from '../src/render/scenery';
import { Grass } from '../src/render/grass';
import { blockedTiles, setGroundLand, setGroundSeason, setGroundWear } from '../src/render/ground';
import { ObjectView, onLockedLand } from '../src/render/objects';
import { AnimalView } from '../src/render/animals';
import { Life } from '../src/render/life';
import { Culler } from '../src/render/instanced';
import { QUALITY, type QualityTier } from '../src/render/quality';
import { Sky } from '../src/render/sky';
import { openArea, type Insets } from '../src/ui/layout';
import { seasonOf } from '../src/sim/clock';

const DEVICES: Record<string, { w: number; h: number; insets: Insets }> = {
  phone: { w: 390, h: 844, insets: { top: 47, right: 0, bottom: 34, left: 0 } },
  desktop: { w: 1440, h: 900, insets: { top: 0, right: 0, bottom: 0, left: 0 } },
};
const devices = (process.argv[2] ?? 'phone,desktop').split(',');
const detail = process.argv[3] === 'detail';
const terrain = buildTerrain(), water = buildWater();
const rows: string[] = [];
for (const device of devices) {
  const d = DEVICES[device]!;
  for (const tier of ['low', 'medium', 'high'] as QualityTier[]) {
    const spec = QUALITY[tier];
    const farm = styleFrameFarm(7);
    const season = seasonOf(farm.t);
    setGroundLand(farm.unlocked); setGroundSeason(season); setGroundWear(farm);
    const scenery = new Scenery(); scenery.build(season, spec.decor);
    const objects = new ObjectView(); objects.sync(farm, onLockedLand(farm));
    const grass = new Grass(); grass.setSeason(season); grass.setBlocked(blockedTiles(farm), 1);
    const animals = new AnimalView(); animals.update(farm, 10, 0, false);
    const life = new Life(); life.setSeason(season); life.setFarm(farm, objects.ready);
    const sky = new Sky();
    const scene = new THREE.Scene();
    scene.add(sky.mesh, terrain, water, scenery.group, grass.group, objects.group, animals.group, life.group);
    const f = startFrame(farm, d.w, d.h, d.insets, styleFramePoints(farm), [0]);
    for (const [label, zoom] of [['start', f.zoom], ['zoomed out', ZOOM.min]] as const) {
      const cam = new THREE.PerspectiveCamera();
      const open = openArea(d.w, d.h, d.insets);
      const v = { x: f.x, z: f.z, y: 0, yaw: f.yawStep * YAW_STEP, zoom };
      placeCamera(cam, v, d.w, d.h, { x: open.x + open.w / 2, y: open.y + open.h / 2 });
      sky.follow(cam);
      const across = Math.max(d.w, d.h / Math.sin(PITCH)) / zoom;
      const culler = new Culler();
      culler.update(cam, v, d.w, d.h, across, [...scenery.layers, ...objects.layerList]);
      cullTerrain(terrain, culler.frustum);
      grass.update(v.x, v.z, Math.hypot(d.w, d.h / Math.sin(PITCH)) / zoom * 0.6 + 1, spec.grass);
      life.update(0.016, cam, v, spec.particles, false);
      scene.updateMatrixWorld(true);
      const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
      let calls = 0, tris = 0;
      const byGroup = new Map<string, [number, number]>();
      const tally = (root: THREE.Object3D, name: string) => root.traverse(o => {
        const m = o as THREE.Mesh;
        if (!m.isMesh || !m.visible) return;
        let p: THREE.Object3D | null = m; let hidden = false;
        while (p) { if (!p.visible) hidden = true; p = p.parent; }
        if (hidden) return;
        const inst = (m as unknown as THREE.InstancedMesh).isInstancedMesh ? (m as unknown as THREE.InstancedMesh).count : 1;
        if (!inst) return;
        if (m.frustumCulled && !frustum.intersectsObject(m)) return;
        const g = m.geometry;
        const t = (g.index ? g.index.count : g.getAttribute('position').count) / 3 * inst;
        calls++; tris += t;
        const e = byGroup.get(name) ?? [0, 0]; e[0]++; e[1] += t; byGroup.set(name, e);
      });
      tally(sky.mesh, 'sky'); tally(terrain, 'ground'); tally(water, 'water'); if (detail) scenery.group.children.forEach((c, i) => tally(c, `scenery#${i}(${(c as THREE.Mesh).geometry.getAttribute('position').count / 3}t)`)); else tally(scenery.group, 'scenery'); tally(grass.group, 'grass');
      tally(objects.group, 'farm'); tally(animals.group, 'animals'); tally(life.group, 'life');
      const post = spec.post ? 2 + (spec.ssao ? 1 : 0) : 0;
      const parts = [...byGroup].map(([k, [c, t]]) => `${k} ${c}/${Math.round(t / 1000)}k`).join(', ');
      rows.push(`${device.padEnd(7)} ${tier.padEnd(6)} ${label.padEnd(10)} zoom ${String(Math.round(zoom)).padStart(3)}: ${String(calls + post).padStart(3)} draw calls, ${String(Math.round(tris / 1000)).padStart(4)}k triangles  (${parts}${post ? `, post ${post}` : ''})`);
    }
  }
}
console.log(rows.join('\n'));
