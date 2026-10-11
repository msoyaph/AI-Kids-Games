// "Rolling world" horizon: every material bends world-space geometry downward with
// distance from the camera focus. Lighting/shadow lookups stay in world space.
import * as THREE from 'three';

export const sharedUniforms = {
  uCurveOrigin: { value: new THREE.Vector3() },
  uCurveK: { value: 0.0068 },
  uTime: { value: 0 },
};

const HEADER = /* glsl */ `
uniform vec3 uCurveOrigin;
uniform float uCurveK;
uniform float uTime;
`;

const PROJECT = /* glsl */ `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
vec4 lcW = modelMatrix * mvPosition;
#ifdef LC_SWAY
  float lcS = sin(uTime * 1.6 + lcW.x * 0.8 + lcW.z * 0.6) * 0.07 * max(transformed.y, 0.0);
  lcW.x += lcS;
  lcW.z += lcS * 0.4;
#endif
#ifdef LC_WAVES
  lcW.y += sin(uTime * 1.1 + lcW.x * 0.55) * 0.035 + cos(uTime * 0.9 + lcW.z * 0.7) * 0.035;
#endif
vec2 lcD = lcW.xz - uCurveOrigin.xz;
lcW.y -= lcD.y * lcD.y * uCurveK + lcD.x * lcD.x * uCurveK * 0.3;
mvPosition = viewMatrix * lcW;
gl_Position = projectionMatrix * mvPosition;
`;

export interface CurveOpts {
  sway?: boolean;
  waves?: boolean;
}

/** Patch a material in-place so it participates in the curved world. */
export function curved<T extends THREE.Material>(mat: T, opts: CurveOpts = {}): T {
  const defines: string[] = [];
  if (opts.sway) defines.push('#define LC_SWAY');
  if (opts.waves) defines.push('#define LC_WAVES');
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCurveOrigin = sharedUniforms.uCurveOrigin;
    shader.uniforms.uCurveK = sharedUniforms.uCurveK;
    shader.uniforms.uTime = sharedUniforms.uTime;
    shader.vertexShader =
      defines.join('\n') + '\n' + HEADER + shader.vertexShader.replace('#include <project_vertex>', PROJECT);
  };
  mat.customProgramCacheKey = () => 'lc' + (opts.sway ? 's' : '') + (opts.waves ? 'w' : '');
  return mat;
}

const matCache = new Map<string, THREE.MeshLambertMaterial>();

/** Shared flat-shaded Lambert material for a color (curved). */
export function flatMat(color: number, opts: { emissive?: number; transparent?: boolean; opacity?: number } = {}): THREE.MeshLambertMaterial {
  const key = `${color}|${opts.emissive ?? 0}|${opts.opacity ?? 1}`;
  let m = matCache.get(key);
  if (!m) {
    m = curved(
      new THREE.MeshLambertMaterial({
        color,
        flatShading: true,
        emissive: opts.emissive ?? 0,
        transparent: opts.transparent ?? (opts.opacity !== undefined && opts.opacity < 1),
        opacity: opts.opacity ?? 1,
      }),
    );
    matCache.set(key, m);
  }
  return m;
}

/** Vertex-colored flat material (instances / merged meshes). */
export function vcolMat(opts: CurveOpts = {}): THREE.MeshLambertMaterial {
  return curved(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), opts);
}
