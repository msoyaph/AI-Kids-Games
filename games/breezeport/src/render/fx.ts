/**
 * Adapted from games/fieldlark/src/render/fx.ts. Changed for the town: the haze is measured from the
 * town's edge, the painted patterns add brick, awning stripes and window glass, and the instance
 * colour tints the parts marked TINT (geo.ts), patterned or not, so one house model takes any paint.
 *
 * Shared shader pieces and uniforms for the whole town: soft value noise, wind sway for plants (in the
 * vertex shader, so it costs almost nothing), drifting cloud shadows, the warm rim light, and the haze
 * that fades the countryside into the sky. Every material calls `patchMaterial`, so one set of
 * uniforms drives them all. Reduced motion sets the wind and the cloud drift to zero.
 */
import * as THREE from 'three';
import { H, W } from '../sim/map';

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
  /** Snow lying on roofs, tops and treetops (0..1, winter). */
  snowAmount: { value: 0 },
  /** Windows and lamps lit (0 by day, 1 at night). */
  nightGlow: { value: 0 },
  /** A map is showing: buildings and props fade to soft grey so the ground's colours read (0..1). */
  mapDim: { value: 0 },
};

/** How hazy a world point is: nothing in the town, more and more out over the countryside and the bay. */
export const HAZE_GLSL = /* glsl */ `
float fxHaze(vec3 w) {
  float d = length(max(vec2(0.0), max(-w.xz, w.xz - vec2(${W}.0, ${H}.0))));
  return smoothstep(4.0, 30.0, d) * 0.86;
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
 * 1 clapboard siding, 2 upright boards, 3 roof tiles, 4 stone, 5 brick, 6 bark, 7 awning stripes,
 * 8 keep (plain), 9 glow (lamps: lit at night), 10 window glass (panes with a white cross; lit at
 * night). Each part of a model says which (geo.ts PAT); 16 is added for parts the instance colour
 * tints (TINT), so the shader reads the pattern as mod(id, 16).
 */
export const PATTERN_GLSL = /* glsl */ `
vec3 fxPattern(vec3 col, float pid, vec3 op, vec3 on) {
  if (pid < 0.5 || (pid > 7.5 && pid < 9.5) || pid > 10.5) return col;
  vec3 an = abs(on);
  vec2 uv = an.x > an.z ? op.zy : op.xy;
  float k = 1.0;
  if ((pid < 2.5 || (pid > 3.5 && pid < 5.5)) && an.y > 0.75) uv = op.xz;
  if (pid < 1.5) {
    // clapboard: overlapping horizontal boards with a shadow under each lip
    float v = uv.y * 11.0, f = fract(v);
    float lip = mix(0.74, 1.04, smoothstep(0.0, 0.35, f));
    float grain = fxNoise(vec2(uv.x * 3.0, v * 4.0));
    k = lip * (0.95 + 0.08 * grain);
  } else if (pid < 2.5) {
    float u = uv.x * 7.0, col_ = floor(u), f = fract(u);
    float seam = smoothstep(0.0, 0.1, f) * smoothstep(1.0, 0.9, f);
    float grain = fxNoise(vec2(u * 4.0, uv.y * 2.5)) * 0.5 + fxNoise(vec2(u * 1.5, uv.y * 12.0)) * 0.5;
    k = mix(0.7, 1.0, seam) * (0.9 + 0.14 * fxHash(vec2(col_, 7.0))) * (0.93 + 0.1 * grain);
  } else if (pid < 3.5) {
    float v = uv.y * 9.0, row = floor(v), f = fract(v);
    float u = uv.x * 5.5 + mod(row, 2.0) * 0.5, cell = floor(u), fu = fract(u);
    float edge = smoothstep(0.0, 0.08, fu) * smoothstep(1.0, 0.92, fu);
    float overlap = mix(0.64, 1.04, smoothstep(0.0, 0.45, f));
    k = overlap * mix(0.8, 1.0, edge) * (0.88 + 0.2 * fxHash(vec2(cell, row)));
  } else if (pid < 4.5) {
    float v = uv.y * 4.6, row = floor(v);
    float u = uv.x * 3.0 + mod(row, 2.0) * 0.5 + fxHash(vec2(row, 1.0)) * 0.3;
    vec2 f = vec2(fract(u), fract(v));
    float stone = smoothstep(0.0, 0.08, f.x) * smoothstep(1.0, 0.92, f.x) * smoothstep(0.0, 0.12, f.y) * smoothstep(1.0, 0.88, f.y);
    k = mix(1.12, 0.84 + 0.26 * fxHash(vec2(floor(u), row)), stone) * (0.92 + 0.12 * fxNoise(uv * 9.0));
  } else if (pid < 5.5) {
    // brick: small bricks in running bond, pale mortar
    float v = uv.y * 13.0, row = floor(v);
    float u = uv.x * 6.0 + mod(row, 2.0) * 0.5;
    vec2 f = vec2(fract(u), fract(v));
    float brick = smoothstep(0.0, 0.07, f.x) * smoothstep(1.0, 0.93, f.x) * smoothstep(0.0, 0.14, f.y) * smoothstep(1.0, 0.86, f.y);
    k = mix(1.28, 0.86 + 0.24 * fxHash(vec2(floor(u), row)), brick);
  } else if (pid < 6.5) {
    vec2 bu = vec2(atan(op.z, op.x) * 2.0, op.y);
    k = 0.76 + 0.32 * fxNoise(vec2(bu.x * 4.0, bu.y * 3.0));
  } else if (pid < 7.5) {
    // awning stripes: the part's colour and white, in wide bands
    float sx = an.x > an.z ? op.z : op.x;
    float band = step(0.5, fract(sx * 4.5));
    col = mix(col, vec3(0.99, 0.98, 0.95), band);
    k = 1.0;
  } else {
    // window glass: a sky reflection, brighter towards the top, with a soft diagonal sheen
    float sheen = smoothstep(0.42, 0.5, fract((uv.x + uv.y) * 1.6)) * smoothstep(0.62, 0.5, fract((uv.x + uv.y) * 1.6));
    col = mix(col * 0.78, col * 1.15, smoothstep(0.0, 1.0, fract(uv.y * 1.7))) + vec3(0.18) * sheen;
    k = 1.0;
  }
  // a painterly wobble in every pattern
  return col * k * (0.96 + 0.08 * fxNoise(op.xy * 3.0 + op.zz * 2.0));
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
   * The instance colour tints only the parts marked TINT (pattern id + 16): a house's walls but not its
   * trim, a car's body but not its windows, a tree's canopy but not its bark. One layer then draws
   * every paint job in one draw call.
   */
  tint?: boolean;
  /** Snow settles on what faces the sky (in winter, `snowAmount`). */
  snow?: boolean;
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
        ${o.patterns ? 'vPat = mod(pattern, 16.0); vObjPos = position; vObjN = normal;' : ''}
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
          if ( pattern > 15.5 ) vColor.rgb *= instanceColor.rgb;
        #endif`);
    }
    let frag = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform float fxTime;
      uniform float cloudStrength;
      uniform float cloudDrift;
      uniform vec3 rimColor;
      uniform float rimStrength;
      uniform vec3 hazeColor;
      uniform float snowAmount;
      uniform float nightGlow;
      uniform float mapDim;
      varying vec3 vFxWorld;
      ${NOISE_GLSL}
      ${CLOUD_GLSL}
      ${HAZE_GLSL}
      ${o.patterns ? `varying float vPat;\nvarying vec3 vObjPos;\nvarying vec3 vObjN;\n${PATTERN_GLSL}` : ''}
      ${o.declarations ?? ''}`);
    if (o.patterns) frag = frag.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = fxPattern(diffuseColor.rgb, vPat, vObjPos, normalize(vObjN));');
    if (o.color) frag = frag.replace('#include <color_fragment>', `#include <color_fragment>\n${o.color}`);
    if (o.normal) frag = frag.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${o.normal}`);
    // snow: whiten what faces the sky (the normal is in view space; this is the world's up), in soft patches
    if (o.snow) frag = frag.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      if (snowAmount > 0.0) {
        float up = dot(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz));
        float lie = smoothstep(0.45, 0.8, up) * smoothstep(0.3, 0.6, fxNoise(vFxWorld.xz * 2.7) * 0.7 + 0.3) * snowAmount;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.96, 0.97, 1.0), lie);
      }`);
    if (o.clouds !== false) frag = frag.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\nreflectedLight.directDiffuse *= fxCloud(vFxWorld.xz);`);
    let end = '';
    if (o.rim) end += 'outgoingLight += rimColor * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.4) * rimStrength;\n';
    // windows and lamps: a warm light at night (bright enough for the bloom pass to pick up)
    if (o.patterns) end += 'if (vPat > 8.5) outgoingLight = mix(outgoingLight, vec3(1.0, 0.82, 0.5) * 1.9, nightGlow * 0.92);\n';
    if (o.light) end += `${o.light}\n`;
    // with a map showing, things on the ground fade to a soft grey (the ground carries the colours)
    if (o.patterns || o.tint) end += 'outgoingLight = mix(outgoingLight, vec3(dot(outgoingLight, vec3(0.3, 0.55, 0.15))) * 1.08 + 0.05, mapDim * 0.7);\n';
    if (!o.noHaze) end += 'outgoingLight = mix(outgoingLight, hazeColor, fxHaze(vFxWorld));\n';
    frag = frag.replace('#include <opaque_fragment>', `${end}#include <opaque_fragment>`);
    sh.fragmentShader = frag;
  };
  m.customProgramCacheKey = () => o.key;
  m.userData.shared = true;
  return m;
}
