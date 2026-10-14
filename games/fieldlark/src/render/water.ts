/**
 * The river and the ponds: flat water over the round banks, coloured by how far from the edge it is
 * (pale and clear in the shallows, deep blue-green further out), with a lacy foam line at the edge,
 * light bands drifting in the shallows, ripples that catch the sun, and a few sparkles. The river
 * drifts south towards town. Everything moves with farm time and stands still with reduced motion.
 */
import * as THREE from 'three';
import { HOME_POND, POND, RIVER_X0, RIVER_X1, WATER_Y } from '../sim/map';
import { patchMaterial } from './fx';
import { groundUniforms } from './ground';
import { SPAN, WORLD0 } from './land';

export const waterUniforms = {
  wShallow: { value: new THREE.Color(0x6fd3e0) },
  wDeep: { value: new THREE.Color(0x2f8fb5) },
  sunDir: { value: new THREE.Vector3(0.5, 0.7, 0.4).normalize() },
  sunColor: { value: new THREE.Color(0xfff1d6) },
};

const RX0 = RIVER_X0, RX1 = RIVER_X1 + 1;

const material = patchMaterial(new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, depthWrite: false }), {
  key: 'water',
  uniforms: { ...waterUniforms, gWater: groundUniforms.gWater },
  declarations: /* glsl */ `
    uniform sampler2D gWater;
    uniform vec3 wShallow;
    uniform vec3 wDeep;
    uniform vec3 sunDir;
    uniform vec3 sunColor;
    float wSdf(vec2 p) { return (texture2D(gWater, (p - ${WORLD0.toFixed(1)}) / ${SPAN.toFixed(1)}).r * 255.0 - 128.0) / 32.0; }
    /** The river drifts south; ponds stay still. */
    vec2 wFlow(vec2 p) { return vec2(0.0, step(${(RX0 - 0.5).toFixed(1)}, p.x) * step(p.x, ${(RX1 + 0.5).toFixed(1)}) * 0.35); }
    float wRipple(vec2 p) {
      vec2 f = wFlow(p) * fxTime;
      return fxNoise(p * 2.4 - f * 2.4 + vec2(fxTime * 0.22, fxTime * 0.17)) * 0.6 + fxNoise(p * 5.1 - f * 5.1 - vec2(fxTime * 0.31, -fxTime * 0.26)) * 0.4;
    }
    vec3 wNormal;`,
  color: /* glsl */ `
    {
      vec2 p = vFxWorld.xz;
      float depth = clamp(-wSdf(p) - 0.22, 0.0, 3.0);
      vec3 col = mix(wShallow, wDeep, smoothstep(0.0, 1.3, depth));
      // light bands in the shallows
      vec2 f = wFlow(p) * fxTime;
      float band = fxNoise(p * 2.0 - f * 2.0 + vec2(fxTime * 0.3, fxTime * 0.42)) * fxNoise(p * 1.5 - f * 1.5 - vec2(fxTime * 0.24, -fxTime * 0.19));
      col += vec3(0.75, 0.95, 0.9) * smoothstep(0.24, 0.55, band) * 0.22 * (1.0 - smoothstep(0.2, 1.1, depth));
      // a lacy foam line along the edge
      float fn = fxNoise(p * 5.0 + vec2(fxTime * 0.5, -fxTime * 0.35));
      float foam = 1.0 - smoothstep(0.0, 0.035 + 0.07 * fn, depth);
      foam *= 0.5 + 0.5 * smoothstep(0.3, 0.65, fxNoise(p * 3.2 - fxTime * 0.25));
      col = mix(col, vec3(0.97, 0.99, 1.0), foam * 0.7);
      // winter: a rim of frost along the banks, patchy and pale
      float frost = snowAmount * (1.0 - smoothstep(0.05, 0.45, depth)) * smoothstep(0.35, 0.6, fxNoise(p * 4.0));
      col = mix(col, vec3(0.9, 0.95, 1.0), frost * 0.85);
      diffuseColor.rgb = col;
      diffuseColor.a = max(mix(0.5, 0.93, smoothstep(0.0, 0.9, depth)), foam * 0.75);
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
      float tw = fxNoise(p * 11.0 + vec2(fxTime * 0.8, -fxTime * 0.6)) * fxNoise(p * 8.0 - vec2(fxTime * 0.5, fxTime * 0.7));
      float sparkle = smoothstep(0.62, 0.72, tw);
      outgoingLight += sunColor * (spec * 0.9 + sparkle * 0.55) * smoothstep(-0.05, 0.3, sunDir.y);
    }`,
});

/** Flat water over each body of water (the banks under it give the shape). */
export function buildWater(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'water';
  const quad = (x0: number, z0: number, x1: number, z1: number) => {
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 1, Math.max(1, Math.round((z1 - z0) / 8))).rotateX(-Math.PI / 2);
    geo.translate((x0 + x1) / 2, WATER_Y, (z0 + z1) / 2);
    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    mesh.renderOrder = 1;
    g.add(mesh);
  };
  quad(RX0 - 0.6, WORLD0, RX1 + 0.6, WORLD0 + SPAN);
  for (const p of [POND, HOME_POND]) quad(p.cx - p.rx - 1.2, p.cz - p.rz - 1.2, p.cx + p.rx + 1.2, p.cz + p.rz + 1.2);
  return g;
}

/** Water colours for a season and time of day. */
export function setWaterColors(shallow: THREE.Color, deep: THREE.Color) {
  waterUniforms.wShallow.value.copy(shallow);
  waterUniforms.wDeep.value.copy(deep);
}
