import * as THREE from 'three';

/**
 * Camera-occlusion helpers. Props between the camera and the player dissolve with a
 * screen-door (Bayer) dither computed entirely on the GPU — no per-frame CPU work or
 * uploads; the fade is a smooth function of the camera/player positions, so it fades in and
 * out smoothly as they move. Shadows are unaffected (the depth material is untouched).
 */

/** Shared uniforms (one update per frame for every prop material). */
export const OCCLUSION_UNIFORMS = {
  uCamPos: { value: new THREE.Vector3(0, 1e5, 0) },
  /** Point the camera must see (player's chest). */
  uFocus: { value: new THREE.Vector3(0, -1e5, 0) },
};

/** 4×4 ordered-dither threshold in [0, 1). */
export const BAYER_GLSL = `
float bonkBayer4(vec2 p) {
  int x = int(mod(p.x, 4.0));
  int y = int(mod(p.y, 4.0));
  int i = x + y * 4;
  float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  return (m[i] + 0.5) / 16.0;
}`;

/**
 * How much a prop at `origin` (radius r, height top above origin) occludes the segment from
 * cam to focus: 0 = not at all, 1 = squarely in the way. Mirrors the GLSL in fadeProps()
 * so it can be unit-tested.
 */
export function occlusionFade(cx: number, cy: number, cz: number, fx: number, fy: number, fz: number, ox: number, oy: number, oz: number, r: number, top: number): number {
  const sx = fx - cx;
  const sz = fz - cz;
  const len2 = sx * sx + sz * sz;
  if (len2 < 1e-6) return 0;
  let t = ((ox - cx) * sx + (oz - cz) * sz) / len2;
  if (t <= 0 || t >= 1) return 0;
  const px = cx + sx * t;
  const pz = cz + sz * t;
  const d = Math.hypot(ox - px, oz - pz);
  const lineY = cy + (fy - cy) * t;
  if (lineY > oy + top + 0.5) return 0; // line of sight passes over the prop
  const near = 1 - smooth(r * 0.55, r * 1.15 + 0.6, d);
  t = Math.min(t, 1 - t);
  return near * smooth(0.0, 0.06, t);
}

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/**
 * Patch a prop material (instanced) so its instances dissolve when they block the view.
 * `radius` / `top` describe the prop at scale 1 (scaled per instance).
 */
export function fadeProps(mat: THREE.Material, radius: number, top: number): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCamPos = OCCLUSION_UNIFORMS.uCamPos;
    shader.uniforms.uFocus = OCCLUSION_UNIFORMS.uFocus;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform vec3 uCamPos;
uniform vec3 uFocus;
varying float vOccl;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
{
  vec3 o = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float sc = length(instanceMatrix[0].xyz);
  float r = ${radius.toFixed(3)} * sc;
  float topH = ${top.toFixed(3)} * sc;
  vec2 s = uFocus.xz - uCamPos.xz;
  float len2 = max(dot(s, s), 1e-6);
  float t = dot(o.xz - uCamPos.xz, s) / len2;
  vec2 p = uCamPos.xz + s * t;
  float d = length(o.xz - p);
  float lineY = mix(uCamPos.y, uFocus.y, t);
  float inside = step(0.0, t) * step(t, 1.0) * step(lineY, o.y + topH + 0.5);
  float near = 1.0 - smoothstep(r * 0.55, r * 1.15 + 0.6, d);
  float edge = smoothstep(0.0, 0.06, min(t, 1.0 - t));
  vOccl = inside * near * edge;
}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying float vOccl;\n${BAYER_GLSL}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n  if (vOccl > 0.0 && bonkBayer4(gl_FragCoord.xy) < vOccl * 0.82) discard;`);
  };
  mat.customProgramCacheKey = () => `fadeProps:${radius}:${top}`;
}
