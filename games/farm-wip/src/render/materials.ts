/**
 * Shared materials: few materials means few shader programs. Everything is vertex-coloured Lambert
 * with a soft rim light (the warm edge glow of the diorama look), adapted from Calex Cart's `withRim`
 * (games/calex-cart/src/render/materials.ts). The rim's colour and strength are shared uniforms: the
 * lighting sets the colour by time of day, and quality Low turns it off.
 */
import * as THREE from 'three';

export const rim = {
  color: { value: new THREE.Color(0xfff1d0) },
  strength: { value: 0.35 },
};

function withRim<T extends THREE.MeshLambertMaterial>(m: T, key: string): T {
  m.onBeforeCompile = sh => {
    sh.uniforms.rimColor = rim.color;
    sh.uniforms.rimStrength = rim.strength;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimColor;\nuniform float rimStrength;')
      .replace(
        '#include <opaque_fragment>',
        'outgoingLight += rimColor * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.4) * rimStrength;\n#include <opaque_fragment>',
      );
  };
  m.customProgramCacheKey = () => key;
  return m;
}

// Instanced meshes get their own twins: three.js picks shader programs by "instanced or not", so one
// material shared by both kinds would swap programs on every draw.
export const Materials = {
  /** Faceted props, buildings, crops. */
  flat: withRim(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), 'rim-flat'),
  flatInst: withRim(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), 'rim-flat-i'),
  /** Smooth-shaded animals and people. */
  smooth: withRim(new THREE.MeshLambertMaterial({ vertexColors: true }), 'rim-smooth'),
  smoothInst: withRim(new THREE.MeshLambertMaterial({ vertexColors: true }), 'rim-smooth-i'),
  /** The ground (no rim: it would outline every terrace). */
  ground: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  /** Soft round shadows under things when the shadow map is off. */
  blob: new THREE.MeshBasicMaterial({ color: 0x1d2a12, transparent: true, opacity: 0.22, depthWrite: false }),
  /** Unlit vertex colours (highlights, glows). */
  basic: new THREE.MeshBasicMaterial({ vertexColors: true }),
};
Materials.blob.polygonOffset = true;
Materials.blob.polygonOffsetFactor = -2;
Materials.blob.polygonOffsetUnits = -2;
for (const m of Object.values(Materials)) m.userData.shared = true;
