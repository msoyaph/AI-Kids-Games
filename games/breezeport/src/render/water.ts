/**
 * The bay: flat water over the sloping beach and the sea bed, coloured by how far out it is (pale
 * sea-glass in the shallows, deep blue further out), with a lacy foam line where little waves wash
 * up the sand, gentle swells that catch the sun, and a few sparkles. It moves with town time and
 * stands still with reduced motion. (The shader follows games/fieldlark/src/render/water.ts; the
 * depth comes from the shore's curve instead of a distance texture, and the waves wash in.)
 */
import * as THREE from 'three';
import { WATER_Y } from '../sim/map';
import { patchMaterial } from './fx';
import { SHORE_GLSL } from './ground';
import { SPAN, WORLD0 } from './land';

export const waterUniforms = {
  wShallow: { value: new THREE.Color(0x6fd3e0) },
  wDeep: { value: new THREE.Color(0x2f8fb5) },
  sunDir: { value: new THREE.Vector3(0.5, 0.7, 0.4).normalize() },
  sunColor: { value: new THREE.Color(0xfff1d6) },
};

const material = patchMaterial(new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, depthWrite: false }), {
  key: 'water',
  uniforms: waterUniforms,
  declarations: /* glsl */ `
    uniform vec3 wShallow;
    uniform vec3 wDeep;
    uniform vec3 sunDir;
    uniform vec3 sunColor;
    ${SHORE_GLSL}
    float wRipple(vec2 p) {
      return fxNoise(p * 1.6 + vec2(fxTime * 0.16, fxTime * 0.21)) * 0.6 + fxNoise(p * 4.1 - vec2(fxTime * 0.27, -fxTime * 0.2)) * 0.4;
    }
    vec3 wNormal;`,
  color: /* glsl */ `
    {
      vec2 p = vFxWorld.xz;
      float depth = clamp(-gInland(p) + 0.25, 0.0, 12.0);
      vec3 col = mix(wShallow, wDeep, smoothstep(0.2, 4.5, depth));
      // light bands in the shallows
      float band = fxNoise(p * 1.4 + vec2(fxTime * 0.25, fxTime * 0.32)) * fxNoise(p * 1.1 - vec2(fxTime * 0.2, -fxTime * 0.15));
      col += vec3(0.75, 0.95, 0.9) * smoothstep(0.24, 0.55, band) * 0.2 * (1.0 - smoothstep(0.4, 2.5, depth));
      // little waves washing up the beach: foam lines that roll in and fade
      float wash = fract(fxTime * 0.11 + fxNoise(vec2(p.x * 0.3, 1.0)) * 0.4);
      float line = 1.0 - smoothstep(0.0, 0.06 + 0.05 * fxNoise(p * 5.0), abs(depth - (1.0 - wash) * 0.9));
      float foam = (1.0 - smoothstep(0.0, 0.08 + 0.08 * fxNoise(p * 5.0 + fxTime * 0.3), depth)) + line * (1.0 - wash) * 0.7;
      foam *= 0.55 + 0.45 * smoothstep(0.3, 0.65, fxNoise(p * 3.2 - fxTime * 0.25));
      col = mix(col, vec3(0.97, 0.99, 1.0), clamp(foam, 0.0, 1.0) * 0.75);
      float frost = snowAmount * (1.0 - smoothstep(0.05, 0.6, depth)) * smoothstep(0.35, 0.6, fxNoise(p * 4.0));
      col = mix(col, vec3(0.9, 0.95, 1.0), frost * 0.8);
      diffuseColor.rgb = col;
      diffuseColor.a = max(mix(0.45, 0.96, smoothstep(0.0, 1.4, depth)), clamp(foam, 0.0, 1.0) * 0.8);
    }`,
  normal: /* glsl */ `
    {
      vec2 p = vFxWorld.xz;
      float e = 0.06;
      float h0 = wRipple(p), hx = wRipple(p + vec2(e, 0.0)), hz = wRipple(p + vec2(0.0, e));
      wNormal = normalize(vec3(-(hx - h0) / e * 0.14, 1.0, -(hz - h0) / e * 0.14));
      normal = normalize((viewMatrix * vec4(wNormal, 0.0)).xyz);
    }`,
  light: /* glsl */ `
    {
      // glow from within (water is never dark), the sun's glint on ripples, and a few sparkles
      outgoingLight += diffuseColor.rgb * 0.16;
      vec3 V = normalize(cameraPosition - vFxWorld);
      float spec = pow(max(dot(reflect(-sunDir, wNormal), V), 0.0), 90.0);
      vec2 p = vFxWorld.xz;
      float tw = fxNoise(p * 9.0 + vec2(fxTime * 0.8, -fxTime * 0.6)) * fxNoise(p * 6.5 - vec2(fxTime * 0.5, fxTime * 0.7));
      // a few sparkles near the shore and where the sun glints; the open bay stays calm (no speckle when far)
      float near = 1.0 - smoothstep(1.5, 6.0, -gInland(p));
      float sparkle = smoothstep(0.7, 0.78, tw) * max(near, spec * 3.0);
      outgoingLight += sunColor * (spec * 0.9 + sparkle * 0.45) * smoothstep(-0.05, 0.3, sunDir.y);
    }`,
});

/** The bay: one flat sheet from the beach out past the horizon's haze. */
export function buildWater(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'water';
  const x0 = WORLD0 - 60, x1 = WORLD0 + SPAN + 60, z0 = WORLD0 - 90, z1 = 7;
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 12, 10).rotateX(-Math.PI / 2);
  geo.translate((x0 + x1) / 2, WATER_Y, (z0 + z1) / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  g.add(mesh);
  return g;
}

/** Water colours for a season and time of day. */
export function setWaterColors(shallow: THREE.Color, deep: THREE.Color) {
  waterUniforms.wShallow.value.copy(shallow);
  waterUniforms.wDeep.value.copy(deep);
}
