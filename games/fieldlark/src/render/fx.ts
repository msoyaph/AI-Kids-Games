/**
 * Shared shader pieces and uniforms for the whole farm: soft value noise, wind sway for plants (in the
 * vertex shader, so it costs almost nothing), drifting cloud shadows, the warm rim light, and the haze
 * that fades the countryside into the sky. Every material calls `patchMaterial`, so one set of
 * uniforms drives them all. Reduced motion sets the wind and the cloud drift to zero.
 */
import * as THREE from 'three';

export const fxUniforms = {
  fxTime: { value: 0 },
  /** 0 with reduced motion. */
  windStrength: { value: 1 },
  cloudStrength: { value: 1 },
  /** How fast cloud shadows drift (0 with reduced motion). */
  cloudDrift: { value: 1 },
  rimColor: { value: new THREE.Color(0xfff1d0) },
  rimStrength: { value: 0.35 },
  /** The sky's colour at the horizon: far land fades into it. */
  hazeColor: { value: new THREE.Color(0xdfeaf0) },
};

/** How hazy a world point is: nothing on the farm, more and more out across the countryside. */
export const HAZE_GLSL = /* glsl */ `
float fxHaze(vec3 w) {
  vec2 o = max(vec2(0.0), max(-w.xz, w.xz - 56.0));
  return smoothstep(3.0, 25.0, length(o)) * 0.88;
}`;

export const NOISE_GLSL = /* glsl */ `
float fxHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float fxNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(fxHash(i), fxHash(i + vec2(1.0, 0.0)), u.x), mix(fxHash(i + vec2(0.0, 1.0)), fxHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fxFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * fxNoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
`;

/** How much a point is shaded by drifting clouds (1 = full sun). */
export const CLOUD_GLSL = /* glsl */ `
float fxCloud(vec2 xz) {
  vec2 p = xz * 0.045 + vec2(fxTime * 0.018, fxTime * 0.011) * cloudDrift;
  float c = fxFbm(p);
  return 1.0 - smoothstep(0.52, 0.72, c) * 0.38 * cloudStrength;
}`;

/**
 * Hand-painted surface patterns, drawn from the model's own coordinates (no textures to load):
 * 1 planks, 2 upright boards, 3 shingles, 4 stone, 5 straw, 6 bark, 7 moss on top. Each part of a
 * model says which (geo.ts PAT); everything else is left as it is.
 */
export const PATTERN_GLSL = /* glsl */ `
vec3 fxPattern(vec3 col, float pid, vec3 op, vec3 on) {
  if (pid < 0.5 || pid > 7.5) return col;
  vec3 an = abs(on);
  vec2 uv = an.x > an.z ? op.zy : op.xy;
  float k = 1.0;
  if (pid < 2.5 && an.y > 0.75) uv = op.xz;
  if (pid < 1.5) {
    float v = uv.y * 7.5, row = floor(v), f = fract(v);
    float seam = smoothstep(0.0, 0.1, f) * smoothstep(1.0, 0.9, f);
    float board = fxHash(vec2(row, floor(uv.x * 1.2 + fxHash(vec2(row, 3.0)) * 3.0)));
    float grain = fxNoise(vec2(uv.x * 2.5, v * 5.0)) * 0.5 + fxNoise(vec2(uv.x * 11.0, v * 1.5)) * 0.5;
    k = mix(0.66, 1.0, seam) * (0.88 + 0.16 * board) * (0.92 + 0.12 * grain);
  } else if (pid < 2.5) {
    float u = uv.x * 7.0, col_ = floor(u), f = fract(u);
    float seam = smoothstep(0.0, 0.1, f) * smoothstep(1.0, 0.9, f);
    float grain = fxNoise(vec2(u * 4.0, uv.y * 2.5)) * 0.5 + fxNoise(vec2(u * 1.5, uv.y * 12.0)) * 0.5;
    k = mix(0.66, 1.0, seam) * (0.88 + 0.16 * fxHash(vec2(col_, 7.0))) * (0.92 + 0.12 * grain);
  } else if (pid < 3.5) {
    float v = uv.y * 9.0, row = floor(v), f = fract(v);
    float u = uv.x * 5.5 + mod(row, 2.0) * 0.5, cell = floor(u), fu = fract(u);
    float edge = smoothstep(0.0, 0.08, fu) * smoothstep(1.0, 0.92, fu);
    float overlap = mix(0.62, 1.04, smoothstep(0.0, 0.45, f));
    k = overlap * mix(0.78, 1.0, edge) * (0.86 + 0.22 * fxHash(vec2(cell, row)));
  } else if (pid < 4.5) {
    float v = uv.y * 4.6, row = floor(v);
    float u = uv.x * 3.0 + mod(row, 2.0) * 0.5 + fxHash(vec2(row, 1.0)) * 0.3;
    vec2 f = vec2(fract(u), fract(v));
    float stone = smoothstep(0.0, 0.08, f.x) * smoothstep(1.0, 0.92, f.x) * smoothstep(0.0, 0.12, f.y) * smoothstep(1.0, 0.88, f.y);
    k = mix(1.14, 0.82 + 0.3 * fxHash(vec2(floor(u), row)), stone) * (0.9 + 0.14 * fxNoise(uv * 9.0));
  } else if (pid < 5.5) {
    k = 0.78 + 0.34 * (fxNoise(vec2(uv.x * 24.0, uv.y * 3.0)) * 0.6 + fxNoise(vec2(uv.x * 55.0, uv.y * 7.0)) * 0.4);
  } else if (pid < 6.5) {
    vec2 bu = vec2(atan(op.z, op.x) * 2.0, op.y);
    k = 0.76 + 0.32 * fxNoise(vec2(bu.x * 4.0, bu.y * 3.0));
  } else {
    float m = smoothstep(0.3, 0.8, on.y + (fxNoise(op.xz * 7.0 + op.y * 3.0) - 0.5) * 0.7);
    col = mix(col, vec3(0.2, 0.36, 0.08), m * 0.8);
    k = 0.9 + 0.18 * fxNoise(op.xz * 12.0 + op.y * 6.0);
  }
  // a painterly wobble in every pattern
  return col * k * (0.95 + 0.1 * fxNoise(op.xy * 3.0 + op.zz * 2.0));
}`;

export type Wind = 'none' | 'plant' | 'tree' | 'grass';

interface PatchOpts {
  key: string;
  rim?: boolean;
  clouds?: boolean;
  wind?: Wind;
  /** Extra fragment code run after the colour is set (can change diffuseColor; vFxWorld is available). */
  color?: string;
  /** Extra uniforms and declarations for `color` (fragment shader). */
  uniforms?: Record<string, THREE.IUniform>;
  declarations?: string;
  /** Extra vertex code after the position is projected, and its declarations. */
  vertex?: string;
  vertexDeclarations?: string;
  /** Extra fragment code after the normal is ready (can change `normal`, in view space). */
  normal?: string;
  /** Extra fragment code at the very end of lighting (can change `outgoingLight`). */
  light?: string;
  /** Skip the haze (things that are never far away). */
  noHaze?: boolean;
  /** Draw the painted patterns (geometry must carry the `pattern` attribute: geo.ts merge adds it). */
  patterns?: boolean;
  /**
   * The instance colour tints only unpatterned parts (pattern 0): a tree's canopy but not its bark, a
   * flower's petals but not its stem (PAT.keep). One layer then draws several looks.
   */
  tint?: boolean;
}

/**
 * Adds our shared effects to a Lambert material: world position, wind, cloud shadows, rim light, and
 * optional extra colour code.
 */
export function patchMaterial<T extends THREE.MeshLambertMaterial>(m: T, o: PatchOpts): T {
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, fxUniforms, o.uniforms ?? {});
    const windCode = o.wind === 'plant'
      ? 'float sway = smoothstep(0.02, 0.6, position.y) * 0.05;'
      : o.wind === 'tree'
        ? 'float sway = smoothstep(0.55, 1.6, position.y) * 0.045;'
        : o.wind === 'grass'
          ? 'float sway = smoothstep(0.0, 0.3, position.y) * 0.09;'
          : '';
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nuniform float fxTime;\nuniform float windStrength;\nvarying vec3 vFxWorld;\n${o.patterns || o.tint ? 'attribute float pattern;' : ''}\n${o.patterns ? 'varying float vPat;\nvarying vec3 vObjPos;\nvarying vec3 vObjN;' : ''}\n${o.vertexDeclarations ?? ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        ${windCode ? `{
          vec4 wb = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          #ifdef USE_INSTANCING
            wb = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          #endif
          ${windCode}
          float ph = fxTime * 1.6 + wb.x * 0.55 + wb.z * 0.37;
          transformed.x += (sin(ph) * 0.7 + sin(ph * 2.3 + 1.7) * 0.3) * sway * windStrength;
          transformed.z += (cos(ph * 0.8 + 0.6) * 0.5) * sway * windStrength;
        }` : ''}`)
      .replace('#include <project_vertex>', `#include <project_vertex>
        {
          vec4 fxw = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            fxw = instanceMatrix * fxw;
          #endif
          vFxWorld = (modelMatrix * fxw).xyz;
        }
        ${o.patterns ? 'vPat = pattern; vObjPos = position; vObjN = normal;' : ''}
        ${o.vertex ?? ''}`);
    if (o.tint) {
      sh.vertexShader = sh.vertexShader.replace('#include <color_vertex>', /* glsl */ `
        #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
          vColor = vec4( 1.0 );
        #endif
        #ifdef USE_COLOR
          vColor.rgb *= color.rgb;
        #endif
        #ifdef USE_INSTANCING_COLOR
          if ( pattern < 0.5 ) vColor.rgb *= instanceColor.rgb;
        #endif`);
    }
    let frag = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform float fxTime;
      uniform float cloudStrength;
      uniform float cloudDrift;
      uniform vec3 rimColor;
      uniform float rimStrength;
      uniform vec3 hazeColor;
      varying vec3 vFxWorld;
      ${NOISE_GLSL}
      ${CLOUD_GLSL}
      ${HAZE_GLSL}
      ${o.patterns ? `varying float vPat;\nvarying vec3 vObjPos;\nvarying vec3 vObjN;\n${PATTERN_GLSL}` : ''}
      ${o.declarations ?? ''}`);
    if (o.patterns) frag = frag.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = fxPattern(diffuseColor.rgb, vPat, vObjPos, normalize(vObjN));');
    if (o.color) frag = frag.replace('#include <color_fragment>', `#include <color_fragment>\n${o.color}`);
    if (o.normal) frag = frag.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${o.normal}`);
    if (o.clouds !== false) frag = frag.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\nreflectedLight.directDiffuse *= fxCloud(vFxWorld.xz);`);
    let end = '';
    if (o.rim) end += 'outgoingLight += rimColor * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.4) * rimStrength;\n';
    if (o.light) end += `${o.light}\n`;
    if (!o.noHaze) end += 'outgoingLight = mix(outgoingLight, hazeColor, fxHaze(vFxWorld));\n';
    frag = frag.replace('#include <opaque_fragment>', `${end}#include <opaque_fragment>`);
    sh.fragmentShader = frag;
  };
  m.customProgramCacheKey = () => o.key;
  m.userData.shared = true;
  return m;
}
