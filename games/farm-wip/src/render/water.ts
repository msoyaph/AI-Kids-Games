/**
 * The river and the pond: one flat mesh at the water's surface, slightly see-through so the bed
 * shows, with soft moving light bands (a tiny shader tweak; still with reduced motion).
 */
import * as THREE from 'three';
import { H, tileAt, W, WATER_Y } from '../sim/map';

export const waterUniforms = {
  time: { value: 0 },
  shallow: { value: new THREE.Color(0x5cc2e0) },
  deep: { value: new THREE.Color(0x3f9fc7) },
  sparkle: { value: new THREE.Color(0xffffff) },
};

export function buildWater(): THREE.Mesh {
  const pos: number[] = [];
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      if (!tileAt(x, z).water) continue;
      const y = WATER_Y;
      for (const [px, pz] of [[x, z], [x, z + 1], [x + 1, z + 1], [x, z], [x + 1, z + 1], [x + 1, z]] as const) pos.push(px, y, pz);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.86 });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { wTime: waterUniforms.time, wShallow: waterUniforms.shallow, wDeep: waterUniforms.deep, wSparkle: waterUniforms.sparkle });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float wTime;\nuniform vec3 wShallow;\nuniform vec3 wDeep;\nuniform vec3 wSparkle;\nvarying vec3 vWorld;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float band = sin(vWorld.x * 1.7 + vWorld.z * 0.6 + wTime * 0.9) * 0.5 + 0.5;
        float band2 = sin(vWorld.z * 2.3 - vWorld.x * 0.4 - wTime * 1.3) * 0.5 + 0.5;
        vec3 water = mix(wDeep, wShallow, band * 0.6 + 0.2);
        water = mix(water, wSparkle, smoothstep(0.93, 1.0, band * band2) * 0.55);
        diffuseColor.rgb = water;`,
      );
  };
  m.customProgramCacheKey = () => 'farm-water';
  const mesh = new THREE.Mesh(g, m);
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  mesh.name = 'water';
  return mesh;
}
