// Small shader upgrades for Medium/High (Low keeps the plain materials):
//  - animated water (sea ground plane, creek/ford surfaces over water zones)
//  - wet / glassy road sheen (view-dependent sky reflection + light streaks) on night tracks
//  - item pod shimmer (rainbow sweep)
// All share one time uniform, advanced by RaceView every frame.
import * as THREE from 'three';
import type { TrackModel } from '../sim/track/trackModel';
import { F_WATER } from '../sim/track/trackModel';
import { POD_GLOW_GLSL } from './materials';

export const fxTime = { value: 0 };

/** Lambert water with drifting ripples, a fresnel sky tint and sparkles. Pass the sky colour for the tint. */
export function waterMaterial(color: number, sky: number, opacity = 1): THREE.MeshLambertMaterial {
  const m = new THREE.MeshLambertMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  const skyCol = { value: new THREE.Color(sky) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.fxTime = fxTime;
    sh.uniforms.skyCol = skyCol;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float fxTime;\nuniform vec3 skyCol;')
      .replace(
        '#include <opaque_fragment>',
        `{
          vec2 p = vWPos.xz * 0.18;
          float w = sin(p.x * 1.7 + fxTime * 1.3) * 0.5 + sin(p.y * 2.3 - fxTime * 1.1) * 0.5 + sin((p.x + p.y) * 3.1 + fxTime * 2.0) * 0.35;
          float fres = pow(1.0 - clamp(abs(normalize(vViewPosition).y), 0.0, 1.0), 2.0);
          outgoingLight = mix(outgoingLight, skyCol, 0.18 + fres * 0.45) + vec3(0.06) * w;
          float spark = step(0.985, sin(p.x * 9.0 + fxTime * 3.0) * sin(p.y * 11.0 - fxTime * 2.3));
          outgoingLight += vec3(0.6) * spark * (0.4 + fres);
        }
        #include <opaque_fragment>`,
      );
  };
  m.customProgramCacheKey = () => `water${opacity < 1 ? 't' : ''}`;
  return m;
}

/** Translucent water surfaces over the main road's water zones (creeks / fords). */
export function buildWaterSurfaces(track: TrackModel, sky: number): THREE.Mesh | null {
  const rb = track.main;
  const zones = (track.data.zones ?? []).filter((z) => z.kind === 'water' && z.surface !== false);
  if (!zones.length) return null;
  const pos: number[] = [];
  const add = (i: number, j: number): void => {
    const lift = 0.55;
    const wi = rb.hw[i] + Math.max(rb.shL[i], rb.shR[i]) + 3;
    const wj = rb.hw[j] + Math.max(rb.shL[j], rb.shR[j]) + 3;
    const a = [rb.px[i] - rb.rx[i] * wi, rb.py[i] + lift, rb.pz[i] - rb.rz[i] * wi];
    const b = [rb.px[i] + rb.rx[i] * wi, rb.py[i] + lift, rb.pz[i] + rb.rz[i] * wi];
    const c = [rb.px[j] + rb.rx[j] * wj, rb.py[j] + lift, rb.pz[j] + rb.rz[j] * wj];
    const d = [rb.px[j] - rb.rx[j] * wj, rb.py[j] + lift, rb.pz[j] - rb.rz[j] * wj];
    pos.push(...a, ...c, ...b, ...a, ...d, ...c);
  };
  for (let i = 0; i < rb.n; i += 2) {
    const j = rb.idx(i + 2);
    if (rb.flags[i] & F_WATER && rb.flags[j] & F_WATER) add(i, j);
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  // make sure normals face up (winding varies with the road's direction)
  const n = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let v = 0; v < n.count; v++) if (n.getY(v) < 0) n.setXYZ(v, -n.getX(v), -n.getY(v), -n.getZ(v));
  const mat = waterMaterial(0x3fb8e8, sky, 0.62);
  mat.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'water';
  mesh.renderOrder = 2;
  return mesh;
}

/**
 * A copy of the track material with a view-dependent sheen on upward-facing surfaces: the sky colour reflects at
 * grazing angles and soft light streaks run along the road (wet asphalt / glass).
 */
export function sheenTrackMaterial(base: THREE.MeshLambertMaterial, sky: number, glow: number, strength: number): THREE.MeshLambertMaterial {
  const m = base.clone();
  m.userData = {}; // a per-race copy: let RaceView.dispose free it
  const u = { skyCol: { value: new THREE.Color(sky) }, glowCol: { value: new THREE.Color(glow) }, sheen: { value: strength } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, { fxTime });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNorm;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWNorm = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNorm;\nuniform vec3 skyCol;\nuniform vec3 glowCol;\nuniform float sheen;\nuniform float fxTime;')
      .replace(
        '#include <opaque_fragment>',
        `{
          float up = smoothstep(0.85, 0.98, vWNorm.y);
          float fres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
          float streak = pow(max(0.0, sin(vWPos.x * 0.35 + vWPos.z * 0.21 + fxTime * 0.6)), 24.0) + pow(max(0.0, sin(vWPos.x * 0.13 - vWPos.z * 0.29)), 30.0);
          outgoingLight += up * sheen * (skyCol * fres * 0.9 + glowCol * streak * 0.1);
        }
        #include <opaque_fragment>`,
      );
  };
  m.customProgramCacheKey = () => 'sheen';
  return m;
}

/** Item pods: a rainbow shimmer sweeping over the pod colours. */
export function shimmerMaterial<T extends THREE.Material>(base: T): T {
  const m = base.clone();
  m.userData = {};
  m.onBeforeCompile = (sh) => {
    sh.uniforms.fxTime = fxTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSh;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvSh = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSh;\nuniform float fxTime;')
      .replace(
        '#include <opaque_fragment>',
        `${POD_GLOW_GLSL}
        {
          float t = vSh.y * 2.5 + (vSh.x + vSh.z) * 0.7 - fxTime * 3.0;
          vec3 rainbow = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + t * 0.15));
          float band = pow(0.5 + 0.5 * sin(t), 6.0);
          outgoingLight = mix(outgoingLight, rainbow, 0.25) + band * 0.45;
        }
        #include <opaque_fragment>`,
      );
  };
  m.customProgramCacheKey = () => 'shimmer';
  return m;
}

/** Glossy ice layer with tiny frost sparkles (Medium/High). */
export function iceMaterial(): THREE.MeshPhongMaterial {
  const m = new THREE.MeshPhongMaterial({ color: 0xeaf7ff, specular: 0xbfe3ff, shininess: 110, transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.fxTime = fxTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform float fxTime;')
      .replace(
        '#include <opaque_fragment>',
        `{
          vec2 p = vWPos.xz * 1.7;
          float spark = step(0.992, fract(sin(dot(floor(p), vec2(12.9898, 78.233))) * 43758.5453));
          float tw = 0.5 + 0.5 * sin(fxTime * 5.0 + dot(floor(p), vec2(3.1, 7.7)));
          outgoingLight += vec3(0.9) * spark * tw;
          diffuseColor.a = max(diffuseColor.a, spark * tw);
        }
        #include <opaque_fragment>`,
      );
  };
  m.customProgramCacheKey = () => 'ice';
  return m;
}
