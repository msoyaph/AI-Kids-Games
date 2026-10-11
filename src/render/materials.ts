import * as THREE from 'three';

/** Shared materials (few materials = fewer shader programs and state changes). */
export const Materials = {
  /** Faceted, vertex-coloured: props, track, karts. */
  flat: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  /** Double-sided faceted (procedural track geometry). */
  flatDouble: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }),
  /** Smooth, vertex-coloured: characters. */
  smooth: new THREE.MeshLambertMaterial({ vertexColors: true }),
  /** Unlit vertex colours (sky, glows, UI-ish 3D). */
  basic: new THREE.MeshBasicMaterial({ vertexColors: true }),
  shield: new THREE.MeshLambertMaterial({
    color: 0x7fe7ff,
    emissive: 0x2a8fff,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  }),
  blob: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }),
  // Instanced twins: three.js keys shader programs on "instanced or not" (and per-instance colours), so one
  // material shared by both kinds of mesh re-resolves its program for every object, every frame.
  /** `flat` for InstancedMesh (wheels). */
  flatInst: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  /** `basic` for InstancedMesh with per-instance colours (item pods). */
  basicInst: new THREE.MeshBasicMaterial({ vertexColors: true }),
  /** `basic` for InstancedMesh without per-instance colours (coins). */
  basicInstPlain: new THREE.MeshBasicMaterial({ vertexColors: true }),
};

for (const m of Object.values(Materials)) m.userData.shared = true;
Materials.blob.polygonOffset = true;
Materials.blob.polygonOffsetFactor = -2;
Materials.blob.polygonOffsetUnits = -2;

// ---------------------------------------------------------------------------------------------------------------
// Kart & driver looks per quality tier: Low = plain Lambert (unchanged), Medium = Lambert + rim light,
// High = Phong gloss + rim light. Rim colour follows the track's sky (set per race).
// ---------------------------------------------------------------------------------------------------------------
export const rimColor = { value: new THREE.Color(0xfff2d6) };

function withRim<T extends THREE.MeshLambertMaterial | THREE.MeshPhongMaterial>(m: T, strength: number, key: string): T {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.rimColor = rimColor;
    sh.uniforms.rimStrength = { value: strength };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimColor;\nuniform float rimStrength;')
      .replace(
        '#include <opaque_fragment>',
        'outgoingLight += rimColor * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.6) * rimStrength;\n#include <opaque_fragment>',
      );
  };
  m.customProgramCacheKey = () => key;
  m.userData.shared = true;
  return m;
}

export type KartLook = 'low' | 'medium' | 'high';

let looks: Record<KartLook, { chassis: THREE.Material; driver: THREE.Material }> | null = null;

export function kartMaterials(look: KartLook): { chassis: THREE.Material; driver: THREE.Material } {
  if (!looks) {
    looks = {
      low: { chassis: Materials.flat, driver: Materials.smooth },
      medium: {
        chassis: withRim(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), 0.45, 'rim-l-flat'),
        driver: withRim(new THREE.MeshLambertMaterial({ vertexColors: true }), 0.4, 'rim-l-smooth'),
      },
      high: {
        chassis: withRim(new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 70, specular: 0x4a4a4a }), 0.5, 'rim-p-flat'),
        driver: withRim(new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 28, specular: 0x262626 }), 0.42, 'rim-p-smooth'),
      },
    };
  }
  return looks[look];
}
